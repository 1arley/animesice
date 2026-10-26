import type { ReactNode } from "react";

/**
 * Casca comum dos cartões de oferta do gacha (loja, mercado, cosméticos, cristais).
 * A faixa de arte é full-bleed e o corpo recebe o padding; os demais blocos
 * (legenda, título, preço, status e ações) são encaixes opcionais alinhados
 * à base, para que cartões de páginas diferentes usem a mesma anatomia.
 */
export type GachaOfferCardProps = {
  /** Elemento raiz dentro da grade. */
  as?: "li" | "div";
  /** Faixa superior sem padding interno (arte, capas de carta…). */
  artwork?: ReactNode;
  /** Linha de apoio sobre o título (tipo · raridade). */
  caption?: ReactNode;
  /** Coluna à direita da legenda (selos de equipado, desconto…). */
  captionAside?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Conteúdo extra entre a descrição e o rodapé. */
  children?: ReactNode;
  /** Destaque do rodapé: preço, BRL, contagem de cristais… */
  price?: ReactNode;
  /** Linhas auxiliares do rodapé (status, vendedor, expiração…). */
  notes?: ReactNode;
  /** Ações do cartão, alinhadas de baixo. */
  actions?: ReactNode;
  /** Cartão equipado/selecionado. */
  selected?: boolean;
  className?: string;
};

export function GachaOfferCard({
  as,
  artwork,
  caption,
  captionAside,
  title,
  description,
  children,
  price,
  notes,
  actions,
  selected = false,
  className = "",
}: GachaOfferCardProps) {
  const Tag = as ?? "div";
  return (
    <Tag
      className={`flex min-w-0 flex-col border bg-panel ${
        selected ? "border-ice/60" : "border-hairline"
      } ${className}`}
    >
      {artwork}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {(caption || captionAside) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
            {caption ?? <span aria-hidden="true" />}
            {captionAside}
          </div>
        )}
        {title && (
          <h3
            className={`break-words font-display text-xl text-snow ${
              caption || captionAside ? "mt-2" : ""
            }`}
          >
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-2 text-body-sm text-mist">{description}</p>
        )}
        {children}
        {(price || notes || actions) && (
          <div className="mt-auto pt-4">
            {price}
            {notes}
            {actions && <div className="mt-3">{actions}</div>}
          </div>
        )}
      </div>
    </Tag>
  );
}
