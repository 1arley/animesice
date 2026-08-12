import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt gerado em runtime. Permite crawl de páginas públicas e
 * bloqueia rotas privadas (conta, admin, API, salas de watch-party).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/me",
          "/perfil",
          "/admin",
          "/settings",
          "/room",
          "/notificacoes",
          "/comunidade/pedidos",
          "/api",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
