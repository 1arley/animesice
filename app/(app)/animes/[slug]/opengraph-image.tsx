import { ImageResponse } from "next/og";
import { serverFetchJson } from "@/lib/api-server";
import type { Anime } from "@/types";
import Image from "next/image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

/**
 * OG image dinâmica por anime. Fallback em estilo "terminal gelo" quando
 * a arte ou a fonte falham — nunca quebra o build por causa de uma imagem.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = await serverFetchJson<Anime>(`/anime/${slug}`);

  if (!anime) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #080C12, #0E141D)",
            color: "#38E8DA",
            fontFamily: "sans-serif",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          AnimesIce
        </div>
      ),
      { ...size },
    );
  }

  const art =
    anime.bannerImage && anime.bannerImage.startsWith("http")
      ? anime.bannerImage
      : anime.coverImage && anime.coverImage.startsWith("http")
        ? anime.coverImage
        : undefined;

  const title =
    anime.title.length > 60 ? anime.title.slice(0, 57) + "…" : anime.title;
  const meta = [
    anime.rating != null && anime.rating > 0
      ? `★ ${anime.rating.toFixed(2)}`
      : null,
    anime.year != null ? `${anime.year}` : null,
    anime.format ?? null,
    anime.audio === "DUBLADO" ? "Dublado" : "Legendado",
  ]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#080C12",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background art com overlay */}
        {art && (
          <Image
            src={art}
            alt=""
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              inset: 0,
              objectFit: "cover",
              opacity: 0.28,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(7,11,18,0.96) 0%, rgba(7,11,18,0.85) 45%, rgba(7,11,18,0.35) 100%)",
          }}
        />

        {/* Conteúdo */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 56,
            width: "100%",
          }}
        >
          <div
            style={{
            color: "#38E8DA",
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 16,
            }}
          >
            AnimesIce
          </div>

          <div
            style={{
              color: "#F1F5F9",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {meta && (
            <div
              style={{
                color: "#94A3B8",
                fontSize: 22,
                marginTop: 20,
                letterSpacing: 0.5,
              }}
            >
              {meta}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
