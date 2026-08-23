# Environment Variables

No `.env`, `.env.local`, or `.env.example` files exist in this repository.
Runtime variables are configured directly in the existing hosted dashboards.

## Vercel (Next.js server + client runtime)

Configure in the existing Vercel project settings (Project → Settings →
Environment Variables):

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client + server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client + server) | Supabase anon/publishable key, subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Bypasses RLS. Reserved for exceptional server-side operations only (see `src/lib/supabase/admin.ts`). Never exposed to the client. |

Provider integrations (Phase 2):
- `OPENAI_API_KEY` (server-only, image generation via DALL-E 3)
- `FAL_AI_KEY` (server-only, image generation via FLUX)

## Supabase (Edge Function secrets, when applicable)

Configure in the existing Supabase project dashboard (Project → Edge
Functions → Secrets) only if/when an approved Edge Function needs a
provider key. No Edge Functions are used in this bootstrap phase.

## Rules

- Never commit secret values, sample values, or placeholder secrets.
- `src/lib/env.ts` validates required variables at runtime (throws with a
  clear message if missing) and does not supply defaults or fallbacks.
- Local development reads whatever the shell/session environment already
  provides; no local env file is created or expected.
