import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const posShiftLogs = pgTable("pos_shift_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  shiftName: text("shift_name").notNull(),
  openedAt: timestamp("opened_at").notNull(),
  deviceId: text("device_id").notNull(),
  status: text("status").default("ONLINE").notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  offlineAt: timestamp("offline_at"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const posOfflineLogs = pgTable("pos_offline_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  deviceId: text("device_id").notNull(),
  shiftName: text("shift_name").notNull(),
  offlineAt: timestamp("offline_at").notNull(),
  reconnectedAt: timestamp("reconnected_at"),
  reason: text("reason")
    .default("Tidak ada sinyal (Heartbeat Timeout)")
    .notNull(),
});

export type PosShiftLog = typeof posShiftLogs.$inferSelect;
export type NewPosShiftLog = typeof posShiftLogs.$inferInsert;
export type PosOfflineLog = typeof posOfflineLogs.$inferSelect;
export type NewPosOfflineLog = typeof posOfflineLogs.$inferInsert;
