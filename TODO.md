# The Gym App — MVP Todo List

**Scope:** Phase 0 (Foundation) + Phase 1 (MVP) — Weeks 1–18  
**Gate:** Internal testers can log a full workout, view history, and import from Strong. Crash-free rate > 99% on TestFlight.

Agents: check off items with `[x]` as work is completed. Do not mark items complete until the feature is verified working on device/simulator. Each top-level section maps to a deliverable in `plan.md § 15`.

> **Changes from plan.md roadmap:** Sync API contract deferred to Phase 2 (no backend team to sign off with). Subscription/feature gate tier deferred to Phase 2 (personal project, not monetising yet). Settings & Onboarding moved to Phase 0 so unit preference is wired before the logger is built. Plate Calculator moved into the logger phase — it's a core input aid, not an afterthought.

---

## Phase 0 — Foundation

### 0.1 Project Scaffold

- [ ] Initialise Expo project with TypeScript strict mode (`expo init` with blank TypeScript template)
- [ ] Configure `tsconfig.json` — strict, path aliases (`@/` → `src/`)
- [ ] Install and configure NativeWind v4 with Tailwind CSS config
- [ ] Install Expo Router v3 and configure file-based routing structure
- [ ] Set up ESLint + Prettier with project rules (no implicit any, consistent imports)
- [ ] Configure Husky pre-commit hooks (lint + type-check)
- [ ] Set up EAS Build profiles (development, preview, production)
- [ ] Verify EAS Build works on both iOS and Android simulators
- [ ] Configure environment variables via `app.config.ts` (dev / staging / prod)
- [ ] Create `src/` directory structure matching `CLAUDE.md § Project Structure`
- [ ] Add `.env.example` with all required keys documented

### 0.2 WatermelonDB Schema — All 12 Entities

- [ ] Install WatermelonDB and configure for Expo (JSI adapter for iOS, SQLite for Android)
- [ ] Write `User` model and schema (id, email, displayName, unitPreference, createdAt, updatedAt, syncedAt)
- [ ] Write `Exercise` model and schema (all fields per `plan.md § 6.2` — name, category, muscleGroups, equipment, isCustom, videoUrl, instructions, aliases)
- [ ] Write `WorkoutTemplate` model and schema (id, name, userId, notes, restSeconds, createdAt, updatedAt)
- [ ] Write `TemplateExercise` model and schema (templateId, exerciseId, order, supersetGroupId, defaultSets)
- [ ] Write `TemplateSet` model and schema (templateExerciseId, order, setType, targetReps, targetWeight, targetRPE, targetDuration)
- [ ] Write `Program` model and schema (id, name, userId, durationWeeks, daysPerWeek, description, source)
- [ ] Write `ProgramSlot` model and schema (programId, weekNumber, dayNumber, templateId, label)
- [ ] Write `WorkoutSession` model and schema (id, userId, templateId, startedAt, endedAt, durationSeconds, notes, bodyweightKg, totalVolumeKg, isPersonalRecord)
- [ ] Write `SessionExercise` model and schema (sessionId, exerciseId, order, notes, supersetGroupId)
- [ ] Write `Set` model and schema (sessionExerciseId, order, setType, weightKg, weightKgActual, reps, rpe, durationSeconds, isWarmup, isPersonalRecord, completedAt)
- [ ] Write `PersonalRecord` model and schema (userId, exerciseId, recordType, value, unit, achievedAt, sessionId, setId, previousValue)
- [ ] Write `BodyMeasurement` model and schema (userId, measuredAt, weightKg, bodyFatPercent, chest, waist, hips, bicepLeft, bicepRight, thighLeft, thighRight, calfLeft, calfRight, notes)
- [ ] Write `NutritionLog` model and schema (userId, loggedAt, calories, proteinG, carbsG, fatG, notes, source)
- [ ] Write `SupersetGroup` model and schema (sessionId, color, order)
- [ ] Write `SyncMetadata` model and schema (tableName, lastSyncedAt, localChangeCount)
- [ ] Write migration `001_initial_schema.ts` covering all 12 entities
- [ ] Write unit tests for every model — create, read, update, delete
- [ ] Write unit tests for all model relations (e.g. session → exercises → sets)
- [ ] Verify migration runs cleanly from fresh install on iOS and Android

### 0.3 Navigation Structure (Expo Router)

