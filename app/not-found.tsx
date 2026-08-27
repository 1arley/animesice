import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center">
      <div className="flex w-full flex-col items-center justify-center gap-6 px-6 md:flex-row md:gap-8 lg:gap-24 md:px-0">
        <div>
          <Image
            priority
            loading="eager"
            quality={100}
            src="/images/animesice-mascot.svg"
            width={200}
            height={350}
            alt="AnimesIce - mascote"
            style={{ width: "auto", height: "auto" }}
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-8 md:gap-28">
          <div className="flex flex-col gap-6 md:gap-12">
            <div className="flex flex-col justify-center gap-2">
              <h1 className="font-display text-display-xl md:text-display-2xl text-center md:text-left text-snow">Página não encontrada</h1>
              <p className="text-body-sm md:text-body text-mist">Erro 404 — Página não encontrada</p>
            </div>
            <p className="max-w-[29rem] text-body text-mist">Desculpe! O conteúdo que você procura pode ter sido removido, mas novas oportunidades sempre brotam. Que tal explorar nosso site e ver o que pode florescer para você?</p>
          </div>
          <div className="flex w-full flex-col items-center justify-center gap-7 md:flex-row">
            <Link
              className="btn-ice w-60 min-h-11 inline-flex items-center justify-center whitespace-nowrap"
              href="/"
            >
              Voltar à prateleira
            </Link>
          </div>
        </div>
      </div>
      <footer className="mt-auto w-full py-4 flex flex-col items-center space-y-2">
        <hr className="w-64 border-hairline" />
        <p className="text-caption text-mist" suppressHydrationWarning>
          © {new Date().getFullYear()}{" "}
          <Link className="underline text-ice hover:opacity-70" href="/">
            AnimesIce
          </Link>
          . Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
