import { Suspense } from "react";
import { getProducts } from "@/app/Create/actions";
import CatalogueClient from "./CatalogueClient";

export const instant = false;

function CatalogueSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: "80px 24px",
        maxWidth: "1080px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          height: "32px",
          width: "160px",
          background: "#f5f5f7",
          borderRadius: "8px",
          marginBottom: "32px",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "24px",
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1/1",
              background: "#f5f5f7",
              borderRadius: "14px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

async function CatalogueContent() {
  const result = await getProducts();
  const products = result.success && result.data ? result.data : [];

  return <CatalogueClient initialProducts={products} />;
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<CatalogueSkeleton />}>
      <CatalogueContent />
    </Suspense>
  );
}

