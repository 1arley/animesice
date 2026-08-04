export interface NavLink {
  href: string;
  title: string;
  target?: string;
}

export interface NavItem {
  title: string;
  links: NavLink[];
}

// Links internos. Rotas de gênero/temporada ainda não implementadas (#) —
// melhor que apontar para um domínio externo inexistente (animesice.io).
const navItems: NavItem[] = [
  {
    title: "Animes",
    links: [
      { href: "/", title: "Home" },
      { href: "/admin", title: "Painel admin" },
    ]
  },
  {
    title: "Conta",
    links: [
      { href: "/login", title: "Entrar" },
      { href: "/register", title: "Registrar" },
      { href: "https://myanimelist.net", title: "Calendário (MAL)", target: "_blank" }
    ]
  },
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
      {navItems.map((item) => (
        <div key={item.title} style={{ position: "relative" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "inherit",
              fontFamily: "inherit",
            }}
          >
            {item.title}
            <svg
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.6 9.6 0 0 0 7.556 8a9.6 9.6 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.6 10.6 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.6 9.6 0 0 0 6.444 8a9.6 9.6 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5" />
            </svg>
          </button>
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              backgroundColor: "white",
              border: "1px solid #e5e5e5",
              borderRadius: 4,
              padding: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "block",
              zIndex: 1000,
            }}
            className="dropdown-menu"
          >            {item.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.target || "_self"}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  color: "#2563eb",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
                className="dropdown-item"
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
