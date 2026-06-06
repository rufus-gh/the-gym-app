# CLAUDE.md — The Gym App

## Project Overview

The Gym App is a premium offline-first strength training companion for iOS and Android. It is positioned between basic loggers (Strong, Hevy) and coach-led platforms, adding intelligent programming, deep analytics, and conversational AI on top of a fast, frictionless logging experience.

**Core commitments:**
- UI reflects set completion in < 16ms (optimistic update)
- WatermelonDB write confirmed in < 300ms p95
- All core features work with zero network connectivity
- Data is always the user's — exportable in open formats at any time

**Approved tech stack from the product spec (do not substitute):**
- React Native 0.74+ with Expo SDK 52
- Expo Router (file-based routing)
- WatermelonDB (SQLite, offline-first reactive queries)
- Zustand (UI and session state)
- NativeWind v4 (Tailwind CSS for RN) + StyleSheet for perf-critical paths
- React Native Reanimated 3 (animations and gestures)
- Victory Native XL / Skia (charts)
- Zod (runtime validation)
- date-fns v3 (date formatting)
- tRPC (end-to-end type-safe API)
- Claude API via server-side calls only (AI assistant)
- PostHog self-hosted (analytics)

---

## Architecture Principles

### Offline-First, Always

- WatermelonDB is the source of truth. Never read from the server when local data is available.
- Every write goes to SQLite first. Server sync is additive — losing the connection never degrades the core experience.
- Sync queue is bounded at 10,000 changes. Writes are wrapped in transactions with FK constraints enforced at the application layer.

### Optimistic Updates for Set Completion

The most latency-sensitive operation is marking a set complete. The pattern is:
1. Zustand store updates immediately → UI re-renders in < 16ms
2. WatermelonDB write fires asynchronously
3. PR detection runs after the write succeeds
4. On write failure: roll back the Zustand store, return the row to `active` state, show a retry toast

Never await the DB write before updating the UI for this operation.

### State Management Separation

- **WatermelonDB reactive queries** for persisted data (exercises, sessions, sets, PRs, templates)
- **Zustand stores** for transient UI state (active session, rest timer state, bottom sheet content, toast queue)
- These two layers must remain independent. Do not store DB model instances in Zustand — store IDs and derived scalars only.

### TypeScript Strict Mode Throughout

`tsconfig.json` must have `"strict": true`. No `any` types. Use `unknown` and narrow. All API payloads validated with Zod before use.

---

## Project Structure

