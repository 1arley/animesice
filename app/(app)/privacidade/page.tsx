export const metadata = {
  title: "Política de Privacidade",
  description: "Como a AnimesIce coleta e trata dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-shelf px-4 py-8" style={{ maxWidth: 720 }}>
          <h1 className="font-display text-display-xl text-ink">
            Política de Privacidade
          </h1>
          <p className="mt-1 text-caption text-mist">Última atualização: 2026</p>

          <div className="prose-body mt-6 space-y-4 text-body text-mist">
            <p>
              A AnimesIce respeita sua privacidade. Este documento descreve quais
              dados coletamos, por quê, e como você pode controlar o uso.
            </p>

            <h2 className="font-display text-display-lg text-ink">Dados coletados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Conta</strong>: nome, email e senha (hash) fornecidos no
                cadastro. Usados para autenticação e recuperação de acesso.
              </li>
              <li>
                <strong>Sessão</strong>: cookie httpOnly + SameSite=Lax contendo o
                token de sessão. Nunca acessível via JavaScript.
              </li>
              <li>
                <strong>Tokens de confirmação</strong> enviados por email para
                validação de troca de email/senha — expiram em prazo curto.
              </li>
            </ul>

            <h2 className="font-display text-display-lg text-ink">
              O que não coletamos
            </h2>
            <p>
              Não utilizamos rastreadores de terceiros (Google Analytics, Meta
              Pixel, etc.), não vendemos dados e não cross-domain cookies.
            </p>

            <h2 className="font-display text-display-lg text-ink">
              Seus direitos (LGPD)
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acesso, correção ou apagamento dos seus dados.</li>
              <li>Revogação de consentimento a qualquer momento.</li>
              <li>Portabilidade dos dados fornecidos por você.</li>
            </ul>
            <p>
              Para exercer qualquer direito, escreva para o email indicado na
              página de DMCA. Respondemos em até 15 dias úteis.
            </p>
          </div>
    </article>
  );
}
