import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getAllCards } from "@/lib/data/cardStore";
import { AdminEditor } from "@/components/admin/AdminEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAuthed()) redirect("/admin/login");
  const cards = await getAllCards();
  return <AdminEditor initialCards={cards} />;
}
