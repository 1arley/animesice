"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de confirmação não encontrado na URL.");
      return;
    }

    api
      .confirmEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message || "Email alterado com sucesso.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Erro ao confirmar troca de email.");
      });
  }, [token]);

  return (
    <div className="border border-hairline bg-panel p-8 text-center">
      <h1 className="mb-4 font-display text-display-lg text-ink">
        Confirmação de email
      </h1>

      {status === "loading" && (
        <p className="text-body-sm text-mist">Confirmando...</p>
      )}

      {status === "success" && (
        <>
          <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
            {message}
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="btn-ice w-full justify-center"
          >
            Voltar para configurações
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
            {message}
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="btn-ghost w-full justify-center"
          >
            Voltar para configurações
          </button>
        </>
      )}
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <>
      <Header />
      <main id="body-content">
        <div className="mx-auto max-w-sm px-4 py-16">
          <Suspense
            fallback={
              <div className="border border-hairline bg-panel p-8 text-center">
                <p className="text-body-sm text-mist">Carregando...</p>
              </div>
            }
          >
            <ConfirmEmailContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
