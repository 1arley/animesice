"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GachaMarketOffer } from "@/types";

function personName(person: GachaMarketOffer["offeredUser"]): string {
  return person.name?.trim() || person.userName || "Colecionador";
}

function OfferCard({
  offer,
  incoming,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: {
  offer: GachaMarketOffer;
  incoming: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const item = offer.listing?.item;
  const name = incoming
    ? personName(offer.offeredUser)
    : personName(offer.requestedUser);
  const amounts = [
    offer.crystals > 0
      ? `${offer.crystals.toLocaleString("pt-BR")} Cristais`
      : null,
    offer.offeredCards.length > 0
      ? `${offer.offeredCards.length} carta${offer.offeredCards.length > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean);

  return (
    <li className="border border-hairline bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-mist">
            {incoming ? `${name} propõe` : `Você propôs para ${name}`}
          </p>
          <h3 className="mt-1 break-words font-display text-lg text-snow">
            {item ? item.name : "Anúncio encerrado"}
          </h3>
          {offer.listing && (
            <p className="mt-1 text-caption text-mist">
              {offer.listing.itemType === "CARD" ? "Carta" : "Skin"} · preço
              pedido {offer.listing.price.toLocaleString("pt-BR")} Cristais
            </p>
          )}
        </div>
        {offer.status === "PENDING" ? (
          <span className="shrink-0 font-mono text-caption text-ice">
            Expira {new Date(offer.expiresAt).toLocaleDateString("pt-BR")}
          </span>
        ) : (
          <span className="shrink-0 font-mono text-caption text-mist">
            {offer.status === "ACCEPTED"
              ? "Aceita"
              : offer.status === "DECLINED"
                ? "Recusada"
                : offer.status === "EXPIRED"
                  ? "Expirada"
                  : "Cancelada"}
          </span>
        )}
      </div>
      <p className="mt-3 text-body-sm text-ice">
        {amounts.join(" + ") || "Sem itens na proposta"}
      </p>
      {offer.offeredCards.length > 0 && (
        <ul
          className="mt-2 flex flex-wrap gap-2"
          aria-label="Cartas oferecidas"
        >
          {offer.offeredCards.map((card) => (
            <li
              key={card.id}
              className="border border-hairline px-2 py-1 text-caption text-mist"
            >
              {card.name} · {card.foil} · edição #{card.edition}
            </li>
          ))}
        </ul>
      )}
      {offer.status === "PENDING" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {incoming ? (
            <>
              <button
                type="button"
                disabled={busy || !item}
                onClick={onAccept}
                className="btn-ice min-h-11 px-4 disabled:opacity-40"
              >
                {busy ? "Processando…" : "Aceitar proposta"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDecline}
                className="btn-ghost min-h-11 px-4 disabled:opacity-40"
              >
                Recusar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="btn-ghost min-h-11 px-4 disabled:opacity-40"
            >
              Cancelar proposta
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function GachaMarketOfferHub({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<GachaMarketOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setOffers(await api.gachaEconomyMyMarketOffers());
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar suas propostas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load, refreshKey]);

  async function act(
    offer: GachaMarketOffer,
    action: () => Promise<unknown>,
    message: string,
  ) {
    if (busyId) return;
    setBusyId(offer.id);
    setError("");
    try {
      await action();
      toast(message, "success");
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível concluir a proposta.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return null;
  const incoming = offers.filter(
    (offer) => offer.requestedUserId === user.id && offer.status === "PENDING",
  );
  const outgoing = offers.filter(
    (offer) => offer.offeredUserId === user.id && offer.status === "PENDING",
  );
  const history = offers.filter((offer) => offer.status !== "PENDING");

  return (
    <section
      id="market-offers"
      className="mt-10"
      aria-labelledby="market-offers-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="market-offers-title"
            className="scroll-mt-24 font-display text-2xl text-snow"
          >
            Propostas do mercado
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-mist">
            Negocie um anúncio por Cristais, cartas ou uma combinação dos dois.
            Os itens ficam reservados até a resposta.
          </p>
        </div>
        <a href="#trade-heading" className="btn-ghost min-h-11 px-4">
          Trocas de cartas
        </a>
      </div>

      {error && (
        <div role="alert" className="mt-4 text-body-sm text-signal">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="btn-ghost ml-3 min-h-11 px-3"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="skeleton mt-4 h-28" aria-busy="true" />
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {[
            { title: "Recebidas", rows: incoming, incoming: true },
            { title: "Enviadas", rows: outgoing, incoming: false },
          ].map((group) => (
            <section
              key={group.title}
              aria-label={`Propostas ${group.title.toLowerCase()}`}
            >
              <h3 className="font-display text-xl text-snow">
                {group.title}{" "}
                <span className="text-mist">({group.rows.length})</span>
              </h3>
              {group.rows.length === 0 ? (
                <EmptyState
                  text={`Nenhuma proposta ${group.incoming ? "recebida" : "enviada"} ativa.`}
                  variant="compact"
                />
              ) : (
                <ul className="mt-3 space-y-3">
                  {group.rows.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      incoming={group.incoming}
                      busy={busyId === offer.id}
                      onAccept={() =>
                        void act(
                          offer,
                          () => api.gachaEconomyAcceptMarketOffer(offer.id),
                          "Proposta aceita.",
                        )
                      }
                      onDecline={() =>
                        void act(
                          offer,
                          () => api.gachaEconomyDeclineMarketOffer(offer.id),
                          "Proposta recusada.",
                        )
                      }
                      onCancel={() =>
                        void act(
                          offer,
                          () => api.gachaEconomyCancelMarketOffer(offer.id),
                          "Proposta cancelada e reservas liberadas.",
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-6 border border-hairline p-4">
          <summary className="min-h-11 cursor-pointer font-display text-lg text-snow focus-visible:ring-2 focus-visible:ring-ice">
            Histórico recente ({history.length})
          </summary>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {history.slice(0, 20).map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                incoming={offer.requestedUserId === user.id}
                busy={false}
                onAccept={() => undefined}
                onDecline={() => undefined}
                onCancel={() => undefined}
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
