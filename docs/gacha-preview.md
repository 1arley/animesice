# Preview local do gacha

O preview usa `docker-compose.preview.yml`, um Postgres novo e isolado. Ele não lê o `.env` da API nem conecta ao banco usado pelos outros Compose. O seed é local e determinístico: cria um anime, duas contas verificadas e uma carta para cada tier.

Os repositórios `animesice` e `animesice-back` precisam estar lado a lado em `animesice-stack/`.

Na raiz de `animesice`, suba o stack:

```bash
docker compose -f docker-compose.preview.yml up --build --wait
```

Abra [http://localhost:3000/admin/gacha/animacao](http://localhost:3000/admin/gacha/animacao) e entre com `admin@example.com` / `Admin123!`. Escolha qualquer uma das sete cartas de amostra e clique em **Abrir preview**. Essa tela mostra a animação sem consumir giros; o botão **Pular** também funciona.

Para testar o gacha completo, entre com `user@example.com` / `User123!`, abra `/gacha?debugRarity=lendaria` e clique em **Girar**. O parâmetro só troca o tier apresentado no frontend local; sorteio e probabilidades do backend permanecem os mesmos. Valores aceitos: `comum`, `incomum`, `rara`, `epica`, `lendaria`, `mitica` e `galactica`. Esses giros usam apenas o banco local.

A API fica em [http://localhost:3001/api](http://localhost:3001/api) e o Swagger em [http://localhost:3001/api/docs](http://localhost:3001/api/docs). Alterações no frontend entram por hot reload; para incorporar mudanças na API, execute `docker compose -f docker-compose.preview.yml up --build -d api`.

Para parar sem apagar o preview:

```bash
docker compose -f docker-compose.preview.yml down
```

O banco local fica no volume `preview_pgdata`. Só use `down -v` se quiser apagar os dados deste preview e começar de novo.
