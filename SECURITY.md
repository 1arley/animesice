# Security Policy

## Supported Versions

Security fixes land on the default branch and are released by semantic-release.

| Version | Supported |
| ------- | --------- |
| `main` (latest release) | Yes |
| Older releases | No |

## Reporting a Vulnerability

Do not open a public issue, PR, or discussion for a vulnerability.

Use GitHub's private reporting: **Security tab → Report a vulnerability** at
https://github.com/1arley/animesice/security/advisories/new

If private reporting is unavailable, open a public issue that says only
"security report available on request" with no technical detail.

Include what you can: affected route or endpoint, steps to reproduce, impact,
and whether the bug is reachable without authentication.

## Scope

In scope:

- This frontend repository (`animesice`)
- The API in `animesice-back`, when reported here — say so in the report so it
  lands in the right tracker

Out of scope:

- Vulnerabilities in third-party dependencies with no working exploit against
  this code (report those upstream; include the advisory ID)
- Missing hardening headers with no demonstrated impact
- Findings from automated scanners with no manual confirmation
- Denial of service, spam, and social engineering

## Response

Triage within 7 days. Fix or schedule a fix within 30 days of confirmation, faster
for active exploitation or data exposure. You get credit in the advisory unless you
ask otherwise.
