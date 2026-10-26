# Deployment

Flowboard deploys as one Next.js app (for example on Vercel):

1. Set `NEXT_PUBLIC_SUPABASE_URL`, one of `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` in the host's environment.
2. Add the production `/auth/callback` URL to the Supabase Auth redirect allowlist and set the Site URL.
3. Run the migrations in `supabase/migrations/` against the production project, including `20261026000500_backfill_profiles.sql` if the project already has auth users.
4. Build and deploy. No separate API, socket server, or database credentials are required.
5. Smoke-test sign-up, confirmation, login, password reset, board CRUD, invites, and two-browser Realtime before announcing the deployment.

## Production checklist

- Confirm the `supabase_realtime` publication contains `boards`, `board_members`, `lists`, `cards`, and `activity_logs`.
- Confirm every existing auth account has a matching `public.profiles` row.
- Enable email confirmation and configure the confirmation and recovery templates.
- Remove throwaway test accounts and test boards from the Supabase project.
- Re-run `npm run verify` against the release commit.
- Keep the publishable/anon key in `NEXT_PUBLIC_*` only; never add a `service_role` key to the client bundle.

## Remaining work and limitations

- **Position races:** positions are written as `max + 1` without a unique constraint, so concurrent inserts can collide. A per-board uniqueness constraint or advisory lock would harden ordering.
- **Two-request card edits:** changing card fields and moving a card are separate requests, so a partial failure is possible. A single RPC could make the combined operation atomic.
- **Content Security Policy:** security headers are set in `next.config.js`, but there is no CSP yet. Add one that allowlists the Supabase project origin and WebSocket endpoint.
- **Dependency advisories:** some advisories require major-version upgrades; `npm audit fix` has not been applied.
- **Invitations:** `invite_board_member` only adds accounts that already exist; there is no invitation email or pending-invite state.
- **Presence hardening:** move to private Realtime channels and add `realtime.messages` authorization policies.
- **Ownership transfer and roles:** ownership is fixed at creation; there is no transfer or role promotion UI.
- **Attachments and notifications:** cards have no file uploads, comments, push, or email notifications.
- **Offline support:** the app requires a network connection and has no offline queue or PWA install.
- **Dashboard liveness:** the dashboard loads on mount and refreshes manually or after local mutations; only an open board subscribes to Realtime.
- **Activity pagination:** the board keeps the latest 50 entries in memory.
- **End-to-end automation:** add Playwright coverage against a seeded Supabase project for drag-and-drop, modals, and two-user Realtime.
