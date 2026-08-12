import { PageTitle } from "@/components/ui/PageTitle";

export default function RegrasPage() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <PageTitle text="Regras da comunidade" badge="leia antes de participar" />

      <div className="max-w-2xl space-y-4 text-body text-mist">
        <section>
          <h2 className="mb-2 font-display text-body font-semibold text-ice">1. Respeito acima de tudo</h2>
          <p>Trate todos os membros com respeito. Não serão tolerados discursos de ódio, racismo, sexismo, homofobia ou qualquer forma de discriminação.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-body font-semibold text-ice">2. Sem spoilers não marcados</h2>
          <p>Use as tags de spoiler ao discutir episódios recentes. Não poste spoilers de anime/mangá em comentários de outros animes sem aviso.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-body font-semibold text-ice">3. Sem spam ou autopromoção</h2>
          <p>Não façam spam de links, não divulguem outros sites sem permissão, e não usem o chat/comentários para autopromoção.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-body font-semibold text-ice">4. Conteúdo proibido</h2>
          <p>Não poste conteúdo NSFW, ilegal, ou que viole direitos autorais. O site não hospeda vídeos — todo conteúdo é provido por terceiros.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-body font-semibold text-ice">5. Moderação</h2>
          <p>A equipe de moderação pode remover conteúdo, silenciar ou banir usuários que violem as regras. Denúncias podem ser feitas via botão &quot;denunciar&quot; em comentários e mensagens de chat.</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-body font-semibold text-ice">6. Divirta-se</h2>
          <p>O objetivo é celebrar anime juntos. Seja gentil, ajade novatos, e aproveite a comunidade!</p>
        </section>
      </div>
    </div>
  );
}
