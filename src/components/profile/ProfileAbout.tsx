import type { PublicUserProfile } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";

/**
 * ProfileAbout — identidade escrita: bio completa + links externos.
 * Usa somente o que existe no perfil; sem bio, estado vazio discreto.
 */
export function ProfileAbout({ profile }: { profile: PublicUserProfile }) {
  const malUrl = profile.myAnimeList
    ? `https://myanimelist.net/profile/${encodeURIComponent(profile.myAnimeList)}`
    : null;

  const hasContent = !!profile.bio || !!malUrl;

  if (!hasContent) {
    return (
      <section>
        <SectionLabel level={2}>Sobre</SectionLabel>
        <p className="text-body-sm text-mist/70">Sem descrição ainda.</p>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>Sobre</SectionLabel>
      {profile.bio && (
        <p className="whitespace-pre-line text-body text-mist">
          {profile.bio}
        </p>
      )}
      {malUrl && (
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-caption uppercase tracking-wider text-mist">
            Links
          </p>
          <a
            href={malUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-body-sm text-ice underline decoration-hairline underline-offset-4 transition-colors hover:text-snow"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M6 2H2v12h12v-4M10 2h4v4M14 2L7 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            MyAnimeList — {profile.myAnimeList}
          </a>
        </div>
      )}
    </section>
  );
}
