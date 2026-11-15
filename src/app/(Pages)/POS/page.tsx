import { Suspense } from "react";
import { connection } from "next/server";
import { getPosDashboardData } from "./actions";
import POSClient from "./POSClient";

async function POSContent() {
  await connection();
  const result = await getPosDashboardData();

  return (
    <POSClient
      initialShiftLogs={result.shiftLogs}
      initialOfflineLogs={result.offlineLogs}
      timeoutSeconds={result.timeoutSeconds}
      initialServerTimestamp={result.serverTimestamp}
      initialError={result.success ? undefined : result.error}
    />
  );
}

export default function POSPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 py-10 px-4 max-w-6xl mx-auto space-y-6">
          <div className="h-28 bg-neutral-200 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-44 bg-neutral-200 animate-pulse rounded-2xl" />
            <div className="h-44 bg-neutral-200 animate-pulse rounded-2xl" />
            <div className="h-44 bg-neutral-200 animate-pulse rounded-2xl" />
          </div>
          <div className="h-64 bg-neutral-200 animate-pulse rounded-2xl" />
        </div>
      }
    >
      <POSContent />
    </Suspense>
  );
}
