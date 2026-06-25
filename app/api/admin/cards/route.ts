import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getAllCards, upsertCard } from "@/lib/data/cardStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ cards: await getAllCards() });
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    const card = await upsertCard(body);
    return NextResponse.json({ card });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
