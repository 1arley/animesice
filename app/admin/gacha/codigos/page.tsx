"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import { ItemRewardPicker } from "@/components/gacha/ItemRewardPicker";
import type {
  GachaCatalogItem,
  GachaItemAmount,
  GachaRewardCode,
} from "@/types";

const blank = {
  code: "",
  crystals: "2500",
  maxUses: "",
  expiresAt: "",
  count: "1",
};
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AdminCrystalCodesPage() {
  const [codes, setCodes] = useState<GachaRewardCode[]>([]);
  const [catalog, setCatalog] = useState<GachaCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blank);
  const [items, setItems] = useState<GachaItemAmount[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [createdBatch, setCreatedBatch] = useState<GachaRewardCode[]>([]);
  const [search, setSearch] = useState("");
  const formTitle = useRef<HTMLHeadingElement>(null);
  const { toast } = useToast();
  const currentCode = codes.find((code) => code.id === editing);
  const rewardsLocked = !!currentCode && currentCode.uses > 0;
  const itemLabel = (itemId: string) =>
    catalog.find((item) => item.id === itemId)?.name ?? itemId;
  const rewardLabel = (code: Pick<GachaRewardCode, "crystals" | "items">) =>
    [
      code.crystals > 0
        ? `${code.crystals.toLocaleString("pt-BR")} Cristais`
        : "",
      ...(code.items ?? []).map(
        (item) =>
          `${item.quantity.toLocaleString("pt-BR")}× ${itemLabel(item.itemId)}`,
      ),
    ]
      .filter(Boolean)
      .join(" + ");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, catalogResult] = await Promise.all([
        api.adminCrystalCodes(),
        api.gachaItemCatalog(),
      ]);
      setCodes(result);
      setCatalog(catalogResult);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Erro ao carregar códigos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function startEditing(code: GachaRewardCode) {
    setEditing(code.id);
    setItems(code.items ?? []);
    setForm({
      code: code.code,
      crystals: String(code.crystals),
      maxUses: code.maxUses === null ? "" : String(code.maxUses),
      expiresAt: code.expiresAt ? localDate(code.expiresAt) : "",
      count: "1",
    });
    setError("");
    formTitle.current?.focus();
  }
  function reset() {
    setEditing(null);
    setForm(blank);
    setItems([]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    const crystals = Number(form.crystals || "0");
    const count = Number(form.count);
    const maxUses = form.maxUses ? Number(form.maxUses) : undefined;
    if (
      !Number.isSafeInteger(crystals) ||
      crystals < 0 ||
      crystals > 2147483647 ||
      (!crystals && !items.length) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100 ||
      (maxUses !== undefined && (!Number.isSafeInteger(maxUses) || maxUses < 1))
    ) {
      setError(
        "Informe um pacote de recompensas, limites inteiros e até 100 códigos por lote.",
      );
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const body = {
        code: form.code || undefined,
        crystals,
        items,
        maxUses: editing && maxUses === undefined ? 0 : maxUses,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
      };
      if (editing) {
        await api.adminUpdateCrystalCode(editing, {
          ...body,
          expiresAt: form.expiresAt ? body.expiresAt : "",
        });
        toast("Código atualizado.", "success");
      } else if (count > 1) {
        const batch = await api.adminCreateCrystalCodeBatch({ ...body, count });
        setCreatedBatch(batch);
        toast(`${batch.length} códigos criados.`, "success");
      } else {
        const created = await api.adminCreateCrystalCode(body);
        setCreatedBatch([created]);
        toast("Código criado.", "success");
      }
      reset();
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível salvar. Confira a lista antes de repetir a criação.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function toggle(code: GachaRewardCode) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await api.adminToggleCrystalCode(code.id, !code.active);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar o código.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function remove(code: GachaRewardCode) {
    if (busyRef.current || !window.confirm(`Excluir o código ${code.code}?`))
      return;
    busyRef.current = true;
    setBusy(true);
    try {
      await api.adminDeleteCrystalCode(code.id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível excluir.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function exportCsv(rows: GachaRewardCode[]) {
    const data = [
      ["Código", "Recompensas", "Limite por código", "Validade"],
      ...rows.map((code) => [
        code.code,
        rewardLabel(code),
        code.maxUses ?? "",
        code.expiresAt ?? "",
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", data], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "codigos-recompensas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const filtered = codes.filter((code) =>
    `${code.code} ${rewardLabel(code)}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <main className="mx-auto max-w-shelf px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-lg text-snow">
          Códigos de recompensa
        </h1>
        <GachaAdminTabs current="/admin/gacha/codigos" />
      </div>
      <p className="mt-2 max-w-2xl text-mist">
        Distribua Cristais e itens do inventário em um único pacote. Cada pessoa
        pode resgatar cada código uma vez.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-signal">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => void save(event)}
        className="mt-6 border border-hairline bg-panel p-4 sm:p-6"
      >
        <h2
          ref={formTitle}
          tabIndex={-1}
          className="font-display text-xl text-snow"
        >
          {editing ? "Editar código" : "Criar códigos"}
        </h2>
        {rewardsLocked && (
          <p className="mt-2 text-body-sm text-mist">
            Este código já foi resgatado. Nome e recompensas estão bloqueados
            para preservar o histórico.
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-body-sm text-snow">
            {!editing && Number(form.count) > 1
              ? "Prefixo do lote (opcional)"
              : "Código (opcional)"}
            <input
              className="field mt-2 min-h-11 w-full"
              disabled={rewardsLocked || busy}
              maxLength={Number(form.count) > 1 ? 60 : 64}
              placeholder="Automático"
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value.toUpperCase() })
              }
            />
          </label>
          <label className="text-body-sm text-snow">
            Cristais
            <input
              className="field mt-2 min-h-11 w-full"
              type="number"
              min={0}
              max={2147483647}
              step={1}
              disabled={rewardsLocked || busy}
              value={form.crystals}
              onChange={(event) =>
                setForm({ ...form, crystals: event.target.value })
              }
            />
          </label>
          <label className="text-body-sm text-snow">
            Resgates por código
            <input
              className="field mt-2 min-h-11 w-full"
              type="number"
              min={Math.max(1, currentCode?.uses ?? 1)}
              max={2147483647}
              placeholder="Ilimitado"
              disabled={busy}
              value={form.maxUses}
              onChange={(event) =>
                setForm({ ...form, maxUses: event.target.value })
              }
            />
          </label>
          <label className="text-body-sm text-snow">
            Validade
            <input
              className="field mt-2 min-h-11 w-full"
              type="datetime-local"
              disabled={busy}
              value={form.expiresAt}
              onChange={(event) =>
                setForm({ ...form, expiresAt: event.target.value })
              }
            />
          </label>
        </div>
        {!editing && (
          <label className="mt-4 block max-w-xs text-body-sm text-snow">
            Quantidade de códigos no lote
            <input
              className="field mt-2 min-h-11 w-full"
              type="number"
              min={1}
              max={100}
              step={1}
              required
              disabled={busy}
              value={form.count}
              onChange={(event) =>
                setForm({ ...form, count: event.target.value })
              }
            />
          </label>
        )}
        <div className="mt-5">
          <ItemRewardPicker
            catalog={catalog}
            value={items}
            onChange={setItems}
            disabled={rewardsLocked || busy || loading}
          />
        </div>
        <p className="mt-4 text-body-sm text-ice" aria-live="polite">
          Pacote:{" "}
          {rewardLabel({ crystals: Number(form.crystals || "0"), items }) ||
            "Escolha ao menos uma recompensa."}
        </p>
        {!editing && Number(form.count) > 1 && (
          <p className="mt-2 text-caption text-mist">
            Os códigos do lote têm o mesmo pacote. Os limites de uso valem
            separadamente para cada código.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            disabled={busy || loading}
            className="btn-ice min-h-11 px-4 disabled:opacity-40"
          >
            {busy
              ? "Salvando…"
              : editing
                ? "Salvar código"
                : Number(form.count) > 1
                  ? "Gerar lote"
                  : "Gerar código"}
          </button>
          {editing && (
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="btn-ghost min-h-11 px-4"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>
      {createdBatch.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-hairline bg-panel p-4">
          <p role="status" className="text-ice">
            {createdBatch.length} código(s) criados.
          </p>
          <button
            type="button"
            onClick={() => exportCsv(createdBatch)}
            className="btn-ghost min-h-11 px-4"
          >
            Exportar lote em CSV
          </button>
        </div>
      )}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <label className="block text-body-sm text-mist">
          Buscar código ou recompensa
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field mt-2 min-h-11 w-full sm:w-80"
          />
        </label>
        <button
          type="button"
          disabled={!filtered.length}
          onClick={() => exportCsv(filtered)}
          className="btn-ghost min-h-11 px-4"
        >
          Exportar lista em CSV
        </button>
      </div>
      {loading ? (
        <p className="mt-4 text-mist" role="status">
          Carregando códigos…
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-hairline">
          <table className="w-full text-left text-body-sm">
            <caption className="sr-only">
              Códigos, pacotes de recompensa, limites e ações
            </caption>
            <thead className="bg-panel text-mist">
              <tr>
                {[
                  "Código",
                  "Recompensas",
                  "Usos",
                  "Validade",
                  "Status",
                  "Ações",
                ].map((title) => (
                  <th key={title} scope="col" className="px-3 py-3 font-medium">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((code) => (
                <tr key={code.id} className="bg-panel">
                  <th scope="row" className="px-3 py-3 font-mono text-ice">
                    {code.code}
                  </th>
                  <td className="min-w-56 px-3 py-3 text-snow">
                    {rewardLabel(code)}
                  </td>
                  <td className="px-3 py-3 text-mist">
                    {code.uses}/{code.maxUses ?? "∞"}
                  </td>
                  <td className="px-3 py-3 text-mist">
                    {code.expiresAt
                      ? new Date(code.expiresAt).toLocaleString("pt-BR")
                      : "Sem validade"}
                  </td>
                  <td className="px-3 py-3 text-snow">
                    {code.active ? "Ativo" : "Inativo"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEditing(code)}
                        className="btn-ghost min-h-11 px-3"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggle(code)}
                        className="btn-ghost min-h-11 px-3"
                      >
                        {code.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        disabled={busy || code.uses > 0}
                        title={
                          code.uses
                            ? "Desative para preservar resgates"
                            : undefined
                        }
                        onClick={() => void remove(code)}
                        className="btn-ghost min-h-11 px-3 text-signal disabled:opacity-40"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-6 text-mist">Nenhum código encontrado.</p>
          )}
        </div>
      )}
    </main>
  );
}
