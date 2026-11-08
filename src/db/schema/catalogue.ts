import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const catalogueProduct = pgTable("catalogue_product", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const catalogueIngredient = pgTable("catalogue_ingredient", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => catalogueProduct.id, { onDelete: "cascade" }),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const catalogueProductRelations = relations(catalogueProduct, ({ many }) => ({
  ingredients: many(catalogueIngredient),
}));

export const catalogueIngredientRelations = relations(catalogueIngredient, ({ one }) => ({
  product: one(catalogueProduct, {
    fields: [catalogueIngredient.productId],
    references: [catalogueProduct.id],
  }),
}));

// Aliases for convenience
export const catalogueProducts = catalogueProduct;
export const catalogueIngredients = catalogueIngredient;
export const products = catalogueProduct;
export const ingredients = catalogueIngredient;

