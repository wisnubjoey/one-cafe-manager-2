import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posOfflineLogs, posShiftLogs } from "@/db/schema/POS";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function parseOpenedAt(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const trimmed = value.trim();
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && /^\d+$/.test(trimmed)) {
      const ms = numeric < 1e12 ? numeric * 1000 : numeric;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const expectedApiKey = process.env.POS_API_KEY || "pos-secret-123";

    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Invalid or missing x-api-key",
        },
        { status: 401 }
      );
    }

    let body: {
      sessionId?: unknown;
      shiftName?: unknown;
      openedAt?: unknown;
      deviceId?: unknown;
      status?: unknown;
      reason?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const shiftName =
      typeof body.shiftName === "string" ? body.shiftName.trim() : "";
    const deviceId =
      typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    const openedAtDate = parseOpenedAt(body.openedAt);

    if (!sessionId || !deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Field sessionId dan deviceId wajib diisi",
        },
        { status: 400 }
      );
    }

    let resolvedShiftName = shiftName;
    let resolvedOpenedAt = openedAtDate;

    if (!resolvedShiftName || !resolvedOpenedAt) {
      const existing = await db
        .select()
        .from(posShiftLogs)
        .where(eq(posShiftLogs.sessionId, sessionId))
        .limit(1);

      if (existing.length > 0) {
        resolvedShiftName = resolvedShiftName || existing[0].shiftName;
        resolvedOpenedAt = resolvedOpenedAt || existing[0].openedAt;
      }
    }

    if (!resolvedShiftName || !resolvedOpenedAt) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Field shiftName dan openedAt wajib diisi untuk registrasi sesi shift baru",
        },
        { status: 400 }
      );
    }

    const rawStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : "ONLINE";
    const normalizedStatus = rawStatus === "OFFLINE" ? "OFFLINE" : "ONLINE";
    const reasonText =
      typeof body.reason === "string" && body.reason.trim() !== ""
        ? body.reason.trim()
        : "Perangkat melaporkan status Offline";

    const now = new Date();

    if (normalizedStatus === "OFFLINE") {
      await db
        .insert(posShiftLogs)
        .values({
          sessionId,
          shiftName: resolvedShiftName,
          openedAt: resolvedOpenedAt,
          deviceId,
          status: "OFFLINE",
          lastSeenAt: now,
          offlineAt: now,
        })
        .onConflictDoUpdate({
          target: posShiftLogs.sessionId,
          set: {
            shiftName: resolvedShiftName,
            deviceId,
            status: "OFFLINE",
            lastSeenAt: now,
            offlineAt: now,
          },
        });

      const activeOfflineLogs = await db
        .select({ id: posOfflineLogs.id })
        .from(posOfflineLogs)
        .where(
          and(
            eq(posOfflineLogs.sessionId, sessionId),
            isNull(posOfflineLogs.reconnectedAt)
          )
        )
        .limit(1);

      if (activeOfflineLogs.length === 0) {
        await db.insert(posOfflineLogs).values({
          sessionId,
          deviceId,
          shiftName: resolvedShiftName,
          offlineAt: now,
          reason: reasonText,
        });
      }
    } else {
      await db
        .insert(posShiftLogs)
        .values({
          sessionId,
          shiftName: resolvedShiftName,
          openedAt: resolvedOpenedAt,
          deviceId,
          status: "ONLINE",
          lastSeenAt: now,
          offlineAt: null,
        })
        .onConflictDoUpdate({
          target: posShiftLogs.sessionId,
          set: {
            shiftName: resolvedShiftName,
            deviceId,
            status: "ONLINE",
            lastSeenAt: now,
            offlineAt: null,
          },
        });

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

    return NextResponse.json(
      {
        success: true,
        message: "Shift synced",
        status: normalizedStatus,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("POST /api/pos/sync-shift error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync shift";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
