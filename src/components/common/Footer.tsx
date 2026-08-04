export interface FooterLink {
  href: string;
  title: string;
  className?: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: "Descubra mais",
    links: [
      { href: "/", title: "Home", className: "parceiro" },
      { href: "/admin", title: "Painel admin", className: "parceiro" },
      { href: "/login", title: "Entrar", className: "parceiro" },
      { href: "/register", title: "Registrar", className: "parceiro" }
    ]
  },
  {
    title: "Recursos",
    links: [
      { href: "https://jikan.moe", title: "Jikan API", className: "parceiro" },
      { href: "https://myanimelist.net", title: "MyAnimeList", className: "parceiro" },
      { href: "#", title: "—", className: "parceiro" },
      { href: "#", title: "—", className: "parceiro" },
      { href: "#", title: "—", className: "parceiro" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="page-footer font-small teal mt-4 bgFooter">
      <div className="container">
        <div className="row d-flex divBgFooter">
          <div className="col-md-12 text-white small divParceiros">
            <div className="parceiros mt-4">
              <h4>Descubra mais</h4>
              <div className="divParceiro pt-4">
                <ul style={{ paddingLeft: 0, textAlign: "left", listStyle: "none" }}>
                  {footerSections[0].links.map((link, index) => (
                    <li key={index} className="pb-2">
                      <img className="mr-1 pb-1" alt="" width="10" height="12" src="/assets/img/icons/setaDR.png" />
                      <a className={link.className || "parceiro"} href={link.href} target="_blank">{link.title}</a>
                    </li>
                  ))}
                </ul>
                <ul style={{ paddingLeft: 40, textAlign: "left", listStyle: "none" }}>
                  {footerSections[1].links.map((link, index) => (
                    <li key={index} className="pb-2">
                      <img className="mr-1 pb-1" alt="" width="10" height="12" src="/assets/img/icons/setaDR.png" />
                      <a className={link.className || "parceiro"} href={link.href} target="_blank">{link.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="divCopy px-2 px-sm-0 mt-4 mt-md-0 col-12">
              © 2026 AnimesIce - Todos os Direitos Reservados -
              <a style={{ textDecoration: "underline" }} href="#">Política de Privacidade</a>
              -
              <a style={{ textDecoration: "underline" }} href="#">DMCA</a>
            </div>
            <p className="text-center mt-1 mb-1 mx-2">Este site não hospeda nenhum vídeo em seu servidor. Todo conteúdo é provido de terceiros não afiliados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
