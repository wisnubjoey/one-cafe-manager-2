"use server";

import { db } from "@/db";
import { catalogueProduct, catalogueIngredient } from "@/db/schema/catalogue";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";

function extractUploadThingKey(url: string): string | null {
  if (!url) return null;
  // Match key from uploadthing URLs (e.g. https://<appId>.ufs.sh/f/<key>, https://utfs.io/f/<key>, https://uploadthing.com/f/<key>)
  const match = url.match(/(?:utfs\.io|ufs\.sh|uploadthing\.com)\/f\/([^/?#]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

export type IngredientInput = {
  materialName: string;
  quantity: string;
};

export type ProductWithIngredients = typeof catalogueProduct.$inferSelect & {
  ingredients: (typeof catalogueIngredient.$inferSelect)[];
};

export async function getProducts(): Promise<{
  success: boolean;
  data: ProductWithIngredients[];
  error?: string;
}> {
  try {
    const productsList = await db
      .select()
      .from(catalogueProduct)
      .orderBy(desc(catalogueProduct.createdAt));

    const ingredientsList = await db.select().from(catalogueIngredient);

    const ingredientsMap = new Map<
      string,
      (typeof catalogueIngredient.$inferSelect)[]
    >();

    for (const ing of ingredientsList) {
      const existing = ingredientsMap.get(ing.productId) ?? [];
      existing.push(ing);
      ingredientsMap.set(ing.productId, existing);
    }

    const data: ProductWithIngredients[] = productsList.map((prod) => ({
      ...prod,
      ingredients: ingredientsMap.get(prod.id) ?? [],
    }));

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    console.error("Failed to get products:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch products";
    return {
      success: false,
      data: [],
      error: message,
    };
  }
}

export async function createProduct(payload: {
  name: string;
  imageUrl: string;
  ingredients?: IngredientInput[];
}) {
  try {
    if (!payload.name.trim()) {
      return { success: false, error: "Product name is required" };
    }
    if (!payload.imageUrl.trim()) {
      return { success: false, error: "Image URL is required" };
    }

    const [newProduct] = await db
      .insert(catalogueProduct)
      .values({
        name: payload.name.trim(),
        imageUrl: payload.imageUrl.trim(),
      })
      .returning();

    let createdIngredients: (typeof catalogueIngredient.$inferSelect)[] = [];

    if (payload.ingredients && payload.ingredients.length > 0) {
      const validIngredients = payload.ingredients
        .map((item) => ({
          materialName: item.materialName.trim(),
          quantity: item.quantity.trim(),
        }))
        .filter((item) => item.materialName && item.quantity);

      if (validIngredients.length > 0) {
        createdIngredients = await db
          .insert(catalogueIngredient)
          .values(
            validIngredients.map((item) => ({
              productId: newProduct.id,
              materialName: item.materialName,
              quantity: item.quantity,
            }))
          )
          .returning();
      }
    }

    revalidatePath("/");

    return {
      success: true,
      product: newProduct,
      ingredients: createdIngredients,
    };
  } catch (error: unknown) {
    console.error("Failed to create product:", error);
    const message = error instanceof Error ? error.message : "Failed to create product";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateProduct(
  id: string,
  payload: {
    name: string;
    imageUrl: string;
    ingredients?: IngredientInput[];
  }
) {
  try {
    if (!payload.name.trim()) {
      return { success: false, error: "Product name is required" };
    }
    if (!payload.imageUrl.trim()) {
      return { success: false, error: "Image URL is required" };
    }

    // Check old image if it's an UploadThing image and was replaced
    const [existingProduct] = await db
      .select({ imageUrl: catalogueProduct.imageUrl })
      .from(catalogueProduct)
      .where(eq(catalogueProduct.id, id));

    const oldKey = existingProduct?.imageUrl
      ? extractUploadThingKey(existingProduct.imageUrl)
      : null;
    const newKey = extractUploadThingKey(payload.imageUrl);

    if (oldKey && oldKey !== newKey) {
      try {
        const utapi = new UTApi();
        await utapi.deleteFiles(oldKey);
      } catch (err) {
        console.error("Failed to delete old image from UploadThing:", err);
      }
    }

    const [updatedProduct] = await db
      .update(catalogueProduct)
      .set({
        name: payload.name.trim(),
        imageUrl: payload.imageUrl.trim(),
      })
      .where(eq(catalogueProduct.id, id))
      .returning();

    // Delete previous ingredients and reinsert
    await db
      .delete(catalogueIngredient)
      .where(eq(catalogueIngredient.productId, id));

    let newIngredients: (typeof catalogueIngredient.$inferSelect)[] = [];

    if (payload.ingredients && payload.ingredients.length > 0) {
      const validIngredients = payload.ingredients
        .map((item) => ({
          materialName: item.materialName.trim(),
          quantity: item.quantity.trim(),
        }))
        .filter((item) => item.materialName && item.quantity);

      if (validIngredients.length > 0) {
        newIngredients = await db
          .insert(catalogueIngredient)
          .values(
            validIngredients.map((item) => ({
              productId: id,
              materialName: item.materialName,
              quantity: item.quantity,
            }))
          )
          .returning();
      }
    }

    revalidatePath("/");

    return {
      success: true,
      product: updatedProduct,
      ingredients: newIngredients,
    };
  } catch (error: unknown) {
    console.error("Failed to update product:", error);
    const message = error instanceof Error ? error.message : "Failed to update product";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteProduct(id: string) {
  try {
    // 1. Fetch product first to get imageUrl
    const [product] = await db
      .select({ imageUrl: catalogueProduct.imageUrl })
      .from(catalogueProduct)
      .where(eq(catalogueProduct.id, id));

    // 2. If it's an UploadThing image, delete file from UploadThing storage
    if (product?.imageUrl) {
      const fileKey = extractUploadThingKey(product.imageUrl);
      if (fileKey) {
        try {
          const utapi = new UTApi();
          await utapi.deleteFiles(fileKey);
        } catch (err) {
          console.error("Failed to delete image from UploadThing:", err);
        }
      }
    }

    // 3. Delete product from database
    await db.delete(catalogueProduct).where(eq(catalogueProduct.id, id));
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete product:", error);
    const message = error instanceof Error ? error.message : "Failed to delete product";
    return {
      success: false,
      error: message,
    };
  }
}
