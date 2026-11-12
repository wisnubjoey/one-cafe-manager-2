import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseInvoice } from "@/db/schema/purchase-invoice";
import { desc } from "drizzle-orm";

// GET /api/purchase-invoice
// Mengambil semua daftar purchase invoice
export async function GET() {
  try {
    const list = await db
      .select()
      .from(purchaseInvoice)
      .orderBy(desc(purchaseInvoice.createdAt));

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error: unknown) {
    console.error("GET /api/purchase-invoice error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch invoices";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

// POST /api/purchase-invoice
// Menerima data JSON dari apps mobile Expo / client lain
export async function POST(req: NextRequest) {
  try {
    let body: { name?: unknown; description?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Field 'name' wajib diisi (string tidak boleh kosong).",
        },
        { status: 400 }
      );
    }

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const [newInvoice] = await db
      .insert(purchaseInvoice)
      .values({
        name: body.name.trim(),
        description: description || null,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: newInvoice,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/purchase-invoice error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

