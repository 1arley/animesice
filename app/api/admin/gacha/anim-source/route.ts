import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api-server";
import { compileComponent } from "@/lib/compile-component";

/**
 * Lê/grava o ARQUIVO INTEIRO da animação (/admin/gacha/animacao).
 *
 * Escrever aqui é escrever código que roda no site inteiro, então:
 * - só SUPERADMIN (cookie validada no backend, mesmo padrão do /revalidate);
 * - caminho fixo no repo, nunca vindo do request;
 * - o TSX só é gravado depois de compilar com sucesso.
 *
 * ponytail: em container de produção o repo não existe (standalone), o GET
 * responde 501 e o dev edita localmente. Subir para "persistir no banco + compilar
 * no request" quando a prévia tiver que funcionar longe do repo.
 */
const RELATIVE_PATH = "src/components/gacha/RollStage.tsx";
const ABS_PATH = path.join(process.cwd(), RELATIVE_PATH);
const MAX_BYTES = 400_000;

async function denyUnlessSuperadmin(): Promise<Response | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  if (!cookie) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const response = await fetch(`${API_URL}/user/me`, { headers: { cookie }, cache: "no-store" }).catch(
    () => null,
  );
  if (!response?.ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const user = (await response.json()) as { role?: string };
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json({ message: "Apenas SUPERADMIN edita o arquivo da animação." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await denyUnlessSuperadmin();
  if (denied) return denied;

  try {
    const source = await readFile(ABS_PATH, "utf8");
    return NextResponse.json({ path: RELATIVE_PATH, source });
  } catch {
    return NextResponse.json(
      { message: `Não achei ${RELATIVE_PATH} neste servidor (build standalone não tem o repo).` },
      { status: 501 },
    );
  }
}

export async function PUT(request: Request) {
  const denied = await denyUnlessSuperadmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { source?: unknown } | null;
  const source = typeof body?.source === "string" ? body.source : null;
  if (source === null) {
    return NextResponse.json({ message: "Corpo precisa de { source: string }." }, { status: 400 });
  }
  if (Buffer.byteLength(source, "utf8") > MAX_BYTES) {
    return NextResponse.json({ message: `Arquivo acima de ${MAX_BYTES} bytes.` }, { status: 413 });
  }

  try {
    await compileComponent(source, {}, RELATIVE_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao compilar.";
    return NextResponse.json({ message }, { status: 422 });
  }

  try {
    await writeFile(ABS_PATH, source, "utf8");
  } catch {
    return NextResponse.json(
      { message: "Read-only: este servidor não tem o repo montado." },
      { status: 501 },
    );
  }
  return NextResponse.json({ path: RELATIVE_PATH, bytes: Buffer.byteLength(source, "utf8") });
}