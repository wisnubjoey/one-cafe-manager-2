/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { ProductWithIngredients } from "@/app/Create/actions";

interface CatalogueClientProps {
  initialProducts: ProductWithIngredients[];
}

const catalogStyles = `
  :root {
    --bg: #ffffff;
    --surface: #ffffff;
    --text: #1d1d1f;
    --muted: #86868b;
    --border: #f2f2f4;
    --badge-bg: #f5f5f7;
    --overlay: rgba(0, 0, 0, 0.4);
    --radius: 14px;
    --radius-sm: 8px;
  }

  .catalog-root {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    letter-spacing: -0.01em;
    min-height: 100vh;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  /* ---------- Search Bar ---------- */
  .catalog-root .search-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 18px 24px;
  }

  .catalog-root .search-container {
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .catalog-root .search-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--badge-bg);
    border-radius: 12px;
    padding: 10px 14px;
    transition: box-shadow .2s ease;
  }

  .catalog-root .create-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--text);
    color: var(--surface);
    font-size: 14px;
    font-weight: 500;
    padding: 10px 16px;
    border-radius: 12px;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity .2s ease, transform .2s ease;
    cursor: pointer;
  }

  .catalog-root .create-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .catalog-root .create-btn:active {
    transform: translateY(0);
  }

  .catalog-root .search-wrap:focus-within {
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  }

  .catalog-root .search-icon {
    width: 18px;
    height: 18px;
    color: var(--muted);
    flex-shrink: 0;
  }

  .catalog-root #search {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 15px;
    color: var(--text);
    font-family: inherit;
  }

  .catalog-root #search::placeholder {
    color: var(--muted);
  }

  /* ---------- Header ---------- */
  .catalog-root .header {
    max-width: 1080px;
    margin: 0 auto;
    padding: 40px 24px 8px;
  }

  .catalog-root .header h1 {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .catalog-root .header p {
    margin-top: 4px;
    color: var(--muted);
    font-size: 14px;
  }

  /* ---------- Grid ---------- */
  .catalog-root .grid {
    max-width: 1080px;
    margin: 0 auto;
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 24px;
  }

  /* ---------- Card ---------- */
  .catalog-root .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: transform .25s ease, box-shadow .25s ease;
    display: flex;
    flex-direction: column;
  }

  .catalog-root .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  }

  .catalog-root .card-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    background: var(--badge-bg);
    display: block;
  }

  .catalog-root .card-body {
    padding: 14px 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex: 1;
  }

  .catalog-root .card-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .catalog-root .variant-badge {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    background: var(--badge-bg);
    padding: 3px 8px;
    border-radius: 999px;
    white-space: nowrap;
    shrink: 0;
  }

  /* ---------- Modal ---------- */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 24px;
    opacity: 0;
    pointer-events: none;
    transition: opacity .25s ease;
  }

  .modal-overlay.active {
    opacity: 1;
    pointer-events: auto;
  }

  .modal {
    background: var(--surface);
    border-radius: 20px;
    max-width: 460px;
    width: 100%;
    overflow: hidden;
    transform: scale(.96);
    transition: transform .25s ease;
    position: relative;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }

  .modal-overlay.active .modal {
    transform: scale(1);
  }

  .modal-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    background: var(--badge-bg);
    display: block;
  }

  .modal-body {
    padding: 24px 24px 28px;
    text-align: left;
  }

  .modal-name {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .modal-meta {
    font-size: 12px;
    color: var(--muted);
    margin-top: 4px;
    margin-bottom: 16px;
  }

  .modal-section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin-bottom: 8px;
    display: block;
  }

  .modal-ingredients-list {
    background: var(--badge-bg);
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow-y: auto;
  }

  .modal-ingredient-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }

  .modal-ingredient-name {
    color: var(--text);
    font-weight: 500;
  }

  .modal-ingredient-qty {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .modal-empty-ingredients {
    font-size: 13px;
    color: var(--muted);
    font-style: italic;
    padding: 6px 0;
  }

  .modal-footer {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
  }

  .modal-edit-link {
    font-size: 13px;
    color: var(--text);
    text-decoration: none;
    font-weight: 500;
    padding: 8px 14px;
    border-radius: 8px;
    background: var(--badge-bg);
    transition: background .2s ease;
  }

  .modal-edit-link:hover {
    background: #e8e8ed;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.85);
    color: var(--text);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: background .2s ease;
  }

  .modal-close:hover {
    background: #fff;
  }

  .empty-container {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--muted);
    padding: 60px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .empty-text {
    font-size: 15px;
    color: var(--muted);
  }

  .empty-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--text);
    color: var(--surface);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 10px;
    text-decoration: none;
    transition: opacity .2s ease;
  }

  .empty-action-btn:hover {
    opacity: 0.9;
  }

  @media (max-width: 480px) {
    .catalog-root .grid {
      gap: 16px;
      padding: 16px;
      grid-template-columns: repeat(2, 1fr);
    }

    .catalog-root .header {
      padding: 24px 16px 4px;
    }

    .catalog-root .header h1 {
      font-size: 22px;
    }

    .catalog-root .card-body {
      padding: 10px 12px 14px;
    }

    .catalog-root .card-name {
      font-size: 14px;
    }
  }
`;

