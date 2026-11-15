"use server";

import { db } from "@/db";
import {
  posOfflineLogs,
  posShiftLogs,
  type PosOfflineLog,
  type PosShiftLog,
} from "@/db/schema/POS";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";

const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 15;

async function evaluateHeartbeatTimeouts(
  timeoutSeconds: number = DEFAULT_HEARTBEAT_TIMEOUT_SECONDS
) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - timeoutSeconds * 1000);

  const staleSessions = await db
    .select()
    .from(posShiftLogs)
    .where(
      and(
        eq(posShiftLogs.status, "ONLINE"),
        lt(posShiftLogs.lastSeenAt, cutoff)
      )
    );

  for (const session of staleSessions) {
    await db
      .update(posShiftLogs)
      .set({
        status: "OFFLINE",
        offlineAt: now,
      })
      .where(eq(posShiftLogs.sessionId, session.sessionId));

    const existingOpenLog = await db
      .select({ id: posOfflineLogs.id })
      .from(posOfflineLogs)
      .where(
        and(
          eq(posOfflineLogs.sessionId, session.sessionId),
          isNull(posOfflineLogs.reconnectedAt)
        )
      )
      .limit(1);

    if (existingOpenLog.length === 0) {
      await db.insert(posOfflineLogs).values({
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        shiftName: session.shiftName,
        offlineAt: now,
        reason: `Tidak ada sinyal > ${timeoutSeconds} detik (Heartbeat Timeout)`,
      });
    }
  }
}

export async function getPosDashboardData(
  timeoutSeconds: number = DEFAULT_HEARTBEAT_TIMEOUT_SECONDS
): Promise<{
  success: boolean;
  shiftLogs: PosShiftLog[];
  offlineLogs: PosOfflineLog[];
  timeoutSeconds: number;
  serverTimestamp: number;
  error?: string;
}> {
  try {
    await connection();
    await evaluateHeartbeatTimeouts(timeoutSeconds);

    const [shiftLogs, offlineLogs] = await Promise.all([
      db
        .select()
        .from(posShiftLogs)
        .orderBy(desc(posShiftLogs.lastSeenAt), desc(posShiftLogs.openedAt)),
      db
        .select()
        .from(posOfflineLogs)
        .orderBy(desc(posOfflineLogs.offlineAt)),
    ]);

    return {
      success: true,
      shiftLogs,
      offlineLogs,
      timeoutSeconds,
      serverTimestamp: Date.now(),
    };
  } catch (error: unknown) {
    console.error("Failed to fetch POS dashboard data:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data monitoring POS";
    return {
      success: false,
      shiftLogs: [],
      offlineLogs: [],
      timeoutSeconds,
      serverTimestamp: Date.now(),
      error: message,
    };
  }
}

export async function updateDeviceConnectionStatus(
  sessionId: string,
  targetStatus: "ONLINE" | "OFFLINE"
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db
      .select()
      .from(posShiftLogs)
      .where(eq(posShiftLogs.sessionId, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Sesi shift tidak ditemukan" };
    }

    const session = existing[0];
    const now = new Date();

    if (targetStatus === "OFFLINE") {
      await db
        .update(posShiftLogs)
        .set({
          status: "OFFLINE",
          offlineAt: now,
        })
        .where(eq(posShiftLogs.sessionId, sessionId));

      const openOffline = await db
        .select({ id: posOfflineLogs.id })
        .from(posOfflineLogs)
        .where(
          and(
            eq(posOfflineLogs.sessionId, sessionId),
            isNull(posOfflineLogs.reconnectedAt)
          )
        )
        .limit(1);

      if (openOffline.length === 0) {
        await db.insert(posOfflineLogs).values({
          sessionId: session.sessionId,
          deviceId: session.deviceId,
          shiftName: session.shiftName,
          offlineAt: now,
          reason: "Ditandai Offline dari Dashboard",
        });
      }
    } else {
      await db
        .update(posShiftLogs)
        .set({
          status: "ONLINE",
          lastSeenAt: now,
          offlineAt: null,
        })
        .where(eq(posShiftLogs.sessionId, sessionId));

      await db
        .update(posOfflineLogs)
        .set({ reconnectedAt: now })
        .where(
          and(
            eq(posOfflineLogs.sessionId, sessionId),
            isNull(posOfflineLogs.reconnectedAt)
          )
        );
    }

    revalidatePath("/POS");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update device connection status:", error);
    const message =
      error instanceof Error ? error.message : "Gagal mengubah status perangkat";
    return { success: false, error: message };
  }
}