```
/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/
│   │   ├── welcome.tsx
│   │   ├── sign-in.tsx
│   │   ├── local-only.tsx        # Local-only mode confirmation + data warning
│   │   └── onboarding/
│   │       ├── goals.tsx
│   │       ├── experience.tsx
│   │       ├── units.tsx
│   │       └── first-program.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home / Dashboard
│   │   ├── progress/
│   │   │   ├── index.tsx
│   │   │   ├── charts.tsx
│   │   │   ├── records.tsx
│   │   │   ├── body.tsx
│   │   │   ├── nutrition.tsx
│   │   │   └── calendar.tsx
│   │   ├── log/
│   │   │   ├── index.tsx
│   │   │   └── [sessionId].tsx
│   │   ├── library/
│   │   │   ├── index.tsx
│   │   │   ├── exercises/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   ├── templates/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   └── programs/
│   │   │       ├── index.tsx
│   │   │       └── [id].tsx
│   │   └── profile/
│   │       ├── index.tsx
│   │       ├── history.tsx
│   │       ├── settings.tsx
│   │       ├── export.tsx
│   │       └── account.tsx
│   ├── modals/
│   │   ├── plate-calculator.tsx
│   │   ├── one-rm-calculator.tsx
│   │   ├── rest-timer.tsx
│   │   ├── exercise-picker.tsx
│   │   ├── set-editor.tsx
│   │   ├── ai-assistant.tsx
│   │   ├── pr-celebration.tsx
│   │   └── workout-summary.tsx
│   └── [session]/
│       └── active.tsx
│
├── src/
│   ├── db/                       # WatermelonDB layer
│   │   ├── database.ts           # Database singleton initialisation
│   │   ├── schema.ts             # Full WatermelonDB schema (all 12 entities)
│   │   ├── migrations/
│   │   │   ├── index.ts          # Migration registry
│   │   │   └── migration_001.ts  # Schema v1 baseline
│   │   └── models/
│   │       ├── User.ts
│   │       ├── Exercise.ts
│   │       ├── WorkoutTemplate.ts
│   │       ├── TemplateExercise.ts   # First-class Model, not JSON column
│   │       ├── TemplateSet.ts        # First-class Model, not JSON column
│   │       ├── Program.ts
│   │       ├── ProgramSlot.ts        # Junction model (week/day → template)
│   │       ├── WorkoutSession.ts
│   │       ├── SessionExercise.ts
│   │       ├── Set.ts
│   │       ├── PersonalRecord.ts
│   │       ├── BodyMeasurement.ts
│   │       ├── NutritionLog.ts
│   │       ├── SupersetGroup.ts
│   │       └── SyncMetadata.ts
│   │
│   ├── stores/                   # Zustand stores (UI state only)
│   │   ├── activeSessionStore.ts
│   │   ├── restTimerStore.ts
│   │   └── uiStore.ts
│   │
│   ├── services/                 # Business logic, pure functions
│   │   ├── pr-detection.ts
│   │   ├── one-rm-calculator.ts
│   │   ├── plate-calculator.ts
│   │   ├── progression-engine.ts
│   │   ├── sync.ts
│   │   ├── network.ts
│   │   ├── strong-import.ts
│   │   └── ai-context-builder.ts # Builds aggregated context for Claude API
│   │
│   ├── api/                      # tRPC client + server definitions
│   │   ├── client.ts
│   │   └── trpc.ts
│   │
│   ├── components/               # Shared UI components
│   │   ├── session/
│   │   │   ├── SetRow.tsx        # Core logging row — perf critical
│   │   │   ├── ExerciseCard.tsx
│   │   │   └── ActiveSessionBar.tsx
│   │   ├── charts/
│   │   │   ├── ChartContainer.tsx
│   │   │   ├── VolumeLoadChart.tsx
│   │   │   ├── OneRMChart.tsx
│   │   │   └── MuscleFrequencyHeatmap.tsx
│   │   ├── ui/
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── NumericKeypad.tsx
│   │   │   ├── RestTimerRing.tsx
│   │   │   ├── PRBadge.tsx
│   │   │   ├── GatePrompt.tsx
│   │   │   ├── ToastMessage.tsx
│   │   │   ├── SyncIndicator.tsx
│   │   │   ├── PlateVisualiser.tsx
│   │   │   ├── FilterChip.tsx
│   │   │   └── Sparkline.tsx
│   │   └── layout/
│   │       ├── ScreenContainer.tsx
│   │       └── SectionHeader.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useActiveSession.ts
│   │   ├── useExerciseHistory.ts
│   │   ├── usePersonalRecords.ts
│   │   ├── useRestTimer.ts
│   │   ├── useSync.ts
│   │   ├── useSubscription.ts
│   │   └── useReducedMotion.ts
│   │
│   ├── constants/
│   │   ├── colours.ts            # Full colour token map from spec section 9.2
│   │   ├── spacing.ts            # 8pt grid tokens
│   │   ├── typography.ts         # Font roles from spec section 9.1
│   │   ├── exercises.ts          # 510 built-in exercises (static seed data)
│   │   └── programs.ts           # 6 built-in program definitions
│   │
│   ├── types/
│   │   ├── models.ts             # TypeScript interfaces for all 12 entities
│   │   ├── enums.ts              # ExerciseCategory, MuscleGroup, etc.
│   │   └── api.ts                # API request/response contracts
│   │
│   ├── utils/
│   │   ├── units.ts              # kg ↔ lb conversion (× 0.453592)
│   │   ├── lttb.ts               # LTTB downsampling for volume charts
│   │   ├── max-per-period.ts     # Max-per-period aggregation for 1RM charts
│   │   ├── nanoid.ts             # UUID generation (client-side, nanoid v5)
│   │   └── zod-schemas.ts        # All Zod schemas including MeasurementValues
│   │
│       ├── WatchConnector.ts
│       └── watch-queue.ts        # 50-event cap queue
│
├── server/                       # Node.js + tRPC backend
│   ├── src/
│   │   ├── router/
│   │   │   ├── sync.ts
│   │   │   ├── ai.ts
│   │   │   └── auth.ts
│   │   ├── db/
│   │   │   └── postgres.ts       # Neon serverless PostgreSQL
│   │   └── services/
│   │       ├── sync-conflict.ts  # PR conflict resolution logic
│   │       └── ai-aggregator.ts  # Builds weekly summary for Claude API
│   └── package.json
│
├── e2e/                          # Maestro E2E tests
│   ├── log-a-workout.yaml
│   ├── template-session.yaml
│   ├── program-progression.yaml
│   ├── pr-detection.yaml
│   ├── strong-import.yaml
│   ├── offline-sync.yaml
│   └── gate-prompt.yaml
│
└── __tests__/                    # Jest unit + integration tests
    ├── services/
    │   ├── pr-detection.test.ts
    │   ├── one-rm-calculator.test.ts
    │   ├── plate-calculator.test.ts
    │   ├── progression-engine.test.ts
    │   ├── strong-import-parser.test.ts
    │   └── sync-conflict-resolution.test.ts
    └── components/
        └── SetRow.test.tsx
```

