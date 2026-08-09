type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface SectionLabelProps {
  level?: HeadingLevel;
  className?: string;
  id?: string;
  children: React.ReactNode;
}

/**
 * SectionLabel — etiqueta visual de seção da prateleira.
 *
 * Polimórfica (level=1|2|3|4|5|6). Default = h2: a página já tem um único
 * h1 (título/wordmark), seções viram h2, cards viram h3. Permite encaixar a
 * etiqueta na hierarquia semântica sem mexer no visual (.shelf-label).
 */
export function SectionLabel({
  level = 2,
  className,
  id,
  children,
}: SectionLabelProps) {
  switch (level) {
    case 1:
      return <h1 id={id} className={`shelf-label ${className ?? ""}`}>{children}</h1>;
    case 2:
      return <h2 id={id} className={`shelf-label ${className ?? ""}`}>{children}</h2>;
    case 3:
      return <h3 id={id} className={`shelf-label ${className ?? ""}`}>{children}</h3>;
    case 4:
      return <h4 id={id} className={`shelf-label ${className ?? ""}`}>{children}</h4>;
    case 5:
      return <h5 id={id} className={`shelf-label ${className ?? ""}`}>{children}</h5>;
    default:
      return <h6 id={id} className={`shelf-label ${className ?? ""}`}>{children}</h6>;
  }
}
