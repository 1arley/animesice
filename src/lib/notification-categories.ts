import type {
  AdminNotificationAudience,
  AdminNotificationCategory,
} from "@/types";

export interface NotificationCategoryMeta {
  key: AdminNotificationCategory;
  label: string;
  description: string;
  /** Chip compacto usado em prévia, histórico e sino. */
  chipClass: string;
  /** Cor do ícone (o glifo herda currentColor). */
  iconClass: string;
}

export const NOTIFICATION_CATEGORIES: readonly NotificationCategoryMeta[] = [
  {
    key: "THANKS",
    label: "Agradecimento",
    description: "Reconhecimento por feedback ou contribuição.",
    chipClass: "border-ice/40 bg-ice-dim text-ice",
    iconClass: "text-ice",
  },
  {
    key: "ANNOUNCEMENT",
    label: "Aviso importante",
    description: "Informação crítica sobre o funcionamento do site.",
    chipClass: "border-signal/50 bg-signal-dim text-signal",
    iconClass: "text-signal",
  },
  {
    key: "UPDATE",
    label: "Atualização",
    description: "Novidades, melhorias e novas funcionalidades.",
    chipClass: "border-ice/30 bg-ice/5 text-ice-bright",
    iconClass: "text-ice-bright",
  },
  {
    key: "EVENT",
    label: "Evento e recompensa",
    description: "Temporadas, eventos e recompensas especiais.",
    chipClass: "border-blood/40 bg-blood-dim text-blood",
    iconClass: "text-blood",
  },
  {
    key: "COMPENSATION",
    label: "Compensação",
    description: "Créditos, itens ou correção por um problema.",
    chipClass: "border-ice/50 bg-ice-dim text-ice",
    iconClass: "text-ice",
  },
  {
    key: "GENERAL",
    label: "Comunicado geral",
    description: "Mensagem oficial para toda a comunidade.",
    chipClass: "border-hairline bg-panel-subtle text-snow",
    iconClass: "text-snow",
  },
  {
    key: "CUSTOM",
    label: "Personalizado",
    description: "Mensagem livre redigida pela administração.",
    chipClass: "border-hairline bg-transparent text-mist",
    iconClass: "text-mist",
  },
];

const CATEGORY_BY_KEY = new Map(
  NOTIFICATION_CATEGORIES.map((category) => [category.key, category]),
);

export function notificationCategoryMeta(
  category: AdminNotificationCategory | null | undefined,
): NotificationCategoryMeta | null {
  if (!category) return null;
  return CATEGORY_BY_KEY.get(category) ?? null;
}

export const NOTIFICATION_AUDIENCE_LABELS: Record<
  AdminNotificationAudience,
  string
> = {
  SINGLE: "Jogador individual",
  SELECTED: "Grupo selecionado",
  GLOBAL: "Toda a comunidade",
};
