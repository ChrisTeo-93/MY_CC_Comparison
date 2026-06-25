import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteCard } from "@/lib/data/cardStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const removed = await deleteCard(params.id);
  if (!removed) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
