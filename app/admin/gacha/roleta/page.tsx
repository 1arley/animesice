"use client";

import { useCallback, useEffect, useState } from "react";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import { api, ApiError } from "@/lib/api";
import type {
  AdminGachaRoulettePrize,
  AdminGachaRouletteResponse,
  GachaRoulettePrizeCategory,
} from "@/types";

const CATEGORIES: GachaRoulettePrizeCategory[] = [
  "CRYSTAL",
  "KEY",
  "SPIN_RESET",
  "COMMON_BOX",
  "RARE_BOX",
  "PREMIUM_BOX",
  "KEY_RARE_BOX",
  "KEY_PREMIUM_BOX",
  "ITEM",
  "FOIL_SHARD",
  "FOIL_GEM",
  "ESSENCE",
  "CARD",
  "SKIN",
  "CARD_BACK",
];

export default function AdminGachaRoulettePage() {
  const [data, setData] = useState<AdminGachaRouletteResponse | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [spinDropChance, setSpinDropChance] = useState("4.5");
  const [prizes, setPrizes] = useState<AdminGachaRoulettePrize[]>([]);
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("1");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.adminGachaRoulette(
        page,
        25,
        search.trim() || undefined,
      );
      setData(res);
      setEnabled(res.enabled);
      setSpinDropChance(String(res.spinDropChance));
      setPrizes(res.prizes);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Erro ao carregar painel da roleta.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalActiveWeight = prizes
    .filter((p) => p.enabled && Number(p.weight) > 0)
    .reduce((acc, p) => acc + Number(p.weight), 0);

  const updatePrize = (
    idx: number,
    patch: Partial<AdminGachaRoulettePrize>,
  ) => {
    setPrizes((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  };

  const addPrize = () => {
    setPrizes((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        label: "Novo Prêmio",
        category: "CRYSTAL",
        itemId: null,
        quantity: 100,
        weight: 5,
        enabled: true,
        probabilityPct: 0,
      },
    ]);
  };

  const removePrize = (idx: number) => {
    setPrizes((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const chance = Number(spinDropChance);
      await api.adminUpdateGachaRouletteConfig({
        enabled,
        spinDropChance: chance,
        prizes: prizes.map((p) => ({
          id: p.id.trim(),
          label: p.label.trim(),
          category: p.category,
          itemId: p.itemId?.trim() || null,
          quantity: Math.max(1, Math.trunc(Number(p.quantity) || 1)),
          weight: Math.max(0, Number(p.weight) || 0),
          enabled: p.enabled,
        })),
        reason: reason.trim() || undefined,
      });
      setFeedback("Configuração e prêmios da roleta salvos com sucesso.");
      setReason("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a configuração da roleta.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId.trim() || !grantReason.trim()) return;
    setGranting(true);
    setError("");
    setFeedback("");
    try {
      const res = await api.adminGrantRouletteSpins(grantUserId.trim(), {
        amount: Math.trunc(Number(grantAmount) || 0),
        reason: grantReason.trim(),
      });
      setFeedback(
        `Giros concedidos! Novo saldo do jogador ${res.userId}: ${res.rouletteSpins} giros.`,
      );
      setGrantUserId("");
      setGrantReason("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível conceder giros.",
      );
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="font-display text-3xl text-snow">
          Admin · Roleta de Prêmios
        </h1>
        <GachaAdminTabs current="/admin/gacha/roleta" />
      </div>

      {feedback && (
        <p role="status" className="border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </p>
      )}

      {/* Métricas */}
      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-hairline bg-panel p-4">
            <p className="font-mono text-caption uppercase text-mist">
              Total de giros
            </p>
            <p className="mt-1 font-display text-2xl text-snow">
              {data.stats.totalSpins}
            </p>
          </div>
          <div className="border border-hairline bg-panel p-4">
            <p className="font-mono text-caption uppercase text-mist">
              Giros nas últimas 24h
            </p>
            <p className="mt-1 font-display text-2xl text-snow">
              {data.stats.spinsLast24h}
            </p>
          </div>
          <div className="border border-hairline bg-panel p-4">
            <p className="font-mono text-caption uppercase text-mist">
              Prêmios ativos
            </p>
            <p className="mt-1 font-display text-2xl text-snow">
              {prizes.filter((p) => p.enabled && p.weight > 0).length} /{" "}
              {prizes.length}
            </p>
          </div>
        </div>
      )}

      {/* Conceder giros manualmente */}
      <form
        onSubmit={(e) => void handleGrant(e)}
        className="border border-hairline bg-panel p-5 space-y-4"
      >
        <h2 className="font-display text-xl text-snow">
          Conceder giros manualmente
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-caption text-mist">
            <span>ID do Usuário</span>
            <input
              type="text"
              required
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              placeholder="UUID do jogador"
              className="w-full border border-hairline bg-ink px-3 py-2 text-body-sm text-snow"
            />
          </label>
          <label className="block space-y-1 text-caption text-mist">
            <span>Quantidade (ex: 1, 5 ou -1)</span>
            <input
              type="number"
              required
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              className="w-full border border-hairline bg-ink px-3 py-2 text-body-sm text-snow"
            />
          </label>
          <label className="block space-y-1 text-caption text-mist">
            <span>Motivo obrigatório</span>
            <input
              type="text"
              required
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Ex: Compensação de evento"
              className="w-full border border-hairline bg-ink px-3 py-2 text-body-sm text-snow"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={granting}
          className="btn-ice min-h-10 px-5"
        >
          {granting ? "Concedendo…" : "Conceder Giros"}
        </button>
      </form>

      {/* Configuração global e prêmios */}
      <form
        onSubmit={(e) => void saveConfig(e)}
        className="border border-hairline bg-panel p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-snow">
            Configuração e Prêmios (Probabilidades visíveis apenas ao Admin)
          </h2>
          <button
            type="button"
            onClick={addPrize}
            className="border border-ice/50 bg-ink px-3 py-1.5 font-mono text-caption text-ice hover:bg-ice/10"
          >
            + Adicionar prêmio
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 border border-hairline bg-ink px-3 py-2 text-body-sm text-snow">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Roleta ativada</span>
          </label>
          <label className="block space-y-1 text-caption text-mist">
            <span>Chance de drop de giro na carta (%)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={spinDropChance}
              onChange={(e) => setSpinDropChance(e.target.value)}
              className="w-full border border-hairline bg-ink px-3 py-2 text-body-sm text-snow"
            />
          </label>
          <label className="block space-y-1 text-caption text-mist">
            <span>Motivo da alteração (auditoria)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Opcional"
              className="w-full border border-hairline bg-ink px-3 py-2 text-body-sm text-snow"
            />
          </label>
        </div>

        <div className="overflow-x-auto border border-hairline">
          <table className="w-full text-left text-caption">
            <thead className="border-b border-hairline bg-ink font-mono uppercase text-mist">
              <tr>
                <th className="p-2">Ativo</th>
                <th className="p-2">ID</th>
                <th className="p-2">Rótulo</th>
                <th className="p-2">Categoria</th>
                <th className="p-2">Item ID</th>
                <th className="p-2">Qtd</th>
                <th className="p-2">Peso</th>
                <th className="p-2">Prob.</th>
                <th className="p-2">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline bg-panel">
              {prizes.map((prize, idx) => {
                const prob =
                  prize.enabled && prize.weight > 0 && totalActiveWeight > 0
                    ? ((prize.weight / totalActiveWeight) * 100).toFixed(2)
                    : "0.00";
                return (
                  <tr key={`${prize.id}-${idx}`}>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={prize.enabled}
                        onChange={(e) =>
                          updatePrize(idx, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={prize.id}
                        onChange={(e) =>
                          updatePrize(idx, { id: e.target.value })
                        }
                        className="w-32 border border-hairline bg-ink px-2 py-1 text-snow"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={prize.label}
                        onChange={(e) =>
                          updatePrize(idx, { label: e.target.value })
                        }
                        className="w-44 border border-hairline bg-ink px-2 py-1 text-snow"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={prize.category}
                        onChange={(e) =>
                          updatePrize(idx, {
                            category: e.target.value as GachaRoulettePrizeCategory,
                          })
                        }
                        className="border border-hairline bg-ink px-2 py-1 text-snow"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={prize.itemId ?? ""}
                        onChange={(e) =>
                          updatePrize(idx, { itemId: e.target.value || null })
                        }
                        placeholder="-"
                        className="w-36 border border-hairline bg-ink px-2 py-1 text-snow"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        value={prize.quantity}
                        onChange={(e) =>
                          updatePrize(idx, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className="w-16 border border-hairline bg-ink px-2 py-1 text-snow"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={prize.weight}
                        onChange={(e) =>
                          updatePrize(idx, {
                            weight: Number(e.target.value) || 0,
                          })
                        }
                        className="w-20 border border-hairline bg-ink px-2 py-1 text-snow"
                      />
                    </td>
                    <td className="p-2 font-mono text-ice">{prob}%</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removePrize(idx)}
                        className="text-signal hover:underline"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-ice min-h-11 px-6"
        >
          {saving ? "Salvando…" : "Salvar Configuração da Roleta"}
        </button>
      </form>

      {/* Histórico */}
      <section className="border border-hairline bg-panel p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-snow">
            Histórico de giros distribuídos
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Filtrar por jogador ou prêmio…"
            className="border border-hairline bg-ink px-3 py-1.5 text-body-sm text-snow"
          />
        </div>

        {loading ? (
          <p className="text-body-sm text-mist">Carregando…</p>
        ) : !data || data.history.data.length === 0 ? (
          <p className="text-body-sm text-mist">Nenhum giro registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto border border-hairline">
            <table className="w-full text-left text-caption">
              <thead className="border-b border-hairline bg-ink font-mono uppercase text-mist">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Jogador</th>
                  <th className="p-2">Prêmio</th>
                  <th className="p-2">Categoria</th>
                  <th className="p-2">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-ink/40">
                {data.history.data.map((row) => (
                  <tr key={row.id}>
                    <td className="p-2 font-mono text-mist">
                      {new Date(row.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-2 text-snow">
                      {row.user?.userName ?? row.user?.name ?? row.user?.email ?? "-"}
                    </td>
                    <td className="p-2 text-snow">{row.prizeLabel}</td>
                    <td className="p-2 font-mono text-mist">{row.category}</td>
                    <td className="p-2 font-mono text-snow">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.history.meta.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border border-hairline bg-ink px-3 py-1 text-caption text-snow disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-mono text-caption text-mist">
              Página {data.history.meta.page} de {data.history.meta.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.history.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-hairline bg-ink px-3 py-1 text-caption text-snow disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