---

## Data Layer

### WatermelonDB Setup

```typescript
// src/db/database.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';

const adapter = new SQLiteAdapter({ schema, migrations, jsi: true });
export const database = new Database({ adapter, modelClasses: [ /* all 12 models */ ] });
```

- Enable JSI (`jsi: true`) for synchronous SQLite access — required for the < 300ms write SLA.
- All 12 entities are first-class WatermelonDB Models. `TemplateExercise`, `TemplateSet`, and `ProgramSlot` are **not** JSON columns — they are proper relational models with FK relationships and indexed queries.

### Required Database Indexes

Add these in the schema. They are mandatory, not optional:
- `exercise_id` on Set, SessionExercise
- `session_id` on SessionExercise, Set
- `user_id` on WorkoutSession, Set, PersonalRecord
- `created_at` and `updated_at` on every table (for sync)
- Compound index `(exercise_id, created_at)` on Set for exercise history queries

### Key Model Rules

**Set model — `weightKg` vs `weightKgActual`:**
- `weightKg` = user's target weight
- `weightKgActual` = weight achievable with available plates after rounding
- When the user does not use the plate calculator, both values are identical
- **Always use `weightKgActual` for PR detection and all analytics.** Never use `weightKg` for these purposes.

**Warmup sets:**
- Warmup sets (`setType === 'warmup'` or `isWarmup === true`) are **excluded** from volume totals, PR detection, and e1RM calculations
- The `detectPersonalRecords` function filters warmups internally — callers do not need to pre-filter

**SupersetGroup dissolution:**
- If removing an exercise from a superset leaves only 1 exercise in the group, the group is dissolved and the remaining exercise becomes standalone
- Maximum group size: 6 exercises. Enforce this at the UI layer before writing.

**MeasurementValues JSON column:**
- Validated on every read and write using the Zod schema pinned to `MEASUREMENT_SCHEMA_VERSION`
- When new measurement types are added, increment the version and provide a migration function

### Migrations

Every schema change requires a versioned migration file in `src/db/migrations/`. Test every migration against a seeded database before merging. Never mutate an existing migration file — always add a new one.

---

## Coding Standards

### TypeScript

- `strict: true` in tsconfig — no exceptions
- No `any`. Use `unknown` and narrow with Zod or type guards.
- All enum-style values use `const` union types (e.g., `type SetType = 'working' | 'warmup' | 'dropset' | 'failure'`)
- All entity interfaces live in `src/types/models.ts` and match the spec exactly

### Naming Conventions

- Files: `kebab-case.ts` for utilities/services, `PascalCase.tsx` for components
- Components: PascalCase (`SetRow`, `ExerciseCard`)
- Hooks: `useCamelCase` (`useActiveSession`)
- Zustand stores: `useCamelCaseStore` (`useActiveSessionStore`)
- WatermelonDB models: PascalCase class matching the entity name (`WorkoutSession`)
- Constants: `SCREAMING_SNAKE_CASE` for true constants (`MEASUREMENT_SCHEMA_VERSION`)

### Component Patterns

