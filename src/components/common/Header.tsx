import { Wordmark } from "@/components/common/Wordmark";
import { AuthButtons } from "@/components/common/AuthButtons";

/**
 * Cabeçalho da prateleira: wordmark à esquerda, auth à direita,
 * hairline embaixo. Substitui o navbar Bootstrap crawado do animefire.
 */
export function Header() {
  return (
    <header className="border-b border-hairline bg-ink">
      <div className="mx-auto flex max-w-shelf items-center justify-between px-4 py-3">
        <Wordmark className="text-xl" />
        <AuthButtons />
      </div>
    </header>
  );
}
