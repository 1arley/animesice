<!-- herdr-agent-team:start -->
## Agent Team

- By default, read `.agents/team/playbook.md` and `.agents/team/roles/leader.md` and adopt the leader role.
- An explicitly assigned member reads the playbook and its matching role file instead.
- Team coordination uses Herdr and its official `herdr` Skill. Project owner rules and user authorization always prevail.
<!-- herdr-agent-team:end -->

# Repository Guidelines

## Role and First Checks

Act as repository leader. Read relevant `SKILL.md` before work; required for UI work: `frontend-design`, `web-design-guidelines`, and `accessibility`. Use `grilling` for `$grill-me` requests. Read `.agents/team/playbook.md` and matching role file; use Herdr only when `HERDR_ENV=1` and user asks for coordination.

Inspect `git status`, existing diffs, route structure, and installed dependencies before editing. Preserve user changes. Prefer smallest working diff; reuse or delete before adding abstractions.

## Project Structure

- `app/`: Next.js App Router pages, layouts, aliases, and admin screens.
- `src/components/`: reusable React UI, including `gacha/` card and preview components.
- `src/lib/`, `src/types/`: API client, auth, utilities, and contracts.
- `e2e/`: Playwright journeys; `scripts/`: build checks.
- `../animesice-back/`: NestJS + Prisma API; migrations in `prisma/migrations/`.

## Commands

Frontend: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`.

Backend: `npm run build`, `npx prisma generate`, `npx prisma validate`, and targeted Jest commands from backend `package.json`. Never apply migrations to remote databases automatically.

## UI, Security, Technology

Use installed React 19, Next 15, Tailwind, Motion/GSAP, Lenis, and OGL. Do not add packages when native CSS/DOM or installed dependency solves task. Inspect `https://animate-ui.com/` and `https://magicui.design/` for patterns; adapt to AnimeSice language, never copy blindly.

Use semantic HTML, visible focus, keyboard operation, labels, `aria-live`, targets >=44px, reduced-motion support, responsive layouts, and safe contrast. Keep controls outside artwork when interaction could obscure it. Sanitize untrusted SVG/HTML at backend boundaries.

## Code, Tests, Delivery

TypeScript strictness stays enabled. Components PascalCase; hooks `useX`; route folders lowercase Portuguese. Keep API/query contracts stable; add `308` redirects for renamed routes. Add one focused test/assertion for non-trivial logic. Run typecheck, lint, build, and `git diff --check` before handoff.

Use Conventional Commit subjects, e.g. `feat(gacha): add card back editor`. PRs describe behavior, migrations, route/API changes, test commands, accessibility impact, screenshots for UI, env vars, rollback steps, and known gaps.