```typescript
// Standard component structure
import React, { memo } from 'react';
import { View } from 'react-native';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

interface SetRowProps {
  setId: string;
  exerciseId: string;
  setNumber: number;
}

export const SetRow = memo(({ setId, exerciseId, setNumber }: SetRowProps) => {
  // hooks first
  // derived values
  // handlers
  // render
}, (prev, next) => prev.setId === next.setId /* custom comparison for perf */);
```

- Use `React.memo` with custom comparison on all list item components (`SetRow`, `ExerciseCard`, `SessionCard`)
- Keep components under 200 lines. Extract sub-components or hooks when approaching this limit.
- Co-locate styles with components unless they are shared design tokens

### Unit Handling

All weights are stored in **kilograms** in the database, regardless of user display preference. Convert at the presentation layer only. Use `src/utils/units.ts` for all conversions. The conversion factor for lb → kg is `× 0.453592`.

---

## Key Implementation Notes

### SetRow State Machine

The `SetRow` component implements a four-state machine: `pending → active → completing → completed`.

- `completing` is a transient animation state lasting 80ms (spring scale to 1.2× then settle)
- After the animation, the state becomes `completed` and the next set row transitions to `active`
- The checkmark tap must trigger the optimistic Zustand update **before** any async operation
- A PR badge appears inline on the completed row if `isPersonalRecord` is true

### Rest Timer Architecture

The rest timer must work when the screen is locked and the app is backgrounded:
- Use `expo-task-manager` for background countdown
- iOS Live Activity (ActivityKit) via a native module for the lock screen widget
- Timer auto-starts on set completion based on the override hierarchy: User global default → Exercise default → Template default → Session override

### PR Detection — Critical Rules

```typescript
// src/services/pr-detection.ts
// This function handles warmup exclusion internally. Callers do not pre-filter.
// Always use weightKgActual as the authoritative value.
// PR detection runs synchronously after every successful set write.
```

- Four PR types: `weight`, `reps`, `volume`, `estimated_1rm`
- Sync conflict rule: higher value wins; on tie, earlier `achievedAt` wins
- Retroactive session edits that would set a new PR require explicit user confirmation

### Strong Import — Unit Handling

The import flow **must** present a unit selection screen before parsing any data:

```
What unit does your Strong export use?
○ Kilograms (kg)
● Pounds (lb)
[Continue]
```

If the user selects lb, all weight values are multiplied by `0.453592` before writing to the database. Display the conversion in the preview screen: "Weights converted from lb to kg." Users who complete a Strong import receive a 30-day Pro trial.

### Plate Calculator — Rounding Resolution

When the target weight is not achievable with the user's plate set:
1. Show: "Target: 102.5 kg / Closest achievable: 101 kg / [Use 101 kg] [Cancel]"
2. If confirmed: `Set.weightKg = 102.5`, `Set.weightKgActual = 101`
3. Display `≈101 kg` in the set row to signal rounding
4. Analytics and PR detection use `weightKgActual`

### Progression Engine — Idempotency

The engine output is written as a `ProgramProgressionSnapshot` keyed to `(programId, userId, sessionId)`. Re-running the engine for the same `sessionId` overwrites the existing snapshot — it never creates a duplicate. If the app crashes before the engine runs, it is triggered on next launch for any session with `endedAt` set but no associated snapshot.

### Deload Auto-Detection — Suppression

Do not show a deload suggestion banner when the active program has a scheduled `deloadWeek` within the next two sessions. Deload signals use `preworkoutMood` (not post-workout `mood`) as the fatigue indicator.

### AI Context — Never Send Raw Sets

The Claude API receives **aggregated weekly summaries**, not raw set data. The server builds this context before calling the API. The aggregated payload is approximately 3–5KB; raw set data could be 20–50KB. The server caches AI responses keyed to a hash of the training summary. Rate limiting is enforced server-side: 20 queries/day for Pro, unlimited for Elite, not available on Free.

### Subscription Gate UX

Gate prompts appear at most **twice per feature per 7-day period**. The gate bottom sheet includes a "Start 14-day free trial" CTA (no credit card required). Use the `GatePrompt` component for consistency. When a Free user hits the session history > 90 days limit, older sessions are **archived, not deleted** — a count is shown: "47 older sessions available on Pro."

### Local-Only Mode (Android + iOS)

