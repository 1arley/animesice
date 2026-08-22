import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api-server";
import { isPrivilegedRole } from "@/lib/role";

export async function POST() {
  const cookie = (await headers()).get("cookie") ?? "";
  if (!cookie) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const response = await fetch(`${API_URL}/user/me`, {
    headers: { cookie },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const user = (await response.json()) as { role?: string };
  if (!isPrivilegedRole(user.role)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  revalidateTag("blog-posts");
  revalidatePath("/blog", "layout");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ revalidated: true });
}
