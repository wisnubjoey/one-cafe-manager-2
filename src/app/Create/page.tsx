/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "@uploadthing/react/styles.css";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  type IngredientInput,
  type ProductWithIngredients,
} from "./actions";

export default function CatalogueCrudPage() {
  const [products, setProducts] = useState<ProductWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Form State
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { materialName: "", quantity: "" },
  ]);

  // Submission Feedback State
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    data?: Record<string, unknown> | null;
    timestamp?: string;
  } | null>(null);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editIngredients, setEditIngredients] = useState<IngredientInput[]>([]);

  // Load existing products
  const fetchProducts = async () => {
    setLoading(true);
    setFetchError(null);
    const res = await getProducts();
    if (res.success && res.data) {
      setProducts(res.data);
    } else {
      setFetchError(res.error || "Failed to load products");
    }
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    getProducts().then((res) => {
      if (!ignore) {
        if (res.success && res.data) {
          setProducts(res.data);
        } else if (res.error) {
          setFetchError(res.error);
        }
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  // Quick helper to add/remove ingredient rows in create form
  const handleAddIngredient = () => {
    setIngredients([...ingredients, { materialName: "", quantity: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: keyof IngredientInput,
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  // Sample quick fill for fast testing
  const fillSampleData = (type: "coffee" | "matcha" | "juice") => {
    if (type === "coffee") {
      setName("Vanilla Latte");
      setImageUrl(
        "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&q=80"
      );
      setIngredients([
        { materialName: "Espresso Beans", quantity: "18g" },
        { materialName: "Fresh Milk", quantity: "200ml" },
        { materialName: "Vanilla Syrup", quantity: "15ml" },
      ]);
    } else if (type === "matcha") {
      setName("Iced Matcha Latte");
      setImageUrl(
        "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80"
      );
      setIngredients([
        { materialName: "Ceremonial Matcha", quantity: "5g" },
        { materialName: "Oat Milk", quantity: "220ml" },
        { materialName: "Ice Cubes", quantity: "80g" },
      ]);
    } else {
      setName("Fresh Orange Squeeze");
      setImageUrl(
        "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80"
      );
      setIngredients([
        { materialName: "Navel Oranges", quantity: "3 pcs" },
        { materialName: "Cane Sugar", quantity: "10ml" },
      ]);
    }
  };

  // Handle Create Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !imageUrl.trim()) {
      setSubmitResult({
        success: false,
        message: "Please fill in product name and upload an image.",
      });
      return;
    }

    startTransition(async () => {
      const res = await createProduct({
        name,
        imageUrl,
        ingredients,
      });

      if (res.success) {
        setSubmitResult({
          success: true,
          message: "Product created successfully!",
          data: {
            product: res.product,
            ingredients: res.ingredients,
          },
          timestamp: new Date().toLocaleTimeString(),
        });
        // Reset form
        setName("");
        setImageUrl("");
        setUploadError(null);
        setIngredients([{ materialName: "", quantity: "" }]);
        // Refresh product list
        await fetchProducts();
      } else {
        setSubmitResult({
          success: false,
          message: res.error || "Failed to create product",
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });
  };

  // Handle Edit Start
  const startEditing = (p: ProductWithIngredients) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditImageUrl(p.imageUrl);
    setEditIngredients(
      p.ingredients && p.ingredients.length > 0
        ? p.ingredients.map((i) => ({
            materialName: i.materialName,
            quantity: i.quantity,
          }))
        : [{ materialName: "", quantity: "" }]
    );
  };

  const handleEditIngredientChange = (
    index: number,
    field: keyof IngredientInput,
    value: string
  ) => {
    const updated = [...editIngredients];
    updated[index][field] = value;
    setEditIngredients(updated);
  };

  const handleAddEditIngredient = () => {
    setEditIngredients([...editIngredients, { materialName: "", quantity: "" }]);
  };

  const handleRemoveEditIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };

  // Handle Update Submit
  const handleUpdateSubmit = (id: string) => {
    if (!editName.trim() || !editImageUrl.trim()) return;

    startTransition(async () => {
      const res = await updateProduct(id, {
        name: editName,
        imageUrl: editImageUrl,
        ingredients: editIngredients,
      });

      if (res.success) {
        setSubmitResult({
          success: true,
          message: `Product "${editName}" updated successfully!`,
          data: {
            product: res.product,
            ingredients: res.ingredients,
          },
          timestamp: new Date().toLocaleTimeString(),
        });
        setEditingId(null);
        await fetchProducts();
      } else {
        setSubmitResult({
          success: false,
          message: res.error || "Failed to update product",
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });
  };

  // Handle Delete
  const handleDelete = (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}"?`)) return;

    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res.success) {
        setSubmitResult({
          success: true,
          message: `Product "${prodName}" deleted successfully!`,
          timestamp: new Date().toLocaleTimeString(),
        });
        await fetchProducts();
      } else {
        setSubmitResult({
          success: false,
          message: res.error || "Failed to delete product",
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                CRUD Testing
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Product Catalogue CRUD
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Schema: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs text-purple-700">catalogue_product</code> &amp;{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs text-purple-700">catalogue_ingredient</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              className="text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              🔄 Refresh List
            </button>
            <Link
              href="/"
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Submission Feedback Result Box */}
        {submitResult && (
          <div
            className={`p-4 rounded-xl border ${
              submitResult.success
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : "bg-red-50 border-red-300 text-red-950"
            } shadow-xs transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {submitResult.success ? "✅" : "❌"}
                  </span>
                  <p className="font-semibold text-sm">
                    {submitResult.message}
                  </p>
                  {submitResult.timestamp && (
                    <span className="text-xs opacity-75">
                      at {submitResult.timestamp}
                    </span>
                  )}
                </div>

                {submitResult.data ? (
                  <div className="mt-3 bg-white/80 backdrop-blur rounded-lg p-3 border border-emerald-200 text-xs font-mono space-y-2">
                    <p className="font-sans font-bold text-gray-700">
                      Returned Result Payload:
                    </p>
                    <pre className="overflow-x-auto p-2 bg-gray-900 text-emerald-300 rounded text-xs leading-relaxed">
                      {JSON.stringify(submitResult.data, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => setSubmitResult(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Grid: Left column Create Form, Right column List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create Form Section */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span>➕</span> Create New Product
                </h2>
                {/* Fast Fill Pre-sets */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">Quick fill:</span>
                  <button
                    type="button"
                    onClick={() => fillSampleData("coffee")}
                    className="px-2 py-0.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded border border-amber-200 text-xs"
                  >
                    ☕ Coffee
                  </button>
                  <button
                    type="button"
                    onClick={() => fillSampleData("matcha")}
                    className="px-2 py-0.5 bg-green-50 text-green-800 hover:bg-green-100 rounded border border-green-200 text-xs"
                  >
                    🍵 Matcha
                  </button>
                  <button
                    type="button"
                    onClick={() => fillSampleData("juice")}
                    className="px-2 py-0.5 bg-orange-50 text-orange-800 hover:bg-orange-100 rounded border border-orange-200 text-xs"
                  >
                    🍊 Juice
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Caramel Macchiato"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Product Image *
                  </label>
                  {imageUrl ? (
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-14 h-14 object-cover rounded-lg border border-emerald-300 shadow-xs shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/100x100?text=Invalid+Image";
                          }}
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                            <span>✅</span> Image Ready
                          </p>
                          <p
                            className="text-[11px] text-gray-600 truncate max-w-[200px] sm:max-w-xs"
                            title={imageUrl}
                          >
                            {imageUrl}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setUploadError(null);
                        }}
                        className="px-2.5 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition cursor-pointer shrink-0 font-medium"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <UploadDropzone
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res[0]) {
                            setImageUrl(res[0].ufsUrl || res[0].url);
                            setUploadError(null);
                          }
                        }}
                        onUploadError={(error: Error) => {
                          setUploadError(error.message);
                        }}
                        className="border-dashed border-2 border-gray-300 rounded-xl p-4 bg-gray-50/60 hover:bg-gray-100/60 transition cursor-pointer ut-label:text-blue-600 ut-button:bg-blue-600 ut-button:text-xs"
                      />
                      {uploadError && (
                        <p className="text-xs text-red-600">⚠️ {uploadError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Ingredients section */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase">
                      Ingredients (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Material (e.g. Espresso)"
                          value={ing.materialName}
                          onChange={(e) =>
                            handleIngredientChange(
                              idx,
                              "materialName",
                              e.target.value
                            )
                          }
                          className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Qty (e.g. 30ml)"
                          value={ing.quantity}
                          onChange={(e) =>
                            handleIngredientChange(
                              idx,
                              "quantity",
                              e.target.value
                            )
                          }
                          className="w-28 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 text-xs rounded"
                            title="Remove"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span> Creating...
                    </>
                  ) : (
                    "Create Product"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Read / Update / Delete Section (Product List) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-800">
                    Catalogue Products
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                    {products.length} {products.length === 1 ? "item" : "items"}
                  </span>
                </div>
                {loading && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                    <span className="animate-spin text-xs">⏳</span> Loading...
                  </span>
                )}
              </div>

              {fetchError && (
                <div className="p-3 my-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
                  <span>⚠️ Error loading products: {fetchError}</span>
                  <button
                    onClick={fetchProducts}
                    className="underline font-semibold ml-2 hover:text-red-900 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loading ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <span className="text-2xl animate-spin inline-block">⏳</span>
                  <p className="text-xs">Loading catalogue products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <p className="text-3xl">📦</p>
                  <p className="text-sm font-medium">No products found in catalogue.</p>
                  <p className="text-xs text-gray-400">
                    Use the form on the left (or sample buttons) to create your first product!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 mt-2">
                  {products.map((p) => {
                    const isEditing = editingId === p.id;

                    if (isEditing) {
                      return (
                        <div
                          key={p.id}
                          className="py-4 bg-blue-50/60 -mx-5 px-5 rounded-lg border border-blue-200 my-2 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 uppercase">
                              Editing Product
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              ID: {p.id.slice(0, 8)}...
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-600 block mb-0.5 font-medium">
                                Name
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-0.5 font-medium">
                                Product Image
                              </label>
                              <div className="flex items-center gap-2 bg-white p-1 rounded border border-gray-300">
                                {editImageUrl && (
                                  <img
                                    src={editImageUrl}
                                    alt="Preview"
                                    className="w-8 h-8 object-cover rounded border border-gray-200 shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://placehold.co/100x100?text=No+Img";
                                    }}
                                  />
                                )}
                                <div className="flex-1 overflow-hidden">
                                  <p
                                    className="text-[10px] text-gray-500 truncate"
                                    title={editImageUrl}
                                  >
                                    {editImageUrl || "No image uploaded"}
                                  </p>
                                </div>
                                <div className="shrink-0">
                                  <UploadButton
                                    endpoint="imageUploader"
                                    onClientUploadComplete={(res) => {
                                      if (res && res[0]) {
                                        setEditImageUrl(res[0].ufsUrl || res[0].url);
                                      }
                                    }}
                                    onUploadError={(error: Error) => {
                                      alert(`Upload error: ${error.message}`);
                                    }}
                                    className="ut-button:text-[11px] ut-button:h-7 ut-button:px-2.5 ut-button:bg-blue-600"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Edit Ingredients */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-semibold text-gray-700">
                                Ingredients
                              </label>
                              <button
                                type="button"
                                onClick={handleAddEditIngredient}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                + Add
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {editIngredients.map((ing, iIdx) => (
                                <div key={iIdx} className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Material"
                                    value={ing.materialName}
                                    onChange={(e) =>
                                      handleEditIngredientChange(
                                        iIdx,
                                        "materialName",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Qty"
                                    value={ing.quantity}
                                    onChange={(e) =>
                                      handleEditIngredientChange(
                                        iIdx,
                                        "quantity",
                                        e.target.value
                                      )
                                    }
                                    className="w-24 text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditIngredient(iIdx)}
                                    className="text-xs text-red-500 px-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Save & Cancel */}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleUpdateSubmit(p.id)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isPending ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={p.id}
                        className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/70 p-2 rounded-xl transition"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-xs shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/100x100?text=No+Image";
                            }}
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-sm">
                                {p.name}
                              </h3>
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                                ID: {p.id.slice(0, 8)}...
                              </span>
                            </div>

                            {/* Ingredients pills */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.ingredients && p.ingredients.length > 0 ? (
                                p.ingredients.map((ing) => (
                                  <span
                                    key={ing.id}
                                    className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-900 border border-amber-200/60 px-2 py-0.5 rounded-full"
                                  >
                                    <span className="font-medium">
                                      {ing.materialName}:
                                    </span>
                                    <span className="text-amber-700">
                                      {ing.quantity}
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">
                                  No ingredients
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-gray-400">
                              Created: {new Date(p.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons: Edit, Delete */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditing(p)}
                            className="px-2.5 py-1 text-xs border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(p.id, p.name)}
                            className="px-2.5 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
