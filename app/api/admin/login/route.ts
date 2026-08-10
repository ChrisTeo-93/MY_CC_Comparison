import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminDisabled, sessionToken, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

const DISABLED_MESSAGE =
  "Admin access is disabled on this deployment — set the ADMIN_PASSWORD environment variable to enable it.";

export async function POST(req: Request) {
  // Reported plainly: it tells an operator what to fix and is no help to an
  // attacker, who learns only that the editor is unusable.
  if (adminDisabled()) {
    return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (typeof body.password !== "string" || !verifyPassword(body.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const token = sessionToken();
  if (token === null) {
    return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