When a user declines account creation:
- Set `User.isLocalOnly = true`
- Show a persistent dismissible banner on the Profile tab
- The banner re-surfaces every 30 days unless permanently dismissed
- All core features work identically. AI assistant shows a gate prompt (requires account).
- This is a first-class supported state, not an error state.


The Watch-to-phone queue holds a maximum of 50 pending set-completion events:
- At 40 events (80%): show a warning indicator on the Watch UI
- At 50 events (100%): block new set completions on Watch with a prompt to connect to phone
- All Watch writes are proxied through the iOS app — the Watch never writes directly to SQLite

---

## Feature Implementation Order (MVP Sequence)

Follow the phased roadmap from the spec exactly. Do not skip ahead.

### Phase 0 — Foundation (Weeks 1–8)
1. Expo project scaffold with TypeScript strict mode, NativeWind, Expo Router
2. WatermelonDB schema v1 — all 12 entities with migrations infrastructure
3. Define and lock the sync API contract (Appendix B of spec) — server not built yet
4. Navigation structure (Expo Router, all routes stubbed)
5. Design system tokens (`colours.ts`, `spacing.ts`, `typography.ts`)
6. Exercise library screen (static seed data, list + detail)
7. Basic workout logger — empty session, add exercise, log sets, no timer
8. Local PR detection with unit tests (warmup exclusion verified)
9. Subscription tier data model + `GatePrompt` component (no payment yet)

**Phase 0 gate:** All 12 DB entities defined, migrated, and covered by unit tests. Sync API contract reviewed and locked.

### Phase 1 — MVP (Weeks 9–18)
1. Rest timer (in-app, backgrounded via TaskManager)
2. Templates + program structure (`TemplateExercise`/`TemplateSet` as first-class Models)
3. `ProgramSlot` junction model + program detail view
4. Session history + calendar heatmap
5. Plate calculator (shortfall resolution + `weightKgActual` write)
6. 1RM calculator (all four formulas)
7. Body metrics logging + manual nutrition entry
8. Analytics: volume load chart (LTTB downsampling) + e1RM chart (max-per-period)
9. Strong import (unit selection step → lb-to-kg conversion)
10. Export: JSON + CSV
11. Settings screen + onboarding flow

**MVP gate:** Full workout log, history, Strong import with unit conversion, and gate prompts on Pro features work correctly. Crash-free rate > 99% in TestFlight.

### Phase 2 — v1.0 Beta (Weeks 19–28)
1. iCloud sync (iOS) — CloudKit private database
2. Backend: Node.js + PostgreSQL (Neon) + tRPC
3. Apple Sign In + Google Sign In + local-only mode confirmation
4. Google/Apple account linking (cross-platform portability)
5. Cross-platform backend sync (Android)
6. Subscription payment (App Store + Google Play IAP) + gate enforcement
8. Lock screen Live Activity (iOS ActivityKit)
9. Advanced analytics (muscle frequency heatmap, nutrition correlation)
10. AI programming assistant (Claude API, aggregated context)
11. Full notification suite

---

## Testing Approach

### Unit Tests (Jest) — > 90% business logic coverage

Every service in `src/services/` has a corresponding test file. Critical suites:

- `pr-detection.test.ts`: warmup sets explicitly excluded inside the function; new max weight; equal weight is not a PR; `weightKgActual` used as authoritative value
- `plate-calculator.test.ts`: exact weight achievable; shortfall shown and resolved; `weightKgActual` written correctly
- `progression-engine.test.ts`: idempotent on same `sessionId`; deload week suppression; linear increment correct
- `strong-import-parser.test.ts`: lb-to-kg conversion applied when selected; valid CSV parsed; malformed rows skipped and logged
- `sync-conflict-resolution.test.ts`: last-write-wins by `updatedAt`; deletion beats creation; PR conflict — higher value wins; tie goes to earlier `achievedAt`
- `one-rm-calculator.test.ts`: all four formulas; edge cases at reps = 1 and reps > 15
- `measurement-schema.test.ts`: Zod schema rejects malformed payload; version migration applied on read

### Integration Tests (Jest + Testing Library)

