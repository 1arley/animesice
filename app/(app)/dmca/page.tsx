export const metadata = {
  title: "DMCA / Contato",
  description: "Canal para notificações de direitos autorais e contato.",
};

export default function DmcaPage() {
  return (
    <article className="mx-auto max-w-shelf px-4 py-8" style={{ maxWidth: 720 }}>
          <h1 className="font-display text-display-xl text-snow">DMCA & Contato</h1>

          <div className="mt-6 space-y-4 text-body text-mist">
            <p>
              A AnimesIce é uma <strong>prateleira de catálogo</strong>: não
              hospedamos arquivos de vídeo nem controlamos diretamente o conteúdo
              exibido. Todo streaming referenciado é provido por terceiros não
              afiliados. Qualquer link embedado aponta para fontes externas e é
              removido mediante notificação válida.
            </p>

            <h2 className="font-display text-display-lg text-snow">
              Notificação de direitos autorais
            </h2>
            <p>
              Se você é titular ou representante e acredita que um título viola
              seus direitos, envie mensagem contendo:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identificação da obra protegida;</li>
              <li>URL exata do conteúdo infrator (ex.: /animes/[slug]/[numero]);</li>
              <li>Seus dados de contato (nome, email, telefone);</li>
              <li>Declaração de boa-fé e assinatura (física ou eletrônica).</li>
            </ul>

            <h2 className="font-display text-display-lg text-snow">Canal</h2>
            <p>
              Email: <code className="text-mist">dmca@animesice.local</code>
              <br />
              Resposta em até 5 dias úteis. Conteúdo claramente infrator será
              removido do catálogo imediatamente, antes de contestação.
            </p>

            <p className="text-caption">
              Falsas notificações estão sujeitas a penalidades civis (17 USC §512
              / Lei 9.610/98). Reclamações fraudulentas serão contestadas.
            </p>
          </div>
    </article>
  );
}
