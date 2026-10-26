# Testing

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test            # Jest: unit, store, and component suites
npm run test:rls    # applies the SQL migrations to PGlite and asserts RLS behavior
npm run build       # production build
npm run verify      # all of the above, in order
```

## Test layout

| Path | Scope |
|---|---|
| `tests/unit/stores/` | Auth and board Zustand stores, including optimistic updates and rollback |
| `tests/unit/lib/` | Zod schemas, reorder math, drop-position calculations |
| `tests/unit/services/` | Database row → domain model mapping |
| `tests/component/` | React Testing Library coverage for `KanbanCard` |
| `tests/rls/verify-rls.mjs` | PGlite harness applying the real SQL migrations with simulated JWT claims |
| `tests/setup/` | Jest setup and CSS module mock |

Jest uses `jest.config.js`, `tsconfig.test.json`, and the `@/*` alias to `src/*`. The RLS harness intentionally applies the schema, RLS, functions, and profile-backfill migrations; the Realtime publication migration is hosted-only because PGlite has no Supabase Realtime service.

## Coverage highlights

- Auth store bootstrap, login, validation failures, registration outcomes, logout, session refresh, profile updates.
- Board store optimistic create/move/edit/delete/reorder/update/remove, including rollback and user-safe errors.
- Board snapshot loading: `openBoard` publishes the fetched board, `refresh` updates it, and failures stop loading with a normalized error.
- Drop-position and list-order math, including clamping and cross-list moves.
- Zod schemas for email, password confirmation, boards, patch payloads, and calendar dates.
- Row mappers for stats (including priority buckets), due dates, member embeds, activity, and auth fallbacks.
- `KanbanCard` open/menu/drag behavior, including drag-over event bubbling.
- 45 RLS checks: member/non-member access (including the aggregate view), owner-only operations, invite outcomes, atomic moves, activity immutability, cascade deletion, priority stats, profile privacy, and the profile backfill for pre-trigger auth users.

## Verified snapshot

| Check | Result |
|---|---|
| TypeScript | Pass |
| ESLint | Pass, 0 warnings |
| Jest | 6 suites, 74 tests pass |
| RLS (PGlite) | 45 checks pass |
| Production build | 9 routes |

The RLS suite validates policy logic against the real migrations, but it is not a substitute for a hosted smoke test. See [deployment.md](deployment.md) for the hosted checklist.
