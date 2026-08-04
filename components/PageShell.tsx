import Link from "next/link";

const routes: Array<{ href: string; title: string }> = [
  {
    "href": "/",
    "title": "AnimeFire - Assistir animes online"
  }
];

export function SiteNav() {
  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        padding: 12,
        borderBottom: "1px solid #e5e5e5",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      {routes.map((r) => (
        <Link key={r.href} href={r.href} style={{ color: "#2563eb" }}>
          {r.title || r.href}
        </Link>
      ))}
    </nav>
  );
}
