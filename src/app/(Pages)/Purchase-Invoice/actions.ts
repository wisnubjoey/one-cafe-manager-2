"use server";

import { db } from "@/db";
import { purchaseInvoice, type PurchaseInvoice } from "@/db/schema/purchase-invoice";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPurchaseInvoices(): Promise<{
  success: boolean;
  data: PurchaseInvoice[];
  error?: string;
}> {
  try {
    const list = await db
      .select()
      .from(purchaseInvoice)
      .orderBy(desc(purchaseInvoice.createdAt));

    return {
      success: true,
      data: list,
    };
  } catch (error: unknown) {
    console.error("Failed to get purchase invoices:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch purchase invoices";
    return {
      success: false,
      data: [],
      error: message,
    };
  }
}

export async function createPurchaseInvoice(payload: {
  name: string;
  description?: string;
}) {
  try {
    if (!payload.name?.trim()) {
      return { success: false, error: "Nama invoice wajib diisi" };
    }

    const [newItem] = await db
      .insert(purchaseInvoice)
      .values({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
      })
      .returning();

    revalidatePath("/Purchase-Invoice");

    return {
      success: true,
      data: newItem,
    };
  } catch (error: unknown) {
    console.error("Failed to create purchase invoice:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create purchase invoice";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updatePurchaseInvoice(
  id: string,
  payload: {
    name: string;
    description?: string;
  }
) {
  try {
    if (!payload.name?.trim()) {
      return { success: false, error: "Nama invoice wajib diisi" };
    }

    const [updatedItem] = await db
      .update(purchaseInvoice)
      .set({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
      })
      .where(eq(purchaseInvoice.id, id))
      .returning();

    revalidatePath("/Purchase-Invoice");

    return {
      success: true,
      data: updatedItem,
    };
  } catch (error: unknown) {
    console.error("Failed to update purchase invoice:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update purchase invoice";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deletePurchaseInvoice(id: string) {
  try {
    await db.delete(purchaseInvoice).where(eq(purchaseInvoice.id, id));
    revalidatePath("/Purchase-Invoice");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete purchase invoice:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete purchase invoice";
    return {
      success: false,
      error: message,
    };
  }
}