- Full session flow: start → add exercise → complete 3 sets → end → verify summary written to DB
- PR celebration: set beats PR → modal triggered → PR written using `weightKgActual`
- Rest timer: set completed → timer starts → reaches zero → notification fired → dismiss
- Progression snapshot: session ended → snapshot written → re-run is idempotent (no duplicate)
- Gate prompt: Free user taps gated feature → `GatePrompt` appears
- Local-only warning: no-auth flow → banner shown → re-surfaces after 30 days

### E2E Tests (Maestro)

Critical paths — all must pass before any production release:
1. Full workout log (start → sets → finish → summary)
2. Template-based session
3. Program progression (week 1 complete → week 2 shows updated weights)
4. PR detection and celebration modal
5. Strong import with lb unit selection and conversion verification
6. Export and share sheet
8. Offline session with subsequent sync on reconnection
9. Subscription gate prompt and 14-day trial activation
10. Local-only Android mode — banner displayed, core logging functions

Device matrix: iPhone 12 mini, iPhone 16 Pro Max, Pixel 7. OS matrix: iOS 16, iOS 18, Android 12, Android 14.

---

## Common Patterns

### FlatList for All Long Lists

```typescript
<FlatList
  data={sets}
  keyExtractor={(item) => item.id}
  getItemLayout={(_, index) => ({ length: SET_ROW_HEIGHT, offset: SET_ROW_HEIGHT * index, index })}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  renderItem={({ item }) => <SetRow setId={item.id} ... />}
/>
```

Always provide `getItemLayout` for fixed-height rows. Always use stable `keyExtractor`. Always wrap `renderItem` output in `React.memo` with custom comparison.

### WatermelonDB Reactive Query Hook

```typescript
// src/hooks/useExerciseHistory.ts
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { observeWithColumns } from '@nozbe/watermelondb/react';

export function useExerciseHistory(exerciseId: string) {
  const database = useDatabase();
  return database
    .get<Set>('sets')
    .query(
      Q.where('exercise_id', exerciseId),
      Q.sortBy('created_at', Q.desc),
      Q.take(50)
    )
    .observe();
}
```

Use `observe()` for live reactive data. Use `fetch()` for one-time reads inside service functions.

### Bottom Sheet Pattern

All contextual editing (set editor, exercise picker, rest timer) uses the `BottomSheet` component with snap points. The set completion checkmark opens the **inline numeric keypad** for simple weight/reps edits — not the full set editor bottom sheet. Reserve the set editor bottom sheet for RPE, set type, notes, AMRAP flag, and plate calculator access.

### Error Handling Pattern

Classify every error as one of: `RECOVERABLE`, `USER_ACTION`, `DEGRADED`, `FATAL`. Use the corresponding UI pattern:
- `RECOVERABLE` → `ToastMessage` with retry action, auto-dismisses in 6 seconds
- `USER_ACTION` → inline red text below the offending field
- `DEGRADED` → amber dismissible banner (does not block any interaction)
- `FATAL` → full-screen error with "Send crash report" and "Restart app"

On DB write failure after an optimistic update: roll back Zustand, return `SetRow` to `active` state with red left border, show retry toast, retry up to 3 times with exponential backoff (500ms, 1s, 2s), then raise `FATAL`.

### Chart Downsampling

- Volume load charts: LTTB algorithm, max 200 points (`src/utils/lttb.ts`)
- Estimated 1RM charts: max-per-period aggregation by week (`src/utils/max-per-period.ts`)
- Never use mean aggregation for 1RM charts — the highest e1RM in a period is the meaningful data point

### Analytics Instrumentation

```typescript
// Every key event is tracked. No PII. User IDs are anonymised hashes.
Analytics.track('set_completed', {
  exerciseId,
  isPR,
  hasRpe: rpe !== null,
  weightKgActualDiffersFromTarget: weightKgActual !== weightKg,
});
```

Implement all events from spec section 16.4 before beta opens to external users.

---

## Do NOT / Avoid

