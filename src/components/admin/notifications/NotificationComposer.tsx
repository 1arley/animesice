"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";
import { Avatar } from "@/components/common/Avatar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SearchField } from "@/components/ui/SearchField";
import { NotificationCategoryIcon } from "@/components/common/NotificationCategoryIcon";
import { NotificationPreview } from "@/components/admin/notifications/NotificationPreview";
import {
  NOTIFICATION_AUDIENCE_LABELS,
  NOTIFICATION_CATEGORIES,
} from "@/lib/notification-categories";
import type {
  AdminNotificationAudience,
  AdminNotificationCategory,
  AdminNotificationRecipient,
} from "@/types";

const MAX_SELECTED = 500;
const MAX_TITLE = 120;
const MAX_BODY = 2000;

const AUDIENCES: readonly {
  key: AdminNotificationAudience;
  label: string;
  hint: string;
}[] = [
  {
    key: "SINGLE",
    label: "Um jogador",
    hint: "Agradecimento ou resposta pessoal.",
  },
  {
    key: "SELECTED",
    label: "Grupo",
    hint: "Escolha quem deve receber.",
  },
  {
    key: "GLOBAL",
    label: "Todos",
    hint: "Comunicado oficial para a comunidade.",
  },
];

function createDedupeKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function displayName(user: AdminNotificationRecipient): string {
  return user.name?.trim() || user.userName?.trim() || "Jogador sem nome";
}

