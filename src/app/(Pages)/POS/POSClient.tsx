"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { PosOfflineLog, PosShiftLog } from "@/db/schema/POS";
import { getPosDashboardData, updateDeviceConnectionStatus } from "./actions";

interface POSClientProps {
  initialShiftLogs: PosShiftLog[];
  initialOfflineLogs: PosOfflineLog[];
  timeoutSeconds: number;
  initialServerTimestamp: number;
  initialError?: string;
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatDuration(
  start: Date | string,
  end: Date | string | null | undefined,
  currentNowMs: number
): string {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end
    ? end instanceof Date
      ? end
      : new Date(end)
    : new Date(currentNowMs);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
  );

  if (diffSeconds < 60) {
    return `${diffSeconds} dtk`;
  }

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours} jam ${minutes} mnt ${seconds} dtk`;
  }

  return `${minutes} mnt ${seconds} dtk`;
}

function formatRelativeSeconds(
  target: Date | string,
  currentNowMs: number
): { text: string; secondsAgo: number } {
  const date = target instanceof Date ? target : new Date(target);
  if (Number.isNaN(date.getTime())) {
    return { text: "-", secondsAgo: 0 };
  }

  const secondsAgo = Math.max(
    0,
    Math.floor((currentNowMs - date.getTime()) / 1000)
  );
  if (secondsAgo < 60) {
    return { text: `${secondsAgo} dtk lalu`, secondsAgo };
  }

  const minutes = Math.floor(secondsAgo / 60);
  const remSeconds = secondsAgo % 60;
  if (minutes < 60) {
    return { text: `${minutes} mnt ${remSeconds} dtk lalu`, secondsAgo };
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return { text: `${hours} jam ${remMinutes} mnt lalu`, secondsAgo };
}

export default function POSClient({
  initialShiftLogs,
  initialOfflineLogs,
  timeoutSeconds: initialTimeout,
  initialServerTimestamp,
  initialError,
}: POSClientProps) {
  const [shiftLogs, setShiftLogs] = useState<PosShiftLog[]>(initialShiftLogs);
  const [offlineLogs, setOfflineLogs] =
    useState<PosOfflineLog[]>(initialOfflineLogs);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(initialTimeout);
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState<number>(2);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ?? null
  );
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [browserOnline, setBrowserOnline] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() =>
    initialServerTimestamp ? new Date(initialServerTimestamp) : null
  );
  const [nowMs, setNowMs] = useState<number>(
    () => initialServerTimestamp || 0
  );
  const [isPending, startTransition] = useTransition();

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pos/status?timeout=${timeoutSeconds}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setShiftLogs(json.shiftLogs);
          setOfflineLogs(json.offlineLogs);
          setErrorMessage(null);
          setLastRefreshedAt(new Date(json.serverTimestamp || Date.now()));
          setNowMs(json.serverTimestamp || Date.now());
          return;
        }
      }
    } catch {
      // Fallback ke server action jika fetch API bermasalah
    }

    startTransition(async () => {
      const result = await getPosDashboardData(timeoutSeconds);
      if (result.success) {
        setShiftLogs(result.shiftLogs);
        setOfflineLogs(result.offlineLogs);
        setErrorMessage(null);
        setLastRefreshedAt(new Date(result.serverTimestamp));
        setNowMs(result.serverTimestamp);
      } else {
        setErrorMessage(result.error ?? "Gagal memuat data monitoring POS");
      }
    });
  }, [timeoutSeconds]);

  const handleToggleDeviceStatus = (
    sessionId: string,
    targetStatus: "ONLINE" | "OFFLINE"
  ) => {
    startTransition(async () => {
      const res = await updateDeviceConnectionStatus(sessionId, targetStatus);
      if (!res.success) {
        setErrorMessage(res.error ?? "Gagal mengubah status perangkat");
        return;
      }
      await fetchDashboardData();
    });
  };

  useEffect(() => {
    setIsMounted(true);
    setNowMs(Date.now());
    setBrowserOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setBrowserOnline(true);
      fetchDashboardData();
    };
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchDashboardData]);

  // Live second ticker
  useEffect(() => {
    if (!isMounted) return;

    const clockId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(clockId);
  }, [isMounted]);

  // Real-time polling
  useEffect(() => {
    if (!autoPoll || !isMounted) return;

    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, pollIntervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [autoPoll, isMounted, pollIntervalSeconds, fetchDashboardData]);

  const liveDevices = useMemo(() => {
    const map = new Map<string, PosShiftLog>();
    for (const log of shiftLogs) {
      if (!map.has(log.deviceId)) {
        map.set(log.deviceId, log);
      }
    }
    return Array.from(map.values());
  }, [shiftLogs]);

  const isSessionOnline = useCallback(
    (log: PosShiftLog) => {
      if (!browserOnline) return false;
      if (log.status === "OFFLINE") return false;
      const effectiveNow = isMounted ? nowMs : initialServerTimestamp;
      if (!effectiveNow) return log.status === "ONLINE";

      const lastSeen =
        log.lastSeenAt instanceof Date
          ? log.lastSeenAt.getTime()
          : new Date(log.lastSeenAt).getTime();
      return effectiveNow - lastSeen <= timeoutSeconds * 1000;
    },
    [browserOnline, isMounted, nowMs, initialServerTimestamp, timeoutSeconds]
  );

  const onlineCount = useMemo(
    () => liveDevices.filter((d) => isSessionOnline(d)).length,
    [liveDevices, isSessionOnline]
  );
  const offlineCount = liveDevices.length - onlineCount;
  const effectiveNowMs = isMounted ? nowMs : initialServerTimestamp;

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {!browserOnline && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 flex items-center justify-between gap-4 text-rose-800 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
              <div>
                <p className="font-semibold text-sm">
                  Koneksi Browser Anda Sedang Offline
                </p>
                <p className="text-xs text-rose-600">
                  Dashboard tidak dapat menghubungi server. Status perangkat ditampilkan sebagai Offline hingga koneksi pulih.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-200 text-rose-900">
              Browser Offline
            </span>
          </div>
        )}

        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                Monitoring Real-Time POS & Log Shift
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                <span
                  className={`h-2 w-2 rounded-full ${
                    autoPoll && browserOnline
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-neutral-400"
                  }`}
                />
                Live Monitor ({pollIntervalSeconds}s)
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Status koneksi diperbarui instan per detik. Jika tidak ada sinyal &gt; {timeoutSeconds} detik, status otomatis beralih ke Offline.
            </p>
            {lastRefreshedAt && (
              <p
                className="text-xs text-neutral-400 mt-1.5"
                suppressHydrationWarning
              >
                Terakhir disinkronkan: {formatDateTime(lastRefreshedAt)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-800">
                {onlineCount} Online
              </span>
            </div>

            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-xs font-semibold text-rose-800">
                {offlineCount} Offline
              </span>
            </div>

            {/* Timeout Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs">
              <span className="text-neutral-500 font-medium">Timeout:</span>
              <select
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                className="bg-transparent font-semibold text-neutral-800 outline-none cursor-pointer"
              >
                <option value={10}>10 detik</option>
                <option value={15}>15 detik</option>
                <option value={30}>30 detik</option>
                <option value={60}>60 detik</option>
              </select>
            </div>

            {/* Polling Interval */}
            <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs">
              <span className="text-neutral-500 font-medium">Poll:</span>
              <select
                value={pollIntervalSeconds}
                onChange={(e) => setPollIntervalSeconds(Number(e.target.value))}
                className="bg-transparent font-semibold text-neutral-800 outline-none cursor-pointer"
              >
                <option value={1}>1 dtk</option>
                <option value={2}>2 dtk</option>
                <option value={5}>5 dtk</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 bg-neutral-100 px-3 py-2 rounded-xl cursor-pointer select-none border border-neutral-200">
              <input
                type="checkbox"
                checked={autoPoll}
                onChange={(e) => setAutoPoll(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>Auto</span>
            </label>

            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-60 transition cursor-pointer"
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isPending ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                }`}
              />
              {isPending ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Section 1: Real-Time POS Device Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Status Perangkat POS Real-Time
              </h2>
              <p className="text-xs text-neutral-500">
                Status langsung tiap perangkat diperbarui setiap detik. Kartu berubah warna seketika jika sinyal terputus.
              </p>
            </div>
          </div>

          {liveDevices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-neutral-400 text-sm">
              Belum ada perangkat POS yang terdaftar. Kirim data shift dari tablet Android untuk memulai pemantauan real-time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveDevices.map((device) => {
                const online = isSessionOnline(device);
                const lastSeenInfo = formatRelativeSeconds(
                  device.lastSeenAt,
                  effectiveNowMs
                );
                const offlineStart = device.offlineAt ?? device.lastSeenAt;
                const remainingTimeoutSeconds = Math.max(
                  0,
                  timeoutSeconds - lastSeenInfo.secondsAgo
                );
                const progressPercent = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      (remainingTimeoutSeconds / timeoutSeconds) * 100
                    )
                  )
                );

                return (
                  <div
                    key={device.deviceId}
                    className={`rounded-2xl border p-5 transition-all bg-white shadow-xs flex flex-col justify-between gap-4 ${
                      online
                        ? "border-emerald-300 ring-2 ring-emerald-500/10 shadow-emerald-500/5"
                        : "border-rose-300 bg-rose-50/20 ring-2 ring-rose-500/10 shadow-rose-500/5"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                            Device ID
                          </span>
                          <h3 className="text-base font-bold text-neutral-900 font-mono">
                            {device.deviceId}
                          </h3>
                        </div>

                        {online ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                            suppressHydrationWarning
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            ONLINE
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300"
                            suppressHydrationWarning
                          >
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            OFFLINE
                          </span>
                        )}
                      </div>

                      <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Shift Aktif:</span>
                          <span className="font-semibold text-neutral-900">
                            {device.shiftName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Waktu Buka:</span>
                          <span
                            className="text-neutral-700"
                            suppressHydrationWarning
                          >
                            {formatDateTime(device.openedAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">
                            Sinyal Terakhir:
                          </span>
                          <span
                            className={`font-semibold ${
                              online ? "text-emerald-700" : "text-rose-700"
                            }`}
                            suppressHydrationWarning
                          >
                            {lastSeenInfo.text}
                          </span>
                        </div>

                        {online ? (
                          <div className="space-y-1 pt-1 border-t border-neutral-200/60">
                            <div className="flex items-center justify-between text-[11px] text-neutral-500">
                              <span>Heartbeat Timeout:</span>
                              <span
                                className="font-mono font-medium"
                                suppressHydrationWarning
                              >
                                {remainingTimeoutSeconds}s tersisa
                              </span>
                            </div>
                            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${
                                  remainingTimeoutSeconds > 5
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1.5 mt-1 border-t border-rose-200 flex items-center justify-between text-rose-700 font-medium">
                            <span>Durasi Terputus:</span>
                            <span
                              className="font-mono font-semibold"
                              suppressHydrationWarning
                            >
                              {formatDuration(
                                offlineStart,
                                null,
                                effectiveNowMs
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                      <span className="text-neutral-400 font-mono truncate max-w-[160px] text-[11px]">
                        {device.sessionId}
                      </span>

                      {online ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDeviceStatus(
                              device.sessionId,
                              "OFFLINE"
                            )
                          }
                          disabled={isPending}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium transition cursor-pointer disabled:opacity-50"
                        >
                          Set Offline
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDeviceStatus(device.sessionId, "ONLINE")
                          }
                          disabled={isPending}
                          className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition cursor-pointer disabled:opacity-50"
                        >
                          Set Online (Ping)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Riwayat Offline / Disconnect */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Riwayat Offline / Terputus (Offline History)
            </h2>
            <p className="text-xs text-neutral-500">
              Catatan waktu setiap kali perangkat POS mengalami offline beserta durasi hingga terhubung kembali.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="py-3.5 px-6">Device ID & Shift</th>
                    <th className="py-3.5 px-6">Waktu Mulai Offline</th>
                    <th className="py-3.5 px-6">Waktu Kembali Online</th>
                    <th className="py-3.5 px-6">Durasi Offline</th>
                    <th className="py-3.5 px-6">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm text-neutral-700">
                  {offlineLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 px-6 text-center text-neutral-400"
                      >
                        Belum ada riwayat perangkat offline.
                      </td>
                    </tr>
                  ) : (
                    offlineLogs.map((item) => {
                      const stillOffline = !item.reconnectedAt;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-neutral-50/70 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <div className="font-mono font-semibold text-neutral-900">
                              {item.deviceId}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {item.shiftName} •{" "}
                              <span className="font-mono text-neutral-400">
                                {item.sessionId}
                              </span>
                            </div>
                          </td>
                          <td
                            className="py-4 px-6 whitespace-nowrap text-rose-700 font-medium"
                            suppressHydrationWarning
                          >
                            {formatDateTime(item.offlineAt)}
                          </td>
                          <td
                            className="py-4 px-6 whitespace-nowrap"
                            suppressHydrationWarning
                          >
                            {stillOffline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Masih Offline
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                {formatDateTime(item.reconnectedAt)}
                              </span>
                            )}
                          </td>
                          <td
                            className="py-4 px-6 whitespace-nowrap font-mono text-xs font-semibold text-neutral-800"
                            suppressHydrationWarning
                          >
                            {formatDuration(
                              item.offlineAt,
                              item.reconnectedAt,
                              effectiveNowMs
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-neutral-600">
                            {item.reason}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 3: Shift Sessions */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Riwayat Sesi Shift POS
            </h2>
            <p className="text-xs text-neutral-500">
              Daftar seluruh sesi pembukaan shift yang dikirim dari perangkat POS Android.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="py-3.5 px-6">Nama Shift</th>
                    <th className="py-3.5 px-6">Waktu Buka</th>
                    <th className="py-3.5 px-6">Device ID</th>
                    <th className="py-3.5 px-6">Sinyal Terakhir</th>
                    <th className="py-3.5 px-6">Status Real-Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm text-neutral-700">
                  {shiftLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 px-6 text-center text-neutral-400"
                      >
                        Belum ada data shift POS yang masuk.
                      </td>
                    </tr>
                  ) : (
                    shiftLogs.map((log) => {
                      const online = isSessionOnline(log);
                      return (
                        <tr
                          key={log.sessionId}
                          className="hover:bg-neutral-50/70 transition-colors"
                        >
                          <td className="py-4 px-6 font-medium text-neutral-900">
                            <div>{log.shiftName}</div>
                            <div className="text-xs text-neutral-400 font-mono mt-0.5">
                              Session: {log.sessionId}
                            </div>
                          </td>
                          <td
                            className="py-4 px-6 whitespace-nowrap"
                            suppressHydrationWarning
                          >
                            {formatDateTime(log.openedAt)}
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-neutral-700">
                            {log.deviceId}
                          </td>
                          <td
                            className="py-4 px-6 whitespace-nowrap text-neutral-500 text-xs"
                            suppressHydrationWarning
                          >
                            <div>{formatDateTime(log.lastSeenAt)}</div>
                            <div className="text-neutral-400">
                              {
                                formatRelativeSeconds(
                                  log.lastSeenAt,
                                  effectiveNowMs
                                ).text
                              }
                            </div>
                          </td>
                          <td
                            className="py-4 px-6 whitespace-nowrap"
                            suppressHydrationWarning
                          >
                            {online ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online / Terhubung
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Offline
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