- [ ] Create tab layout: `(tabs)/_layout.tsx` with 5 tabs (Workout, History, Analytics, Profile, More)
- [ ] Create Workout tab stack: `workout/index.tsx`, `workout/active.tsx`, `workout/finish.tsx`
- [ ] Create History tab stack: `history/index.tsx`, `history/[sessionId].tsx`
- [ ] Create Analytics tab stack: `analytics/index.tsx`, `analytics/exercise/[exerciseId].tsx`
- [ ] Create Profile tab stack: `profile/index.tsx`, `profile/settings.tsx`
- [ ] Create modal routes: `modals/exercise-picker.tsx`, `modals/pr-celebration.tsx`, `modals/rest-timer.tsx`, `modals/plate-calculator.tsx`, `modals/set-editor.tsx`
- [ ] Create exercise library routes: `exercises/index.tsx`, `exercises/[exerciseId].tsx`, `exercises/create.tsx`
- [ ] Create template routes: `templates/index.tsx`, `templates/[templateId].tsx`, `templates/create.tsx`
- [ ] Create program routes: `programs/index.tsx`, `programs/[programId].tsx`
- [ ] Create onboarding stack: `onboarding/welcome.tsx`, `onboarding/units.tsx`, `onboarding/import.tsx`
- [ ] Verify deep links work for all modal routes
- [ ] Verify back navigation is correct on both iOS (swipe) and Android (hardware back)

### 0.4 Design System Tokens & Base Components

- [ ] Define colour palette tokens in `src/constants/colors.ts` — dark and light theme, primary accent (red/orange), surface tiers, text hierarchy
- [ ] Define typography scale in `src/constants/typography.ts` — font sizes, line heights, weights
- [ ] Define spacing scale in `src/constants/spacing.ts`
- [ ] Define border radius, shadow, and animation duration constants
- [ ] Configure NativeWind `tailwind.config.js` to use all tokens
- [ ] Build `ThemeProvider` context with dark/light mode + system preference detection
- [ ] Build `Button` component — variants: primary, secondary, ghost, destructive; sizes: sm, md, lg; loading state
- [ ] Build `Input` component — text, numeric, with label, error state, helper text
- [ ] Build `Card` component — standard surface with padding and optional press state
- [ ] Build `Badge` component — for set types (warmup, working, drop set, failure)
- [ ] Build `Sheet` (bottom sheet) component using Reanimated 3 + gesture handler
- [ ] Build `Modal` wrapper component with keyboard-aware scroll
- [ ] Build `Haptics` utility wrapping `expo-haptics` with semantic names (success, warning, impact)
- [ ] Build `IconButton` component
- [ ] Build `SectionHeader` component (used in exercise and history lists)
- [ ] Build `EmptyState` component (icon + title + subtitle + optional CTA)
- [ ] Build `LoadingSpinner` and `SkeletonPlaceholder` components
- [ ] Write Storybook-style snapshot tests for all base components

### 0.5 Settings & Onboarding Flow

> Moved here from Phase 1 so that unit preference (kg/lb) and bar weight are wired into the app before the logger and plate calculator are built.

- [ ] Build `OnboardingWelcomeScreen` — app name, tagline, "Get Started" / "Import from Strong"
- [ ] Build `OnboardingUnitsScreen` — kg or lb selector, explains it can be changed later
- [ ] Build `OnboardingBarWeightScreen` — configure default bar weight
- [ ] Build `OnboardingAvailablePlatesScreen` — configure which plates are available
- [ ] Build `OnboardingCompleteScreen` — summary of config + "Start Training" CTA
- [ ] Persist onboarding completion flag — never show again after first complete run
- [ ] Write `useSettings` hook backed by MMKV (or WatermelonDB `User` record) — exposes unitPreference, defaultBarWeightKg, availablePlates, restTimerDefaults, theme, preferredOneRMFormula, hapticsEnabled, soundAlertsEnabled, warmupPRExclusion
- [ ] Build `SettingsScreen` — grouped sections (Units, Timer, Display, Data, About)
- [ ] Implement **Units** setting: kg / lb (applies app-wide via `useSettings`)
- [ ] Implement **Bar Weight** default setting
- [ ] Implement **Available Plates** editor (list of plate weights user owns, used by plate calculator)
- [ ] Implement **Rest Timer** defaults: auto-start on/off, default duration per set type
- [ ] Implement **Theme** setting: dark / light / system
- [ ] Implement **1RM Formula** preference
- [ ] Implement **Haptics** on/off toggle
- [ ] Implement **Sound Alerts** on/off toggle + sound picker (5 options)
- [ ] Implement **Warm-Up PR Exclusion** toggle (default: on) with explanation tooltip
- [ ] Build `AboutScreen` — version number, build number, privacy policy link
- [ ] Build `DataManagementScreen` — links to Import, Export, "Clear All Data" (with double confirmation)
- [ ] Write integration tests: change unit preference → all weight displays update across app

