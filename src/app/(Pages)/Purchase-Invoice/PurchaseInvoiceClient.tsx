"use client";

import { useState, useTransition } from "react";
import type { PurchaseInvoice } from "@/db/schema/purchase-invoice";
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
} from "./actions";

interface PurchaseInvoiceClientProps {
  initialInvoices: PurchaseInvoice[];
}

export default function PurchaseInvoiceClient({
  initialInvoices,
}: PurchaseInvoiceClientProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(initialInvoices);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Alert/Message state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showFeedback("error", "Nama invoice harus diisi.");
      return;
    }

    startTransition(async () => {
      const res = await createPurchaseInvoice({ name, description });
      if (res.success && res.data) {
        setInvoices((prev) => [res.data!, ...prev]);
        setName("");
        setDescription("");
        showFeedback("success", `Invoice "${res.data.name}" berhasil dibuat!`);
      } else {
        showFeedback("error", res.error || "Gagal membuat invoice.");
      }
    });
  };

  const startEdit = (item: PurchaseInvoice) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      showFeedback("error", "Nama invoice tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const res = await updatePurchaseInvoice(id, {
        name: editName,
        description: editDescription,
      });

      if (res.success && res.data) {
        setInvoices((prev) =>
          prev.map((item) => (item.id === id ? res.data! : item))
        );
        cancelEdit();
        showFeedback("success", `Invoice "${res.data.name}" berhasil diperbarui!`);
      } else {
        showFeedback("error", res.error || "Gagal memperbarui invoice.");
      }
    });
  };

  const handleDelete = async (id: string, invoiceName: string) => {
    if (!confirm(`Hapus invoice "${invoiceName}"?`)) return;

    startTransition(async () => {
      const res = await deletePurchaseInvoice(id);
      if (res.success) {
        setInvoices((prev) => prev.filter((item) => item.id !== id));
        showFeedback("success", `Invoice "${invoiceName}" berhasil dihapus.`);
      } else {
        showFeedback("error", res.error || "Gagal menghapus invoice.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-neutral-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Purchase Invoice
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Kelola data purchase invoice (Create, Read, Update, Delete)
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-medium transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Create Form */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            Buat Invoice Baru
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Nama Invoice <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: INV-2026-001 / Biji Kopi Arabika"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Deskripsi
                </label>
                <input
                  type="text"
                  placeholder="Deskripsi singkat invoice..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? "Menyimpan..." : "Tambah Invoice"}
              </button>
            </div>
          </form>
        </div>

        {/* Invoices List / Table */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Daftar Invoice ({invoices.length})
            </h2>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              Belum ada purchase invoice. Tambahkan invoice baru melalui formulir di atas.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {invoices.map((item) => (
                <div key={item.id} className="p-6 transition hover:bg-neutral-50/50">
                  {editingId === item.id ? (
                    /* Edit Form */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Nama Invoice
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={isPending}
                            className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Deskripsi
                          </label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            disabled={isPending}
                            className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-md transition cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(item.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition cursor-pointer"
                        >
                          {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 text-base">
                            {item.name}
                          </h3>
                          <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">
                            {item.id.slice(0, 8)}...
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600">
                          {item.description || (
                            <span className="italic text-neutral-400">
                              Tidak ada deskripsi
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-400">
                          Dibuat pada:{" "}
                          {new Date(item.createdAt).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => startEdit(item)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