function getVariantBadge(product: ProductWithIngredients): string {
  if (!product.ingredients || product.ingredients.length === 0) {
    return "Menu Item";
  }
  if (product.ingredients.length === 1) {
    return product.ingredients[0].quantity || product.ingredients[0].materialName;
  }
  return `${product.ingredients.length} bahan`;
}

export default function CatalogueClient({
  initialProducts,
}: CatalogueClientProps) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] =
    useState<ProductWithIngredients | null>(null);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialProducts;

    return initialProducts.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchIngredient = item.ingredients?.some(
        (ing) =>
          ing.materialName.toLowerCase().includes(q) ||
          ing.quantity.toLowerCase().includes(q)
      );
      return matchName || matchIngredient;
    });
  }, [query, initialProducts]);

  // Handle escape key and body overflow lock for modal
  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = "hidden";
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedItem(null);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedItem]);

  return (
    <div className="catalog-root">
      <style dangerouslySetInnerHTML={{ __html: catalogStyles }} />

      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-container">
          <div className="search-wrap">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              id="search"
              type="text"
              placeholder="Search by product name or ingredient..."
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Link href="/Create" className="create-btn">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create</span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <h1>Catalog</h1>
        <p id="count">
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Grid */}
      <div className="grid" id="grid">
        {filteredItems.length === 0 ? (
          <div className="empty-container">
            {initialProducts.length === 0 ? (
              <>
                <p className="empty-text">Katalog produk saat ini masih kosong.</p>
                <Link href="/Create" className="empty-action-btn">
                  + Buat Produk Pertama
                </Link>
              </>
            ) : (
              <p className="empty-text">
                Tidak ada produk yang cocok dengan pencarian &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="card"
              onClick={() => setSelectedItem(item)}
            >
              <img
                className="card-img"
                loading="lazy"
                src={item.imageUrl}
                alt={item.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/400x400?text=No+Image";
                }}
              />
              <div className="card-body">
                <span className="card-name" title={item.name}>
                  {item.name}
                </span>
                <span className="variant-badge">{getVariantBadge(item)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <div
        className={`modal-overlay ${selectedItem ? "active" : ""}`}
        id="overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedItem(null);
          }
        }}
      >
        <div className="modal">
          {selectedItem && (
            <>
              <img
                className="modal-img"
                id="modalImg"
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/400x400?text=No+Image";
                }}
              />
              <div className="modal-body">
                <div className="modal-name" id="modalName">
                  {selectedItem.name}
                </div>
                <div className="modal-meta">
                  Ditambahkan:{" "}
                  {new Date(selectedItem.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>

                <span className="modal-section-title">Bahan / Komposisi</span>
                {selectedItem.ingredients &&
                selectedItem.ingredients.length > 0 ? (
                  <div className="modal-ingredients-list">
                    {selectedItem.ingredients.map((ing) => (
                      <div key={ing.id} className="modal-ingredient-row">
                        <span className="modal-ingredient-name">
                          {ing.materialName}
                        </span>
                        <span className="modal-ingredient-qty">
                          {ing.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="modal-empty-ingredients">
                    Tidak ada rincian bahan untuk produk ini.
                  </div>
                )}

                <div className="modal-footer">
                  <Link href="/Create" className="modal-edit-link">
                    Kelola di Halaman Create &rarr;
                  </Link>
                </div>
              </div>
            </>
          )}
          <button
            className="modal-close"
            id="closeBtn"
            aria-label="Close"
            onClick={() => setSelectedItem(null)}
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}