### 0.6 Exercise Library — Static Data & Screens

- [ ] Source or write exercise seed data: minimum 300 exercises covering all major muscle groups
- [ ] Include for each exercise: name, category, primaryMuscles, secondaryMuscles, equipment, instructions (3–5 steps), aliases
- [ ] Write seed migration `002_exercise_seed.ts` to populate all exercises on first launch
- [ ] Write unit test confirming seed inserts correct count and no duplicates
- [ ] Build `ExerciseListScreen` — grouped by category, alphabetical, with search input
- [ ] Implement search — filters by name, aliases, muscle group, equipment in real time (< 150ms)
- [ ] Build `ExerciseDetailScreen` — name, muscles visualisation (front/back body SVG highlight), equipment, instructions, history stub
- [ ] Build `ExerciseCreateScreen` — form with name, category, muscles (multi-select), equipment, custom flag
- [ ] Build `ExerciseEditScreen` (same form, pre-populated)
- [ ] Implement muscle group filter chips on exercise list
- [ ] Implement equipment filter chips on exercise list
- [ ] Confirm custom exercises are marked clearly and cannot be deleted if used in a session
- [ ] Write integration tests for search filtering

### 0.7 Basic Workout Logger + Plate Calculator

> Plate calculator built here so it's available as a live input aid from day one of logging.

**Workout Logger**

- [ ] Build `StartWorkoutScreen` — empty state with "Start Empty Workout" CTA + template picker stub
- [ ] Build `ActiveSessionScreen` layout — session timer, exercise list, add exercise FAB
- [ ] Implement session creation — writes `WorkoutSession` record on "Start"
- [ ] Build `SessionExerciseRow` — exercise name, set rows, add set button
- [ ] Build `SetRow` — weight input, reps input, set type badge, complete checkbox; weight field shows unit from `useSettings`
- [ ] Implement set completion — optimistic UI update (< 16ms), DB write on background thread
- [ ] Implement `SetEditorSheet` — weight (unit-aware), reps, RPE (0–10 with half steps), set type picker, warmup toggle, plate calculator shortcut button
- [ ] Implement "Add Set" — copies previous set's weight and reps as default
- [ ] Implement "Duplicate Exercise" action
- [ ] Implement "Remove Exercise" with confirmation
- [ ] Implement "Remove Set" with swipe-to-delete gesture
- [ ] Implement exercise reorder via long-press drag (react-native-reorderable-list or Reanimated)
- [ ] Build `ExercisePickerModal` — searchable exercise list, multi-select for supersets
- [ ] Implement session discard — confirmation dialog, cleans up session + all sets from DB
- [ ] Implement auto-save on each set completion (no manual save needed)
- [ ] Handle app backgrounded mid-session — session persists and resumes correctly on reopen
- [ ] Handle device restart mid-session — session survives (WatermelonDB persists to SQLite)
- [ ] Write integration tests: start session → add exercise → log 3 sets → verify DB state

**Plate Calculator**

- [ ] Build `PlateCalculatorModal` — accessible via shortcut in `SetEditorSheet` and standalone from More tab
- [ ] Read bar weight default and available plates from `useSettings`
- [ ] Implement bar weight selector: 20kg (men's Olympic), 15kg (women's Olympic), custom kg, 45lb, 35lb, custom lb — pre-filled from settings default
- [ ] Implement plate algorithm: given target weight and bar, calculate optimal plate combination using available plates from settings
- [ ] Implement `weightKgActual` field on `Set` — stores the actual loadable weight if target is not achievable exactly
- [ ] Display shortfall resolution message: "Closest loadable: 102.5kg (target was 103kg)"
- [ ] Display plate diagram: visual bar graphic with plates stacked on each side (colour-coded by plate size)
- [ ] Implement unit toggle (kg ↔ lb) in calculator, respecting `useSettings` default
- [ ] Handle edge cases: target < bar weight → error; no plates available → error; fractional plates
- [ ] Write unit tests: exact match, shortfall, no-fractional, lb input → kg calculation

