# [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)


### Features

* **admin:** modularize admin pages and expand management api ([791c006](https://github.com/1arley/animesice/commit/791c006084b156338f6fa21752db7cc1c7609f88))

## [1.0.1](https://github.com/1arley/animesice/compare/v1.0.0...v1.0.1) (2026-08-12)


### Bug Fixes

* **api:** normalize NEXT_PUBLIC_API_URL com o sufixo /api ([6e36371](https://github.com/1arley/animesice/commit/6e363717e1f04d8ac431e9d2a75a49ace83ff530))

# 1.0.0 (2026-08-12)


### Bug Fixes

* **ads:** re-enable Monetag MultiTag script ([e3666c4](https://github.com/1arley/animesice/commit/e3666c45ab78f0b7237bef4f64631014a6a07bc2))
* **ads:** swap Monetag tag to zone 11528359 (al5sm.com) ([b7f4775](https://github.com/1arley/animesice/commit/b7f47753644d739291e09c446e423a2be622fa28))
* **ads:** update Monetag sw.js zoneId to 11519348 ([323324e](https://github.com/1arley/animesice/commit/323324efced2c73fa9217a3bab707b9bb45c2f66))
* **ads:** use raw <script> tag instead of next/script for AdSense verification ([fc8cd8e](https://github.com/1arley/animesice/commit/fc8cd8e13da49ad0541fc4a65b093dd32143d442))
* **anime:** skip next-episode fetch when episodeCount is known ([4bd6e00](https://github.com/1arley/animesice/commit/4bd6e00a89ecb16c053343af1a2ba7d5ed39d312))
* **api:** refresh-token race (single in-flight queue) ([718afe7](https://github.com/1arley/animesice/commit/718afe72abd99fffceb51277f14716de56331339))
* **api:** skip refresh attempt when no session cookie ([21305e5](https://github.com/1arley/animesice/commit/21305e5dbbe64b62ffe66c32a3bc8489b69d8839))
* **auth:** cookie-based session, refreshUser, remove localStorage ([50c5733](https://github.com/1arley/animesice/commit/50c573349b3d149f7fd4e96c114cc243ad8f646b))
* **auth:** remove token localStorage, match AuthResponse type ([7426589](https://github.com/1arley/animesice/commit/7426589decbf3c8e79238b97f131517ffb3ae8e7))
* **auth:** send password on email change and honor ?next= after login ([bc5ddd5](https://github.com/1arley/animesice/commit/bc5ddd5a1694351e47423390f4123487f69c7a5d))
* **csp:** allow challenges.cloudflare.com for Turnstile captcha ([3bbce75](https://github.com/1arley/animesice/commit/3bbce75bc0a5bc753b3ffc1c9ad6bf440351b910))
* **csp:** permitir domínios anilist.co em remotePatterns e img-src ([9e5dc00](https://github.com/1arley/animesice/commit/9e5dc008699f40eddc9afcc93c85dd384310103f))
* **csp:** permitir media-src p/ player video + host de avatares + ads iframe ([dffd530](https://github.com/1arley/animesice/commit/dffd5300e5b13a9e5d0ad63e1a7c9857382ef080))
* **lib:** export safeImageSrc + updated api (needed for AdSense build) ([844b3a7](https://github.com/1arley/animesice/commit/844b3a7d254e0e002555c01071590a657088646d))
* **player:** remove external embed support, internal proxy only ([ec3e637](https://github.com/1arley/animesice/commit/ec3e63774151c931785994c9f4648a3d4e09efd6))
* **security:** bump Next.js 15.1.7 → 15.5.22 ([34b54e3](https://github.com/1arley/animesice/commit/34b54e35fa446393d43d433b3a5871de066bf169))
* **web:** 500 no /buscar ao filtrar (q duplicado -> searchParams array) ([3b30ff8](https://github.com/1arley/animesice/commit/3b30ff8cdae55c7ff5c1ce73f4316763732bc999))
* **web:** add force-dynamic to all server pages, fix 404 on anime detail ([7e4bb5d](https://github.com/1arley/animesice/commit/7e4bb5d6759cee44ed043d7e3dd499512b644016))
* **web:** add INTERNAL_API_URL env + timeout for Vercel server-side fetch ([5845846](https://github.com/1arley/animesice/commit/584584622e8ba39c10d22b9dad50695e1eff56cd))
* **web:** add Turnstile captcha to register page ([5dd6df1](https://github.com/1arley/animesice/commit/5dd6df1c4603e70859c3f580b8920ed65910a327))
* **web:** allow supabase host in next/image remotePatterns ([cece5a0](https://github.com/1arley/animesice/commit/cece5a09de7fbe582baca9326a496d2dc1ab1f49))
* **web:** allow wss:// in CSP connect-src for Socket.IO watch party ([78b8ec6](https://github.com/1arley/animesice/commit/78b8ec635510f076ca05b28ce5fe3fbff5d38a85))
* **web:** force home page dynamic (SSR) to prevent empty SSG cache ([e48d681](https://github.com/1arley/animesice/commit/e48d681613305e0e2daee25d3cde30ecf2d3a4fa))
* **web:** normalize async params in perfil page and use renamed CommentRow ([e6ae96a](https://github.com/1arley/animesice/commit/e6ae96a3fbe3e21bc24dcbf2369ddf71c268c290))
* **web:** remove async/defer from Turnstile script tag ([dd7bf3b](https://github.com/1arley/animesice/commit/dd7bf3b0d93992bf038b1c96052a8a0573b2537d))
* **web:** remove auto-login after register, add email verification page ([52b4ee5](https://github.com/1arley/animesice/commit/52b4ee53ca95e845b1544c26983843ee8c7439bf))
* **web:** remove insecure role-cookie auth gate from middleware.ts ([e902981](https://github.com/1arley/animesice/commit/e902981b5cf1e28433a9f5b649b468dd25ad9e15))
* **web:** replace next revalidate with cache:no-store in serverFetchJson ([8b0629f](https://github.com/1arley/animesice/commit/8b0629ff4ca7f0b39e4be42ec3c7598f1a3e3045))
* **web:** restore original serverFetchJson — retry/timeout broke Vercel SSR ([e5953a2](https://github.com/1arley/animesice/commit/e5953a2e733b25e696beeccc66e1d6de8ff2db19))
* **web:** set turnstile script async=false to silence ready() warning ([feb6be2](https://github.com/1arley/animesice/commit/feb6be2f1baf7c8f1cb11ceb785e8a2180d5b1bb))
* **web:** surface comment/reply errors, sync like count, rename CommentItem to CommentRow ([e2d0947](https://github.com/1arley/animesice/commit/e2d09473e1930e10e0e9afb53339f3876847e80e))
* **web:** use cache:no-store instead of revalidate to prevent stale 404 cache ([3c126ee](https://github.com/1arley/animesice/commit/3c126ee21297f445363ecd0b320bee2498643742))
* **web:** use production API URL fallback and allow meusanimes.blog images ([fe68af1](https://github.com/1arley/animesice/commit/fe68af1e2d3149a69a755d364869aa0eef831fa7))
* **web:** use Turnstile onload callback instead of async/defer ([bcaf8dd](https://github.com/1arley/animesice/commit/bcaf8ddfe4cb51ca6dedd58ac6693dbf37d0f294))
* **web:** use() async params, abort stale requests, guard source races in watch page ([ce38c95](https://github.com/1arley/animesice/commit/ce38c95d656b07b688fa6aa9c84dd6eb80e3b47f))


### Features

* add ko-fi link for supporters ([99978d0](https://github.com/1arley/animesice/commit/99978d0abf78f8c6e5af1ff02361db43ed454694))
* add new common components: SectionLabel and ThirdPartyScripts ([06ac03a](https://github.com/1arley/animesice/commit/06ac03a9a4090c87583e9bad3dd56b7930c3a1f7))
* **admin:** redesign admin + create anime + create episode + delete ([67cb88e](https://github.com/1arley/animesice/commit/67cb88e48adfc6bc7efb49eb1c46e79ddb430173))
* **admin:** role gate, admin/edit and redesigned admin pages ([1ac0ce0](https://github.com/1arley/animesice/commit/1ac0ce02908f8a86acf1f8dced0252d96ab40393))
* **ads:** add Monetag MultiTag script to head ([ec0900e](https://github.com/1arley/animesice/commit/ec0900e9411a1dce628e9ea385fa597c1fa11760))
* **ads:** add Monetag verification meta tag and service worker ([e679d31](https://github.com/1arley/animesice/commit/e679d31c3b858382518dfd95d37ee90a7767f271))
* **ads:** integrate Google AdSense (ca-pub-2885915887212760) ([0e0c63b](https://github.com/1arley/animesice/commit/0e0c63b7508daff757b8e77e037537764c33866b))
* **anime:** add rating, favorite, related list and comments to detail page ([8b348d0](https://github.com/1arley/animesice/commit/8b348d09f636e39aeedc569a8b99fc4ec3d6e85a))
* **api:** add comments, ratings, favorites, history, notification and profile endpoints ([cf694af](https://github.com/1arley/animesice/commit/cf694af8e3f2e17ca625f60cbb1d6f93f8c13466))
* **api:** streamSource, auth management, admin delete endpoints ([eb873fe](https://github.com/1arley/animesice/commit/eb873feb85f124d6df0ad8d4c31a010a0755b0cc))
* **auth:** userName + avatar UI em todo o site ([e198a55](https://github.com/1arley/animesice/commit/e198a55262f2d2b36a84aac1c34118c7e2ddc838))
* **components:** Header + Wordmark — autoral branding ([4ea1517](https://github.com/1arley/animesice/commit/4ea1517e4d75a578f833bf36ec2425a7214a5d52))
* **components:** redesign cards, nav, footer, auth buttons ([6d7af68](https://github.com/1arley/animesice/commit/6d7af680ab968294acad436fb100b7663a889474))
* comunidade, perfil social e motion (React Bits) no tema ([ae839e1](https://github.com/1arley/animesice/commit/ae839e12fe0bb7c19937c1fa1bb9bb45a27037c7))
* **design:** design system autoral — tokens, fonts, base styles ([f2c5f85](https://github.com/1arley/animesice/commit/f2c5f858b7adfe8657b370058260aade4114ce96))
* **home:** add continue watching rail ([304e0c4](https://github.com/1arley/animesice/commit/304e0c4868e524d7b10060e5ac1923665094acd8))
* HomeHero em carrossel rotativo ([909f31c](https://github.com/1arley/animesice/commit/909f31c4d9355325a75eadbf00f74456b7f906e0))
* **pages:** add library, notifications and profile pages ([3b334bf](https://github.com/1arley/animesice/commit/3b334bfecc7556d03157ed7da9cf13ca73688227))
* **pages:** redesign home, anime detail, watch, login, register ([1dfdd3c](https://github.com/1arley/animesice/commit/1dfdd3c0b4c1efc16d9aad1bc6467d7724d558ce))
* **player:** render YouTube embed sources as iframe ([fd692f3](https://github.com/1arley/animesice/commit/fd692f3d3b6d8a426835211b1e7c8209190c8a22))
* **player:** track watch progress and increment episode views ([aaa1016](https://github.com/1arley/animesice/commit/aaa1016c7d7d067a458275d1cebb662158e2b708))
* refactor UI components, admin pages, and improve navigation ([9e8be56](https://github.com/1arley/animesice/commit/9e8be563fec2d9e819f2b04e75a048ac1c34e764))
* **seo:** sitemap, robots e OG image dinamico por anime ([3cd6d52](https://github.com/1arley/animesice/commit/3cd6d525af58ea0e5ca484edb27f7b790f5ec8eb))
* **settings:** account settings + email confirmation page ([3fdbeae](https://github.com/1arley/animesice/commit/3fdbeaeaf37da3a935e47f528f5ca052998f98b8))
* **types:** add social, rating, watch-history and notification contracts ([d657a0d](https://github.com/1arley/animesice/commit/d657a0d165b263ed986ab09697ce5c0bfca7ba7e))
* **ui:** add comment, rating, favorite, chat, bell and continue-watching components ([900fd2a](https://github.com/1arley/animesice/commit/900fd2a5e4385b7bfbd2b3f4552e7cf295ee2b12))
* **ui:** add notification bell to header ([b778042](https://github.com/1arley/animesice/commit/b778042e78dac8724108d14dad7ed06a147fdac9))
* **ui:** header search, admin-aware nav, legal pages and 404 polish ([8b10bfc](https://github.com/1arley/animesice/commit/8b10bfc06d932dd47719bb403dd70c0e86e7897e))
* **ui:** high-res hero banner, wordmark hover glow, room source error fix ([4425804](https://github.com/1arley/animesice/commit/4425804879c593749ed7002583bfb881e0a1e3a2)), closes [hi#res](https://github.com/hi/issues/res)
* **ui:** home hero banner, card micro-interactions, ko-fi in header and room source loading ([7e532ec](https://github.com/1arley/animesice/commit/7e532ecd5bc22b6567650bc91397a9f7f407cdde))
* update auth context and common components ([73a0719](https://github.com/1arley/animesice/commit/73a07190a31374cf6b2e98008339e3e563a2f6b6))
* update page layout and configuration ([94912c1](https://github.com/1arley/animesice/commit/94912c1cf562cfc8d4282445cf1b6ae94961400e))
* **watch:** add episode chat and comments to watch page ([502e163](https://github.com/1arley/animesice/commit/502e1632846e96bd8f2c54a8d0b270137bb5dcea))
* **web:** add /me page and expand public profile (tabs, pagination, report modal, reuse comment component) ([22b421f](https://github.com/1arley/animesice/commit/22b421f2cf7fa960d1ab4a54569ba347f9551b5c))
* **web:** add content pages (calendar, genres, top, rooms, requests, feedback, moderation) and expand API client ([0ba397a](https://github.com/1arley/animesice/commit/0ba397af04081e081b9baa9eebc69233f941497f))
* **web:** friendly episode loading state with reload hint after 15s ([8b05738](https://github.com/1arley/animesice/commit/8b05738d94fba9f2a0dabc91688135f9e59fa6ed))
* **web:** redesign 'sinal da madrugada' + remove CRT scan ([aa5d8f0](https://github.com/1arley/animesice/commit/aa5d8f0b0b2e2412dad4e869452c39d1b4c4d21b))
* **web:** redesign public profile as a social identity page ([c5c72c8](https://github.com/1arley/animesice/commit/c5c72c8f8c2b3ee7e01810840c8a0826bec3f3c7))
* **web:** render Turnstile widget on login and submit token ([b9e40a8](https://github.com/1arley/animesice/commit/b9e40a8b44b22b587655f54917c64c57c133e56a))
* **web:** unify public profiles on /users with canonical URLs and typed API contract ([f2e4683](https://github.com/1arley/animesice/commit/f2e46832498c1d1b5e4166c6418237b60744f141))


### Performance Improvements

* **web:** enable ISR revalidate=60 and next/image on detail and list pages ([3334750](https://github.com/1arley/animesice/commit/3334750f7637f9637c0381f12022aa808d3569b4))


### Reverts

* Revert "fix(api): skip refresh attempt when no session cookie" ([2be8375](https://github.com/1arley/animesice/commit/2be83755be1a098833dbace6df9d831d5154c803))