export function NotificationComposer({
  onSent,
  onViewHistory,
}: {
  onSent: () => void;
  onViewHistory: () => void;
}) {
  const { toast } = useToast();
  const [audience, setAudience] =
    useState<AdminNotificationAudience>("SINGLE");
  const [recipients, setRecipients] = useState<AdminNotificationRecipient[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminNotificationRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] =
    useState<AdminNotificationCategory>("THANKS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [globalCount, setGlobalCount] = useState<number | null>(null);
  const [globalCountError, setGlobalCountError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{
    count: number;
    duplicate: boolean;
  } | null>(null);
  const [dedupeKey, setDedupeKey] = useState(createDedupeKey);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);

  const linkError =
    linkUrl.trim() !== "" && !/^\/(?!\/)[^\s\\]*$/.test(linkUrl.trim())
      ? "Use um caminho interno, começando por / (ex.: /gacha), sem espaços ou barras invertidas."
      : null;

  const selectedIds = useMemo(
    () => new Set(recipients.map((recipient) => recipient.id)),
    [recipients],
  );

  useEffect(() => {
    api
      .adminGetNotificationAudience()
      .then((response) => setGlobalCount(response.count))
      .catch(() => {
        setGlobalCount(null);
        setGlobalCountError(true);
      });
  }, []);

  useEffect(() => {
    const term = search.trim();
    const requestId = ++searchRequestId.current;
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (audience === "GLOBAL" || term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    searchTimer.current = setTimeout(() => {
      setSearching(true);
      api
        .adminSearchNotificationRecipients(term, 1, 8)
        .then((response) => {
          if (requestId === searchRequestId.current) {
            setResults(response.data);
          }
        })
        .catch(() => {
          if (requestId === searchRequestId.current) setResults([]);
        })
        .finally(() => {
          if (requestId === searchRequestId.current) setSearching(false);
        });
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [audience, search]);

  const changeAudience = useCallback(
    (next: AdminNotificationAudience) => {
      setAudience(next);
      setFormError(null);
      setSentInfo(null);
      if (next === "SINGLE") {
        setRecipients((current) => current.slice(0, 1));
      }
    },
    [],
  );

  function toggleRecipient(user: AdminNotificationRecipient) {
    setFormError(null);
    setRecipients((current) => {
      const exists = current.some((recipient) => recipient.id === user.id);
      if (audience === "SINGLE") return exists ? [] : [user];
      if (exists) {
        return current.filter((recipient) => recipient.id !== user.id);
      }
      if (current.length >= MAX_SELECTED) {
        setFormError(
          `Selecione no máximo ${MAX_SELECTED} jogadores por envio.`,
        );
        return current;
      }
      return [...current, user];
    });
  }

  function validate(): string | null {
    if (audience === "GLOBAL") {
      if (globalCount === null) {
        return "Não foi possível estimar os destinatários. Recarregue a página.";
      }
    } else if (recipients.length === 0) {
      return "Selecione ao menos um destinatário.";
    } else if (audience === "SINGLE" && recipients.length !== 1) {
      return "Envio individual aceita exatamente um jogador.";
    }
    if (title.trim().length < 3) {
      return "O título precisa ter pelo menos 3 caracteres.";
    }
    if (body.trim().length < 1) {
      return "Escreva a mensagem da notificação.";
    }
    if (linkError) return linkError;
    return null;
  }

  async function performSend() {
    const error = validate();
    if (error) {
      setFormError(error);
      setConfirmOpen(false);
      return;
    }

    setSending(true);
    setFormError(null);
    try {
      const result = await api.adminSendNotification({
        audience,
        userIds:
          audience === "GLOBAL"
            ? undefined
            : recipients.map((recipient) => recipient.id),
        category,
        title: title.trim(),
        body: body.trim(),
        linkUrl: linkUrl.trim() || undefined,
        dedupeKey,
        confirmGlobal: audience === "GLOBAL" ? true : undefined,
      });

      toast(
        result.duplicate
          ? "Este envio já havia sido processado — nenhum novo disparo foi feito."
          : `Notificação enviada para ${result.recipientCount} jogador${
              result.recipientCount === 1 ? "" : "es"
            }.`,
        "success",
      );
      setSentInfo({
        count: result.recipientCount,
        duplicate: result.duplicate,
      });
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setLinkUrl("");
      setRecipients([]);
      setSearch("");
      setResults([]);
      setDedupeKey(createDedupeKey());
      onSent();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar a notificação.";
      setFormError(message);
      toast(message, "error");
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSentInfo(null);
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    if (audience === "GLOBAL") {
      setConfirmOpen(true);
      return;
    }
    void performSend();
  }

  const audienceCount =
    audience === "GLOBAL" ? globalCount : recipients.length;

  const sendLabel = sending
    ? "Enviando..."
    : audience === "GLOBAL"
      ? "Enviar para toda a comunidade"
      : audience === "SINGLE"
        ? "Enviar para 1 jogador"
        : `Enviar para ${recipients.length} jogador${
            recipients.length === 1 ? "" : "es"
          }`;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
          <div className="space-y-6">
            {/* 01 — Destinatários */}
            <section className="admin-card p-4" aria-labelledby="destinatarios">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id="destinatarios"
                  className="font-display text-display-lg text-snow"
                >
                  <span className="mr-2 font-mono text-caption text-ice/70">
                    01
                  </span>
                  Destinatários
                </h2>
                <span className="font-mono text-caption text-mist">
                  {audience === "GLOBAL"
                    ? globalCountError
                      ? "contagem indisponível"
                      : globalCount === null
                        ? "calculando..."
                        : `${globalCount} jogadores`
                    : `${recipients.length}/${MAX_SELECTED}`}
                </span>
              </div>

              <fieldset className="mt-3">
                <legend className="sr-only">Público do comunicado</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {AUDIENCES.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={audience === option.key}
                      onClick={() => changeAudience(option.key)}
                      className={`min-h-16 border px-3 py-2 text-left transition-colors ${
                        audience === option.key
                          ? "border-ice/60 bg-ice/10"
                          : "border-hairline bg-panel hover:border-ice/30"
                      }`}
                    >
                      <span className="block text-body-sm font-medium text-snow">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-caption text-mist">
                        {option.key === "GLOBAL" && globalCount !== null
                          ? `${globalCount} jogadores`
                          : option.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {audience !== "GLOBAL" && (
                <div className="mt-4">
                  <label
                    htmlFor="recipient-search"
                    className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist"
                  >
                    Buscar jogador
                  </label>
                  <SearchField
                    id="recipient-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome, @usuário, e-mail ou id"
                    autoComplete="off"
                    aria-describedby="recipient-search-hint"
                  />
                  <p
                    id="recipient-search-hint"
                    className="mt-1 text-caption text-mist-soft"
                  >
                    Digite ao menos 2 caracteres.{" "}
                    {audience === "SINGLE"
                      ? "Selecionar outro jogador substitui o atual."
                      : "Marque quantos precisar."}
                  </p>

                  <div aria-live="polite" className="mt-2">
                    {searching ? (
                      <p className="text-body-sm text-mist">Buscando...</p>
                    ) : search.trim().length >= 2 && results.length === 0 ? (
                      <p className="text-body-sm text-mist">
                        Nenhum jogador encontrado para “{search.trim()}”.
                      </p>
                    ) : null}
                  </div>

                  {results.length > 0 && (
                    <ul className="mt-2 max-h-64 divide-y divide-hairline overflow-y-auto border border-hairline">
                      {results.map((user) => {
                        const selected = selectedIds.has(user.id);
                        return (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => toggleRecipient(user)}
                              aria-pressed={selected}
                              className={`flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                                selected
                                  ? "bg-ice/10"
                                  : "bg-panel hover:bg-slate"
                              }`}
                            >
                              <Avatar
                                name={displayName(user)}
                                src={user.avatar}
                                size={32}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-body-sm text-snow">
                                  {displayName(user)}
                                </span>
                                <span className="block truncate font-mono text-caption text-mist">
                                  {user.userName
                                    ? `@${user.userName}`
                                    : user.id.slice(0, 8)}
                                </span>
                              </span>
                              <span
                                className={`badge ${
                                  selected ? "badge-ice" : "badge-muted"
                                }`}
                              >
                                {selected ? "Selecionado" : "Selecionar"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {recipients.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-mono text-caption uppercase tracking-wider text-mist">
                          Selecionados
                        </h3>
                        <button
                          type="button"
                          onClick={() => setRecipients([])}
                          className="btn-ghost min-h-11 px-3 text-caption"
                        >
                          Limpar seleção
                        </button>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {recipients.map((user) => (
                          <li
                            key={user.id}
                            className="flex items-center gap-2 border border-hairline bg-panel px-2 py-1.5"
                          >
                            <Avatar
                              name={displayName(user)}
                              src={user.avatar}
                              size={28}
                            />
                            <span className="min-w-0 flex-1 truncate text-body-sm text-snow">
                              {displayName(user)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRecipient(user)}
                              aria-label={`Remover ${displayName(user)} dos destinatários`}
                              className="flex h-11 w-11 items-center justify-center text-mist transition-colors hover:text-signal"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M3 3l8 8M11 3l-8 8"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {audience === "GLOBAL" && (
                <p
                  className="mt-3 border-l-2 border-signal/50 pl-3 text-body-sm text-mist"
                  role="note"
                >
                  O envio global atinge{" "}
                  <strong className="text-snow">
                    {globalCount ?? "todos os"}
                  </strong>{" "}
                  jogadores cadastrados. Você verá uma confirmação com a
                  contagem antes do disparo.
                </p>
              )}
            </section>

            {/* 02 — Categoria */}
            <section className="admin-card p-4" aria-labelledby="categoria">
              <h2
                id="categoria"
                className="font-display text-display-lg text-snow"
              >
                <span className="mr-2 font-mono text-caption text-ice/70">02</span>
                Categoria
              </h2>
              <fieldset className="mt-3">
                <legend className="sr-only">Finalidade do comunicado</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {NOTIFICATION_CATEGORIES.map((option) => {
                    const selected = category === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCategory(option.key)}
                        className={`flex min-h-16 items-start gap-3 border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-ice/60 bg-ice/10"
                            : "border-hairline bg-panel hover:border-ice/30"
                        }`}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center border ${option.chipClass}`}
                        >
                          <NotificationCategoryIcon
                            category={option.key}
                            className="h-4 w-4"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-body-sm font-medium text-snow">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-caption text-mist">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            {/* 03 — Conteúdo */}
            <section className="admin-card p-4" aria-labelledby="conteudo">
              <h2
                id="conteudo"
                className="font-display text-display-lg text-snow"
              >
                <span className="mr-2 font-mono text-caption text-ice/70">03</span>
                Conteúdo
              </h2>

              <div className="mt-3 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor="notification-title"
                      className="font-mono text-caption uppercase tracking-wider text-mist"
                    >
                      Título
                    </label>
                    <span
                      className="font-mono text-caption text-mist-soft"
                      aria-hidden="true"
                    >
                      {title.length}/{MAX_TITLE}
                    </span>
                  </div>
                  <input
                    id="notification-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={MAX_TITLE}
                    required
                    minLength={3}
                    placeholder="Ex.: Obrigado por ajudar a melhorar o AnimesIce"
                    className="field mt-1.5 w-full"
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor="notification-body"
                      className="font-mono text-caption uppercase tracking-wider text-mist"
                    >
                      Mensagem
                    </label>
                    <span
                      className="font-mono text-caption text-mist-soft"
                      aria-hidden="true"
                    >
                      {body.length}/{MAX_BODY}
                    </span>
                  </div>
                  <textarea
                    id="notification-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={MAX_BODY}
                    required
                    rows={6}
                    placeholder="Escreva a mensagem que o jogador verá no sino de notificações."
                    className="field mt-1.5 w-full resize-y"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notification-link"
                    className="font-mono text-caption uppercase tracking-wider text-mist"
                  >
                    Link interno <span className="text-mist-soft">(opcional)</span>
                  </label>
                  <input
                    id="notification-link"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="/gacha"
                    maxLength={300}
                    aria-invalid={Boolean(linkError)}
                    aria-describedby="notification-link-hint"
                    className="field mt-1.5 w-full"
                  />
                  <p
                    id="notification-link-hint"
                    className={`mt-1 text-caption ${
                      linkError ? "text-signal" : "text-mist-soft"
                    }`}
                  >
                    {linkError ??
                      "Use apenas caminhos do próprio site, iniciados por /."}
                  </p>
                </div>
              </div>
            </section>

            <div className="admin-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-body-sm text-mist">
                  <span className="font-mono text-caption uppercase tracking-wider text-mist-soft">
                    Envio para{" "}
                  </span>
                  {NOTIFICATION_AUDIENCE_LABELS[audience]}
                  {audienceCount !== null && audience !== "GLOBAL"
                    ? ` · ${audienceCount}`
                    : audience === "GLOBAL" && audienceCount !== null
                      ? ` · ${audienceCount} jogadores`
                      : ""}
                </p>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-ice min-h-11 disabled:opacity-50"
                >
                  {sendLabel}
                </button>
              </div>

              <div aria-live="polite" className="mt-3">
                {formError && (
                  <p
                    role="alert"
                    className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
                  >
                    {formError}
                  </p>
                )}
                {sentInfo && !formError && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                    <span>
                      {sentInfo.duplicate
                        ? "Envio já processado anteriormente; nada foi duplicado."
                        : `Comunicado entregue a ${sentInfo.count} jogador${
                            sentInfo.count === 1 ? "" : "es"
                          }.`}
                    </span>
                    <button
                      type="button"
                      onClick={onViewHistory}
                      className="btn-ghost min-h-11 px-3"
                    >
                      Ver histórico
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-4">
            <NotificationPreview
              category={category}
              title={title}
              body={body}
              linkUrl={linkUrl}
              audience={audience}
              recipientCount={recipients.length}
            />
          </aside>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar envio global"
        confirmLabel="Confirmar e enviar"
        busyLabel="Enviando..."
        busy={sending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performSend()}
      >
        <p className="text-body-md text-snow">
          Este comunicado será entregue a{" "}
          <strong className="text-ice">
            {globalCount ?? "todos os"} jogadores
          </strong>{" "}
          agora.
        </p>
        <div className="mt-3 border border-hairline bg-ink p-3">
          <p className="font-mono text-caption uppercase tracking-wider text-mist">
            {NOTIFICATION_CATEGORIES.find((item) => item.key === category)?.label}
          </p>
          <p className="mt-1 text-body-sm font-medium text-ice">{title}</p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-caption text-mist">
            {body}
          </p>
        </div>
        <p className="mt-3 text-body-sm text-mist">
          A entrega em massa é processada em lotes. Confira o público e o texto
          antes de continuar — não é possível cancelar após o envio.
        </p>
      </ConfirmDialog>
    </>
  );
}