### 0.8 Local PR Detection

- [ ] Write `PRDetectionService` — called after each set completion
- [ ] Implement e1RM calculation using Epley formula as default; respect `preferredOneRMFormula` from `useSettings`
- [ ] Implement PR detection for: heaviest weight (at ≥ 1 rep), most reps (at given weight), highest e1RM
- [ ] **Warmup exclusion:** warmup-flagged sets must never trigger a PR — unit test this explicitly; respect `warmupPRExclusion` setting
- [ ] Write query to fetch previous best for an exercise from `PersonalRecord` table
- [ ] Write `PersonalRecord` insert on new PR detection
- [ ] Write `PersonalRecord` update logic — only insert if genuinely better than previous
- [ ] Mark `Set.isPersonalRecord = true` when a PR set is detected
- [ ] Mark `WorkoutSession.isPersonalRecord = true` if any PR detected in session
- [ ] Write unit tests: warmup set → no PR; first set ever → PR; heavier set → PR; lighter set → no PR
- [ ] Write unit tests: e1RM PR with Epley, Brzycki, and Lombardi formulas

---

## Phase 1 — MVP Core

### 1.1 Rest Timer

- [ ] Build `RestTimerService` — singleton managing timer state: `idle | counting | alerting | dismissed`
- [ ] Implement countdown with `setInterval` (1s tick), pause, resume, reset
- [ ] Store default rest duration per exercise in `Exercise` model; fallback to user global default from `useSettings`
- [ ] Auto-start timer on set completion (controlled by `useSettings.restTimerAutoStart`)
- [ ] Build `RestTimerBar` — persistent mini-bar at bottom of `ActiveSessionScreen` showing remaining time
- [ ] Build `RestTimerModal` — full-screen expanded view with large countdown, +30/+60/+90 add-time buttons, skip button, next set preview
- [ ] Implement haptic feedback on timer zero (heavy impact pattern, respects `hapticsEnabled` setting)
- [ ] Implement audio alert on timer zero — 5 selectable sounds + silent option (respects `soundAlertsEnabled` setting)
- [ ] Implement background timer using `expo-task-manager` + `expo-background-fetch` so timer survives app backgrounding
- [ ] Implement lock screen notification when timer completes — shows "Rest complete — ready for next set"
- [ ] Implement notification action button: "Start Next Set" dismisses notification and marks ready
- [ ] Request notification permissions gracefully with explanation prompt
- [ ] Verify timer survives: app backgrounded, screen locked, notification dismissed
- [ ] Write integration tests: timer starts on set complete, fires notification at zero, dismisses correctly

### 1.2 Templates

- [ ] Build `TemplateListScreen` — list of user templates + "Create Template" button
- [ ] Build `TemplateCreateScreen` — name, notes, exercises with sets
- [ ] Implement `TemplateExercise` and `TemplateSet` creation flow — add exercise, configure target sets (weight, reps, RPE, set type)
- [ ] Build `TemplateDetailScreen` — read-only view with exercise/set summary
- [ ] Build `TemplateEditScreen` — edit name, add/remove/reorder exercises and sets
- [ ] Implement "Start from Template" — creates `WorkoutSession` pre-populated with `SessionExercise` + `Set` rows from template defaults
- [ ] Implement template duplication
- [ ] Implement template deletion with confirmation (warn if used in a program)
- [ ] Implement per-template rest timer default (overrides global default for that template)
- [ ] Build `TemplateExerciseRow` in create/edit — shows target sets, inline editable

### 1.3 Programs

- [ ] Build `ProgramListScreen` — user's programs + "Create Program" + "Browse Built-In Programs" (stub)
- [ ] Build `ProgramCreateScreen` — name, duration (weeks), days per week, slot assignment (assign template to week/day)
- [ ] Build `ProgramDetailScreen` — week-by-week calendar grid showing assigned templates per day
- [ ] Implement `ProgramSlot` model CRUD — assign template to (weekNumber, dayNumber)
- [ ] Build `ProgramSlotPicker` — grid UI to assign templates to week/day slots
- [ ] Implement "Start Program" — activates program, sets current week/day tracking
- [ ] Implement "Next Workout" logic — given active program + current date, identify next due session
- [ ] Implement program progression — auto-increment week after all days complete
- [ ] Implement "Today's Workout" card on home screen — shows next program session if active
- [ ] Implement program deactivation and re-activation
- [ ] Write integration tests: create program → start → complete day → advance week

