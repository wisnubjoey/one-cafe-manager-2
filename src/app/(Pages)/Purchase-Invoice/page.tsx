import { Suspense } from "react";
import { getPurchaseInvoices } from "./actions";
import PurchaseInvoiceClient from "./PurchaseInvoiceClient";

async function PurchaseInvoiceContent() {
  const result = await getPurchaseInvoices();
  const invoices = result.success && result.data ? result.data : [];

  return <PurchaseInvoiceClient initialInvoices={invoices} />;
}

export default function PurchaseInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50/50 py-10 px-4 max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-neutral-200 animate-pulse rounded-lg mb-8" />
          <div className="h-40 bg-neutral-200 animate-pulse rounded-2xl" />
          <div className="h-64 bg-neutral-200 animate-pulse rounded-2xl" />
        </div>
      }
    >
      <PurchaseInvoiceContent />
    </Suspense>
  );
}

