import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const purchaseInvoice = pgTable("purchase_invoice", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Alias for convenience
export const purchaseInvoices = purchaseInvoice;

export type PurchaseInvoice = typeof purchaseInvoice.$inferSelect;
export type NewPurchaseInvoice = typeof purchaseInvoice.$inferInsert;