### 1.4 Session History & Calendar Heatmap

- [ ] Build `HistoryListScreen` — chronological list of completed sessions, grouped by month
- [ ] Build `SessionCard` — date, template name, exercise count, total volume (unit-aware), duration, PR badge if applicable
- [ ] Build `SessionDetailScreen` — full exercise/set breakdown, notes, body weight logged, total volume, duration
- [ ] Implement set detail rows — weight (unit-aware), reps, RPE, set type, PR flag
- [ ] Build `CalendarHeatmapView` — GitHub-style contribution heatmap (52 weeks × 7 days), intensity = volume, on `HistoryListScreen` above list
- [ ] Implement tap on heatmap day — scroll to / highlight that session in list
- [ ] Implement session notes editing from `SessionDetailScreen`
- [ ] Implement session deletion with confirmation
- [ ] Implement retroactive set editing — tap any set in session detail, opens `SetEditorSheet`
- [ ] Add "workout duration" display (startedAt → endedAt diff formatted as "1h 23m")
- [ ] Write integration tests: complete session → appears in history → detail view shows correct sets

### 1.5 1RM Calculator

- [ ] Build `OneRMCalculatorModal` — accessible from exercise detail and analytics screen
- [ ] Implement all 5 formulas: Epley, Brzycki, Lombardi, Mayhew, O'Conner
- [ ] Display results from all formulas in a comparison table
- [ ] Highlight the user's preferred formula (from `useSettings`) in the comparison table
- [ ] Implement RPE-based 1RM estimate: given weight + RPE, calculate e1RM using RPE chart
- [ ] Display "estimated from RPE" vs "estimated from reps" clearly
- [ ] Auto-populate from last set if launched from active session
- [ ] Write unit tests for all 5 formulas with known reference values

### 1.6 Body Measurements & Manual Nutrition Logging

- [ ] Build `BodyMetricsScreen` — accessible from Profile tab
- [ ] Build `WeighInEntrySheet` — date, weight (unit-aware via `useSettings`), body fat % (optional), notes
- [ ] Build `MeasurementsEntrySheet` — date + all circumference measurements (chest, waist, hips, both biceps, both thighs, both calves)
- [ ] Implement `BodyMeasurement` CRUD — create, edit, delete entries
- [ ] Build `WeightTrendChart` — line chart of bodyweight over time with 7-day rolling average overlay
- [ ] Build `MeasurementsChart` — multi-line chart, toggle individual measurements
- [ ] Implement HealthKit read for body weight on iOS (request permission, pull historical data on first use)
- [ ] Build `NutritionLogEntrySheet` — date, calories, protein, carbs, fat, notes
- [ ] Build `NutritionLogListView` on Body Metrics screen — recent entries with daily totals
- [ ] Write integration tests: log weigh-in → appears in chart with correct value

### 1.7 Basic Analytics

- [ ] Build `AnalyticsHubScreen` — exercise selector at top, chart tabs below
- [ ] Build `ExerciseAnalyticsScreen` — shown after selecting exercise
- [ ] Implement `VolumeLoadChart` — bar chart of weekly total volume (sets × reps × weight) over time
- [ ] Implement `EstimatedOneRMChart` — line chart of e1RM over time using preferred formula from `useSettings`
- [ ] Implement `MaxWeightChart` — line chart of heaviest working set weight over time (unit-aware)
- [ ] Implement `TotalRepsChart` — bar chart of total reps per session over time
- [ ] Implement LTTB downsampling for all charts (max 150 data points rendered regardless of dataset size)
- [ ] Implement Skia-based chart rendering (Victory Native XL or `react-native-wagmi-charts`)
- [ ] Implement chart zoom/pan gesture using Reanimated 3
- [ ] Implement date range picker for all charts (1M / 3M / 6M / 1Y / All)
- [ ] Implement "Sessions logged" summary card on analytics hub
- [ ] Implement "Total volume lifted (all time)" summary card (unit-aware)
- [ ] Implement "Current streak (consecutive training days)" summary card
- [ ] Add PR annotations on charts — vertical dotted line + "PR" label on date of personal record
- [ ] Write integration tests: log sessions → verify chart data matches session records

### 1.8 Strong Import