- **Do not** store WatermelonDB model instances in Zustand — store IDs only
- **Do not** use `any` type — use `unknown` and narrow with Zod
- **Do not** read from the server when local data is available — offline-first always
- **Do not** send raw set data to the Claude API — the server aggregates to weekly summaries first
- **Do not** use `weightKg` for PR detection or analytics — always use `weightKgActual`
- **Do not** call the AI API client-side — server-side only, for security and rate limiting
- **Do not** show more than 2 toasts simultaneously — queue additional toasts
- **Do not** show a deload suggestion banner when a programmed `deloadWeek` is within the next two sessions
- **Do not** delete archived session data for Free users — archive it; show a count; upgrade to unlock
- **Do not** use `average` aggregation for e1RM charts — use `max-per-period`
- **Do not** include PR detection or volume counting logic in UI components — these live in `src/services/`
- **Do not** store auth tokens in AsyncStorage or SQLite — iOS Keychain and Android Keystore only
- **Do not** mutate an existing migration file — always add a new versioned migration
- **Do not** skip the unit selection screen in the Strong import flow — lb-to-kg conversion is required
- **Do not** block the UX on sync operations — sync is always async and best-effort
- **Do not** show the gate prompt more than twice per feature per 7-day period
- **Do not** use easing curves for animations — use spring physics throughout (Reanimated 3)
- **Do not** show any animation when `useReducedMotion()` returns `true` (system Reduce Motion)
- **Do not** amend the sync API contract without locking it with the backend lead first

---

## External Services

### Claude API (AI Assistant)

- Access pattern: **server-side only** via the `server/src/router/ai.ts` tRPC route
- Model: `claude-sonnet-4-x` (confirm exact model ID against the Anthropic API before first call)
- Input: aggregated 12-week weekly summary per exercise (spec section 7o.3) — not raw sets
- Output: markdown-formatted suggestion + optional `ProgramAdjustment[]` structured actions
- Rate limiting: enforced server-side (20/day Pro, unlimited Elite)
- Response caching: keyed to a hash of the training summary to avoid redundant calls
- Fallback: rule-based suggestions when AI is unavailable (offline or degraded)
- Guardrail: queries mentioning pain or injury redirect to a healthcare professional message
- The server strips PII patterns (email, phone) from queries before forwarding to the API
- Raw query content is never logged server-side — only anonymised metadata

### CloudKit (iOS Sync)

- Used for Tier 1 sync on iOS — automatic, background, no configuration
- CloudKit private database, end-to-end encrypted by Apple
- Do not add certificate pinning — Apple handles TLS for CloudKit

### PostgreSQL (Neon Serverless)

- Used for backend sync, AI router, and auth
- Cross-platform sync (Android + multi-device iOS) requires a backend account
- Sync endpoints require JWT authentication — unauthenticated requests return 401

### Apple Sign In + Google Sign In

- Both are federated identity providers. The canonical user ID is always the backend UUID.
- "Link Google Account" in Settings > Account associates the Google identity with an existing Apple-sign-in account. It does not create a duplicate record.
- Auth tokens stored in iOS Keychain (SecureStore) and Android Keystore — never AsyncStorage

### PostHog (Analytics)

- Self-hosted instance. No PII transmitted. User IDs are anonymised hashes.
- Implement all events from spec section 16.4. Verify against staging before beta launch.
- Opt-out is available in Settings > Data & Privacy.

### Apple HealthKit + Google Fit

- Body weight: pull on first link, then continuous nightly sync
- Workout data: write after each session
- Use `expo-health` or a platform-specific native module — confirm compatibility with Expo SDK 52 before integrating

### Expo Notifications

- Rest timer alerts: high priority, immediate
- All other notifications: default priority
- Request permission after the user's third session. Show a custom pre-permission screen explaining what will be sent before the system dialogue.
- Lock screen Live Activity (iOS): requires a native module via EAS Build custom dev client

---

## Pre-Phase-0 Checklist (Must Resolve Before Writing Code)

2. **Lock the sync API contract** (spec Appendix B) with the backend lead before WatermelonDB schema work begins. The schema is designed around this contract.
3. **Assign the SQLCipher investigation** to a named engineer with a Phase 2 week-19 deadline. The decision — adopt SQLCipher or proceed without — must be made before beta launch and requires a migration path.
4. **Verify EAS Build** supports all required native modules (ActivityKit, HealthKit) without custom native code that conflicts with the managed workflow.
5. **Lock the model IDs** for all six built-in programs (5/3/1 BBB, GZCLP, PPL, Starting Strength, PHUL, nSuns 5/3/1) in `src/constants/programs.ts` before seeding the exercise library, as programs reference exercises by ID.