- [ ] Build `ImportScreen` accessible from onboarding and Settings → Data
- [ ] Implement CSV parser for Strong app export format (detect column headers)
- [ ] Implement unit selection step — prompt user "Your export appears to be in kg/lb — confirm"
- [ ] Implement lb-to-kg conversion when user confirms lb data
- [ ] Map Strong exercise names to library exercises by name-match (normalised lowercase, stripped punctuation)
- [ ] Create new custom exercises for any unmatched Strong exercises (mark as `isCustom: true`, source = 'strong_import')
- [ ] Create `WorkoutSession`, `SessionExercise`, and `Set` records from each imported session row
- [ ] Detect and import PRs from imported data — run `PRDetectionService` over all imported sets
- [ ] Show import progress screen — "Imported X sessions, Y exercises, Z PRs found"
- [ ] Show import summary with any skipped rows and reasons
- [ ] Implement duplicate detection — if session date + exercises match an existing session, skip and warn
- [ ] Handle malformed rows gracefully — skip with log, never crash
- [ ] Write unit tests: CSV parse, unit conversion, exercise matching, duplicate detection

### 1.9 Export (JSON + CSV)

- [ ] Build `ExportScreen` accessible from Settings → Data
- [ ] Implement JSON export — full data dump of all sessions, exercises, PRs, body metrics as structured JSON
- [ ] Implement CSV export — flat sessions CSV matching Strong export format (for portability)
- [ ] Implement date range filter for export (all data, last 3 months, custom range)
- [ ] Use `expo-sharing` to open native share sheet with exported file
- [ ] Use `expo-file-system` to write export to cache directory before sharing
- [ ] Show export size estimate before export
- [ ] Write unit tests: JSON export structure matches schema, CSV round-trips through importer cleanly

---

## Cross-Cutting Concerns (Required Before MVP Gate)

### Accessibility

- [ ] All interactive elements have `accessibilityLabel` and `accessibilityHint`
- [ ] All touch targets minimum 44×44pt
- [ ] Dynamic type support — all text scales with iOS font size setting
- [ ] VoiceOver tested on active session screen (core logging flow must be navigable)
- [ ] Minimum colour contrast ratio 4.5:1 on all text in both themes
- [ ] Reduce Motion respected — disable Reanimated spring animations when setting is on

### Performance

- [ ] Active session screen renders set completion in < 16ms (verify with FlashList profiler)
- [ ] WatermelonDB writes complete in < 300ms on p95 device (iPhone 12 / mid-range Android)
- [ ] Exercise list search results appear in < 150ms on 300-exercise dataset
- [ ] App cold start time < 3 seconds on iPhone 12
- [ ] All lists use `FlashList` (not `FlatList`) for virtualised rendering
- [ ] No synchronous DB reads on the JS thread (all queries via WatermelonDB's async API)

### Error Handling

- [ ] Global error boundary catches unhandled JS exceptions and shows friendly error screen
- [ ] All DB operations wrapped in try/catch; errors logged to console (Sentry-ready)
- [ ] All forms validate with Zod before submission; field-level error messages shown
- [ ] Empty states for all lists — exercise library (no results), history (no sessions), analytics (no data)

### Testing Baseline

- [ ] Unit test coverage > 80% on all services (`PRDetectionService`, `RestTimerService`, calculators)
- [ ] Integration tests for all primary user flows: log workout, view history, view PR
- [ ] Snapshot tests for all base components (catch unintended UI regressions)
- [ ] All tests pass on CI (EAS Build check or local `jest --ci`)

---

## MVP Gate Checklist

Before marking MVP complete, verify all of the following manually on device:

- [ ] Start a workout from scratch (no template), log 3 exercises with multiple sets, finish workout
- [ ] Start a workout from a template, complete it, verify session appears in history
- [ ] Verify a PR is detected and celebration modal fires (check warmup sets do NOT trigger PR)
- [ ] Rest timer auto-starts after set completion, fires haptic + notification when done
- [ ] Open plate calculator from set editor — enter a weight, verify correct plates shown
- [ ] Import a Strong CSV export — verify sessions, PRs, and exercises appear correctly
- [ ] Export all data as JSON and CSV — open file and verify contents are correct
- [ ] Navigate to Analytics, select an exercise, view e1RM and volume charts
- [ ] Log body weight and a measurement — verify chart updates
- [ ] Change unit preference to lb — verify all weight displays update throughout app
- [ ] Run app with no internet connection — verify all core features still work
- [ ] Crash-free rate > 99% across 50+ test sessions on TestFlight

---

*Updated by agents as work progresses. Do not mark gate items complete until full manual verification on device.*
