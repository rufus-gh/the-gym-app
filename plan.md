# The Gym App — Comprehensive Product Plan v1.2

**Document Type:** Product Design & Engineering Specification
**Prepared by:** Lead Product Designer
**Reviewed by:** Team Lead (Final Approval)
**Date:** 2026-06-06
**Status:** APPROVED — Ready for Development
**Version:** 1.2.0 (final team lead approval pass)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [App Overview & Goals](#2-app-overview--goals)
3. [Target Audience & Use Cases](#3-target-audience--use-cases)
4. [Technical Stack & Architecture](#4-technical-stack--architecture)
5. [Navigation Structure](#5-navigation-structure)
6. [Data Models & Schema](#6-data-models--schema)
7. [Feature Specifications](#7-feature-specifications)
   - 7a. [Workout Logging](#7a-workout-logging)
   - 7b. [Exercise Library](#7b-exercise-library)
   - 7c. [Templates & Programs](#7c-templates--programs)
   - 7d. [Personal Records](#7d-personal-records)
   - 7e. [Analytics & Progress Tracking](#7e-analytics--progress-tracking)
   - 7f. [Rest Timer](#7f-rest-timer)
   - 7g. [Plate Calculator & 1RM Calculator](#7g-plate-calculator--1rm-calculator)
   - 7h. [Body Measurements & Weight Tracking](#7h-body-measurements--weight-tracking)
   - 7i. [Workout History & Calendar](#7i-workout-history--calendar)
   - 7j. [Cloud Sync & Backup](#7j-cloud-sync--backup)
   - 7k. [Data Import/Export](#7k-data-importexport)
   - 7l. [Settings & Customization](#7l-settings--customization)
   - 7n. [Notifications & Rest Timer Alerts](#7n-notifications--rest-timer-alerts)
   - 7o. [AI Workout Suggestions](#7o-ai-workout-suggestions)
   - 7p. [Social Features](#7p-social-features)
8. [Subscription Tier & Feature Gate Matrix](#8-subscription-tier--feature-gate-matrix)
9. [UI/UX Design System](#9-uiux-design-system)
10. [State Management Architecture](#10-state-management-architecture)
11. [Offline-First Architecture](#11-offline-first-architecture)
12. [Performance Requirements](#12-performance-requirements)
13. [Accessibility Requirements](#13-accessibility-requirements)
14. [Testing Strategy](#14-testing-strategy)
15. [Phased Development Roadmap](#15-phased-development-roadmap)
16. [Success Metrics](#16-success-metrics)
17. [Known Risks & Mitigations](#17-known-risks--mitigations)
18. [Security & Data Protection](#18-security--data-protection)
19. [Error Handling & Degraded State Standards](#19-error-handling--degraded-state-standards)
20. [Team Sign-Off](#20-team-sign-off)

---

## 1. Executive Summary

The Gym App is a premium, offline-first strength training companion built for intermediate-to-advanced lifters who demand more than basic workout logging. It is a deliberate, opinionated reimagining of the Strong app, retaining its speed and simplicity while adding a layer of intelligent programming, deep analytics, and a design language worthy of the effort its users put into the gym.

The product is built on three foundational commitments:

**Speed.** Every interaction in the core logging flow is optimised to require no more than two taps. The UI reflects set completion within one render frame (< 16ms) via optimistic updates. Local DB write confirmation occurs within 300ms on p95 hardware. These are distinct guarantees — see section 12.1 for the full latency contract.

**Intelligence.** The app does not merely record what you did — it understands patterns, detects plateaus, surfaces insights, and suggests what to do next. The AI layer (Claude API) powers a conversational programming assistant that learns from your history.

**Ownership.** All data is stored locally first. Users may export everything in open formats at any time. Sync is additive — losing the sync connection never degrades the core experience. A user who never creates an account retains full access to all core features, with an explicit warning that their data is not backed up.

The v1.0 release targets iOS and Android simultaneously via React Native with Expo,. Phase 2 introduces social features, coach mode, and video form analysis.

---

## 2. App Overview & Goals

### 2.1 Product Vision

The Gym App exists at the intersection of a training log, a programming tool, and a coaching assistant. Where existing apps (Strong, Hevy, RepCount) treat logging as the end goal, The Gym App treats logging as data collection for a larger purpose: continuous improvement through informed programming decisions.

### 2.2 Core Goals

| Goal | Description | Success Signal |
|---|---|---|
| Frictionless logging | Capture sets faster than any competitor | UI reflects completion < 16ms; DB write confirmed < 300ms (p95) |
| Intelligent feedback | Surface actionable insights from every session | AI suggestion engagement > 30% |
| Deep analytics | Make progress visible and motivating | Analytics screen DAU > 40% of total |
| Data safety | Never lose a workout | Zero data-loss incidents |
| Premium feel | Justify premium pricing through craftsmanship | 4.7+ App Store rating |

### 2.3 Problems Solved Over Existing Apps

| Pain Point (Strong App) | Our Solution |
|---|---|
| No plateau detection | AI flags stalled lifts after 3+ sessions with no progress |
| Limited analytics | Full interactive chart suite with drill-down |
| No program intelligence | Built-in periodization logic with auto deload detection |
| Clunky rest timer UX | Haptic-first timer with Watch tap-to-dismiss |
| No AI layer | Claude API conversational programming assistant |
| Export is buried | Export available from profile in two taps |
| No body metrics correlation | Body weight and measurements correlated against performance |

---

## 3. Target Audience & Use Cases

### 3.1 Primary Persona: The Dedicated Lifter

**Name:** Alex, 28 | **Frequency:** 4–5x/week | **Experience:** 3+ years
**Goals:** Strength (primary) and muscle | **Devices:** iPhone 15 Pro
**Frustrations:** Apps don't interpret their data; analytics feel bolted on; no smart deload suggestions
**Willingness to pay:** $8–14/month for a genuinely better tool

### 3.2 Secondary Persona: The Program Follower

**Name:** Jordan, 34 | **Frequency:** 3x/week | **Experience:** 18 months running 5/3/1
**Goals:** Following a proven program consistently | **Devices:** Android flagship, no wearable
**Frustrations:** Manual percentage calculations; no built-in program logic
**Willingness to pay:** $5–8/month

### 3.3 Tertiary Persona: The Data Nerd

**Name:** Sam, 25 | **Frequency:** 5–6x/week | **Experience:** 4+ years, writes own programs
**Goals:** Maximising progression through data-driven decisions | **Devices:** iPhone, Android tablet
**Frustrations:** No raw data access; oversimplified charts; no way to correlate sleep, nutrition, and performance
**Willingness to pay:** $15+/month for full data access

### 3.4 Use Cases

#### UC-01: Live Workout Logging
User opens app, starts session from template, logs sets with weight/reps/RPE in real time, uses rest timer, ends session and views summary.

#### UC-02: Program Progression
User is running 5/3/1. App auto-calculates next week's working weights based on training max and progression rules. User confirms or adjusts.

#### UC-03: PR Review & History
User navigates to their squat, views a full 1RM trend chart, sees every PR date annotated, and shares a screenshot.

#### UC-04: AI Programming Consultation
User asks "why isn't my bench improving?" The assistant analyses the last 8 weeks of data, identifies volume overreach, and suggests a reset protocol.

#### UC-05: Body Metrics Tracking
User in a cut logs daily weigh-ins, tracks waist measurements, and correlates caloric deficit against strength changes.

#### UC-06: Import from Strong
New user has 2 years of data in Strong. They export from Strong, import via the import flow, and all historical sessions, PRs, and exercises are migrated.

---

## 4. Technical Stack & Architecture

### 4.1 Frontend Framework

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React Native 0.74+ with Expo SDK 52 | Single codebase iOS/Android; New Architecture (JSI) for bridge-free performance |
| Language | TypeScript (strict mode) | Type safety across the data layer |
| UI Components | Custom library on React Native Reanimated 3 | Fine-grained animation control; 60fps gesture-driven interactions |
| Navigation | Expo Router (file-based routing) | Next.js-style routing; deep linking; typed routes |
| Styling | NativeWind (Tailwind CSS for RN) + StyleSheet for perf-critical paths | Rapid prototyping; consistent design tokens |

### 4.2 Local Database

| Decision | Choice | Rationale |
|---|---|---|
| Primary DB | WatermelonDB (SQLite underneath) | Reactive observable queries; lazy loading; designed for large datasets |
| Migrations | WatermelonDB schema migrations | Versioned, tested migrations; safe production upgrades |
| ORM pattern | WatermelonDB Model classes | Type-safe models; `@lazy` decorators for performance |
| Backup format | JSON serialisation of all models | Portable; human-readable; diffable |

**Note on embedded arrays:** `TemplateExercise` and `TemplateSet` are promoted to first-class WatermelonDB Model tables with foreign keys (see section 6.3). This enables reactive queries in the template editor and clean relational access from the progression engine. The tradeoff is more join operations, but this is preferable to serialising arrays to JSON columns which would lose reactivity and queryability.

### 4.3 Sync & Backend

| Decision | Choice | Rationale |
|---|---|---|
| iOS sync | CloudKit (iCloud) | Native, free for users, privacy-respecting |
| Cross-platform sync | Custom Node.js + PostgreSQL backend | Required for Android and AI feature access |
| Sync protocol | WatermelonDB Sync (push/pull) | Built-in conflict resolution; timestamp-based with user override |
| Auth | Apple Sign In (primary), Google Sign In (secondary) | Reduces friction; privacy-first |
| API layer | REST + tRPC | End-to-end type safety; eliminates API contract drift |

**Cross-platform account portability:** A user who signs in with Apple Sign In on iOS and subsequently wants to sync to an Android device must link a Google account. The Settings > Account screen provides a "Link Google Account" option that associates the Google identity with the existing user record on the backend. The canonical user ID is always the backend UUID — not the Apple or Google sub-identifier — so linking a second provider does not create a duplicate account. This flow is surfaced proactively when the user first opens the app on an Android device and an Apple-only account is detected.

**Local-only (no account) state on Android:** See section 11.1.

### 4.4 AI Layer

| Decision | Choice | Rationale |
|---|---|---|
| Model | Claude API (claude-sonnet-4-x) | Strong reasoning for training context; JSON mode for structured suggestions |
| Access pattern | Server-side API calls only | Security; rate limiting control; cost management |
| Context window usage | Aggregated 12-week training summary (not raw sets) | Sufficient history for pattern detection at lower token cost; see section 7o.3 |
| Caching | Server-side cache of AI responses keyed to data hash | Avoid redundant API calls if data unchanged |
| Fallback | Rule-based suggestions if AI unavailable | Offline or degraded mode still provides value |

### 4.5 Charts & Graphics

| Decision | Choice | Rationale |
|---|---|---|
| Charting library | Victory Native XL (Skia-based) | GPU-accelerated; 60fps; handles large datasets |
| Downsampling | LTTB for volume/trend charts; max-per-period for 1RM charts | Preserves visual shape and peak values respectively; see section 12.4 |
| Animations | React Native Reanimated 3 + Skia | Smooth gesture-driven chart interactions |


### 4.7 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (iOS / Android)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Expo Router │  │  UI Layer    │  │  Watch Connector  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                 │                                  │
│  ┌──────▼─────────────────▼────────────────────────────┐    │
│  │              State Layer (Zustand stores)             │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │           WatermelonDB (SQLite, offline-first)        │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │              Sync Engine (push/pull)                  │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTPS / tRPC
┌─────────────────────────▼───────────────────────────────────┐
│                   BACKEND (Node.js / tRPC)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Sync API    │  │  AI Router   │  │  Auth Service    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│  ┌──────▼─────────────────▼────────────────────────────┐    │
│  │              PostgreSQL (Neon serverless)             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Navigation Structure

### 5.1 Tab Bar (Primary Navigation)

Five persistent tabs. Tab bar is hidden during an active workout session.

| Tab | Icon | Purpose |
|---|---|---|
| Home | House | Dashboard, quick-start, recent sessions, AI nudges |
| Progress | Chart line | Analytics, PRs, body metrics, calendar |
| Log | Plus circle (prominent) | Start or continue a workout session |
| Library | Books | Exercise library, templates, programs |
| Profile | Person | Settings, account, export, history |

### 5.2 Full Screen Hierarchy

```
Root (Expo Router)
├── (auth)/
│   ├── welcome.tsx
│   ├── sign-in.tsx
│   ├── local-only.tsx          — Local-only mode confirmation + warning
│   └── onboarding/
│       ├── goals.tsx
│       ├── experience.tsx
│       ├── units.tsx
│       └── first-program.tsx   — Optional; see section 7c for retroactive adoption
│
├── (tabs)/
│   ├── index.tsx               — Home / Dashboard
│   ├── progress/
│   │   ├── index.tsx
│   │   ├── charts.tsx
│   │   ├── records.tsx
│   │   ├── body.tsx
│   │   ├── nutrition.tsx       — Manual nutrition entry + import status
│   │   └── calendar.tsx
│   ├── log/
│   │   ├── index.tsx
│   │   └── [sessionId].tsx
│   ├── library/
│   │   ├── index.tsx
│   │   ├── exercises/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── templates/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   └── programs/
│   │       ├── index.tsx
│   │       └── [id].tsx
│   └── profile/
│       ├── index.tsx
│       ├── history.tsx
│       ├── settings.tsx
│       ├── export.tsx
│       └── account.tsx
│
├── modals/
│   ├── plate-calculator.tsx
│   ├── one-rm-calculator.tsx
│   ├── rest-timer.tsx
│   ├── exercise-picker.tsx
│   ├── set-editor.tsx
│   ├── ai-assistant.tsx
│   ├── pr-celebration.tsx
│   └── workout-summary.tsx
│
└── [session]/
    └── active.tsx
```

### 5.3 Modal and Overlay Layers

| Layer | Z-Index | Content |
|---|---|---|
| Tab screens | 0 | Primary content |
| Active session floating bar | 10 | Session timer + return to workout |
| Bottom sheets | 20 | Set editor, exercise picker, rest timer |
| Full-screen modals | 30 | Active workout, plate calculator |
| Celebration overlays | 40 | PR badge moment |
| System toasts | 50 | Sync status, error notifications |

---

## 6. Data Models & Schema

All entities use a `string` UUID primary key generated client-side with `nanoid`. Every entity carries `createdAt`, `updatedAt`, and `syncedAt` audit fields. `TemplateExercise` and `TemplateSet` are first-class WatermelonDB Models (not JSON columns) — see section 4.2 for rationale.

### 6.1 User

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  unitPreference: 'kg' | 'lb';
  themePreference: 'dark' | 'light' | 'oled' | 'system';
  accentColour: string;
  defaultRestSeconds: number;
  oneRmFormula: 'epley' | 'brzycki' | 'lombardi' | 'oconner';
  trainingGoal: 'strength' | 'hypertrophy' | 'endurance' | 'general';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  dateOfBirth: string | null;
  subscriptionTier: 'free' | 'pro' | 'elite';
  subscriptionExpiresAt: string | null;
  appleHealthLinked: boolean;
  myFitnessPalLinked: boolean;
  isLocalOnly: boolean;          // true = no account, no sync
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

### 6.2 Exercise

```typescript
interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  movementPattern: MovementPattern;
  isCompound: boolean;
  isUnilateral: boolean;
  instructions: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isCustom: boolean;
  createdByUserId: string | null;
  isArchived: boolean;
  defaultRestSeconds: number | null;
  defaultRpeTarget: number | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

type ExerciseCategory =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable'
  | 'bodyweight' | 'kettlebell' | 'band' | 'cardio' | 'other';

type MovementPattern =
  | 'squat' | 'hinge' | 'push_horizontal' | 'push_vertical'
  | 'pull_horizontal' | 'pull_vertical' | 'carry' | 'rotation'
  | 'isolation' | 'cardio';

type MuscleGroup =
  | 'chest' | 'upper_back' | 'lats' | 'shoulders' | 'front_delt'
  | 'rear_delt' | 'biceps' | 'triceps' | 'forearms' | 'quads'
  | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'obliques'
  | 'lower_back' | 'traps' | 'neck';
```

### 6.3 WorkoutTemplate and Related Models

`TemplateExercise` and `TemplateSet` are first-class WatermelonDB Models with foreign keys, enabling reactive queries and relational access from the progression engine.

```typescript
interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  programId: string | null;
  estimatedDurationMinutes: number | null;
  targetMuscleGroups: MuscleGroup[];
  isBuiltIn: boolean;
  isArchived: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  // exercises: queried via WatermelonDB relation on TemplateExercise.templateId
}

// First-class WatermelonDB Model
interface TemplateExercise {
  id: string;
  templateId: string;            // FK to WorkoutTemplate
  exerciseId: string;            // FK to Exercise
  orderIndex: number;
  supersetGroupId: string | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  // sets: queried via WatermelonDB relation on TemplateSet.templateExerciseId
}

// First-class WatermelonDB Model
interface TemplateSet {
  id: string;
  templateExerciseId: string;    // FK to TemplateExercise
  orderIndex: number;
  setType: 'working' | 'warmup' | 'dropset' | 'failure';
  targetReps: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  targetWeightModifier: 'absolute' | 'percent_1rm' | 'percent_training_max' | 'bodyweight';
  targetRpe: number | null;
  isAmrap: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

### 6.4 Program

`templateIds` is replaced by a `ProgramSlot` junction model to support ordered, queryable week/day structure and allow the same template to appear in multiple weeks without duplication.

```typescript
interface Program {
  id: string;
  name: string;
  description: string;
  author: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  targetGoal: 'strength' | 'hypertrophy' | 'powerbuilding' | 'endurance';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  isBuiltIn: boolean;
  isPublic: boolean;
  deloadWeek: number | null;
  progressionRules: ProgressionRule[];  // JSON column acceptable here: not queried relationally
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  // slots: queried via WatermelonDB relation on ProgramSlot.programId
}

// Junction model replacing templateIds array
interface ProgramSlot {
  id: string;
  programId: string;             // FK to Program
  templateId: string;            // FK to WorkoutTemplate
  weekNumber: number;            // 1-indexed
  dayNumber: number;             // 1-indexed within week
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

interface ProgressionRule {
  exerciseId: string | null;
  type: 'linear' | 'percentage' | 'double_progression' | 'rpe_based';
  incrementKg: number | null;
  incrementLb: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  percentageBase: '1rm' | 'training_max';
  percentageValues: number[];
}
```

### 6.5 WorkoutSession

```typescript
interface WorkoutSession {
  id: string;
  userId: string;                // FK to User — required for multi-user backend scoping
  templateId: string | null;
  programId: string | null;
  programWeek: number | null;
  programDay: number | null;
  name: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  bodyweightKg: number | null;
  preworkoutMood: 'great' | 'good' | 'okay' | 'tired' | 'bad' | null;  // Captured at session start
  mood: 'great' | 'good' | 'okay' | 'tired' | 'bad' | null;            // Captured at session end
  perceivedExertion: number | null;
  location: string | null;
  totalVolumeKg: number | null;
  totalSets: number | null;
  totalReps: number | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

### 6.6 SessionExercise

```typescript
interface SessionExercise {
  id: string;
  userId: string;                // Denormalised for backend query scoping
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroupId: string | null;
  notes: string | null;
  restSeconds: number;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

### 6.7 Set

```typescript
interface Set {
  id: string;
  userId: string;                // Denormalised for backend query scoping
  sessionExerciseId: string;
  setNumber: number;
  setType: 'working' | 'warmup' | 'dropset' | 'failure';
  weightKg: number | null;       // Always stored in kg regardless of display unit
  weightKgActual: number | null; // The weight actually loaded (may differ from target if plate rounding applied)
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  duration: number | null;
  distance: number | null;
  isAmrap: boolean;
  isWarmup: boolean;
  isPersonalRecord: boolean;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

**Note on `weightKg` vs `weightKgActual`:** `weightKg` stores the user's target weight. `weightKgActual` stores the weight achievable with the user's available plates (computed by the plate calculator when the user confirms a rounding). If the user does not use the plate calculator, both values are identical. Analytics and PR detection use `weightKgActual` as the authoritative performance value. See section 7g.1 for the full rounding resolution flow.

### 6.8 PersonalRecord

```typescript
interface PersonalRecord {
  id: string;
  exerciseId: string;
  userId: string;
  setId: string;
  sessionId: string;
  recordType: 'weight' | 'reps' | 'volume' | 'estimated_1rm';
  value: number;
  previousValue: number | null;
  isCurrentRecord: boolean;
  achievedAt: string;
  formula: '1rm_epley' | '1rm_brzycki' | '1rm_lombardi' | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

**Sync conflict resolution for PersonalRecord:** If two devices both set a PR for the same `exerciseId + recordType` while offline, the conflict is resolved as follows: the higher `value` wins and is marked `isCurrentRecord: true`; the lower value is retained as a historical record with `isCurrentRecord: false`. On a tie in value, the earlier `achievedAt` wins (first to achieve that value is the canonical PR). This logic runs server-side during the pull phase and is applied to both records before they are pushed back to clients.

### 6.9 BodyMeasurement

```typescript
// Measurements sub-schema versioned independently
const MEASUREMENT_SCHEMA_VERSION = 1;

interface MeasurementValues {
  _version: number;              // Schema version for migration safety
  waist?: number;
  hips?: number;
  chest?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  neck?: number;
  shoulders?: number;
  calves?: number;
}

interface BodyMeasurement {
  id: string;
  userId: string;
  measuredAt: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  measurements: MeasurementValues;  // Validated on read/write via Zod schema
  notes: string | null;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
  photoBackUrl: string | null;
  source: 'manual' | 'apple_health' | 'myfitnesspal';
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

The `measurements` object is stored as a JSON text column in SQLite and validated on every read and write using a Zod schema pinned to `MEASUREMENT_SCHEMA_VERSION`. When new measurement types are added, the version is incremented and a migration function transforms older payloads on first read.

### 6.10 NutritionLog

```typescript
interface NutritionLog {
  id: string;
  userId: string;
  logDate: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  waterMl: number | null;
  source: 'manual' | 'apple_health' | 'myfitnesspal';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}
```

Nutrition data is enterable manually via Progress > Nutrition (see section 5.2 navigation). Manual entry is not limited to import-only. See section 7e.7 for the manual entry flow.

### 6.11 SupersetGroup

```typescript
interface SupersetGroup {
  id: string;                    // UUID, generated client-side
  sessionId: string | null;      // FK to WorkoutSession (null if template-level)
  templateId: string | null;     // FK to WorkoutTemplate (null if session-level)
  groupType: 'superset' | 'circuit';  // circuit = 3+ exercises
  maxSize: number;               // Enforced maximum: 6 exercises per group
  createdAt: string;
  updatedAt: string;
}
```

**SupersetGroup specification:**
- `id` is a UUID generated client-side at group creation time, referenced by `supersetGroupId` on `TemplateExercise` and `SessionExercise`
- Groups are scoped to either a session or a template, never both
- Minimum group size: 2 exercises. Maximum: 6 exercises. If a user removes an exercise leaving only 1 in a group, the group is dissolved and the remaining exercise becomes standalone
- A superset group cannot span exercises from different templates
- `groupType: 'circuit'` applies when 3 or more exercises are linked; rest fires only after all exercises in the circuit complete

### 6.12 SyncMetadata

```typescript
interface SyncMetadata {
  id: string;
  userId: string;                // Required: sync state is per-user per-device
  tableName: string;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  pendingChanges: number;
  conflictCount: number;
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  errorMessage: string | null;
}
```

---

## 7. Feature Specifications

---

### 7a. Workout Logging

#### 7a.1 Starting a Session

**Entry points:** Home "Start Workout" button, recent template quick-start cards, Library > Templates, Library > Programs > day.

**Start flow:**
1. Tap "Start Workout" → bottom sheet with three options: Empty session, From template, Continue program
2. If a session is already active: modal warns "You have an active session. Resume or discard?"
3. Session created in local DB immediately; timer starts
4. **Pre-workout mood capture:** A single-question prompt appears at session start — "How are you feeling?" with five options (great / good / okay / tired / bad). This is stored as `preworkoutMood` on `WorkoutSession` and is used for deload detection. It is dismissible in one tap.

**Session naming:** Auto-populated from template name; blank sessions get a time-based name ("Monday Evening Session"); user can rename by tapping the header.

#### 7a.2 Active Session Screen

```
┌─────────────────────────────────┐
│ ← Back    Push A — 42:17  ⋮    │
├─────────────────────────────────┤
│ Volume: 12,450 kg  Sets: 18     │
├─────────────────────────────────┤
│  BENCH PRESS                    │
│  ┌─────┬──────┬──────┬──────┐   │
│  │ SET │ PREV │  KG  │ REPS │   │
│  ├─────┼──────┼──────┼──────┤   │
│  │  W  │  60  │  60  │  10  │   │  ← Warmup (greyed, excluded from volume/PRs)
│  │  1  │ 100  │[102] │ [ 5] │✓  │  ← pending → active → completing → completed
│  │  2  │ 100  │[102] │ [ 5] │   │
│  │  3  │ 100  │[102] │ [ 5] │   │
│  │  + Add Set              │   │
│  └─────┴──────┴──────┴──────┘   │
│                                 │
│  OVERHEAD PRESS                 │
│  [collapsed — tap to expand]    │
│                                 │
│  + Add Exercise                 │
├─────────────────────────────────┤
│         [Finish Workout]        │
└─────────────────────────────────┘
```

**SetRow state machine (`pending → active → completing → completed`):**

| State | Visual |
|---|---|
| `pending` | Row at rest; weight/reps shown in muted colour; checkmark outlined |
| `active` | Row highlighted with accent-colour left border; inputs at full opacity |
| `completing` | Checkmark scales to 1.2× for 80ms (spring animation); row background flashes accent colour at 20% opacity |
| `completed` | Row background settles to subtle tint; checkmark filled; weight/reps values locked; a small PR badge appears inline if applicable |

After a set is completed, the next set row automatically transitions to `active` state and scrolls into view.

**Key UI behaviours:**
- Previous performance column shows last session's value, auto-populating weight/reps as defaults
- Inline editing: tapping weight or reps opens numeric keypad — no modal for simple edits
- Set completion: tap checkmark → optimistic UI update in < 16ms → DB write async → PR detection → rest timer → haptic
- Two-tap guarantee: from active session, if previous values are pre-populated, confirm a set = (1) tap checkmark, (2) done. No intermediate screen required
- Exercise reordering: long-press drag handle
- Swipe left on set row: reveals delete action
- Warmup sets: muted style; excluded from volume totals and PR detection

#### 7a.3 Set Editor (Bottom Sheet)

Triggered by tapping the set row area (not the checkmark). Provides full editing including RPE, set type, notes, AMRAP flag, and access to the plate calculator. Estimated 1RM is shown live.

#### 7a.4 Superset Support

See `SupersetGroup` model (section 6.11) for full specification. Rest timer does not start until the last exercise in the superset/circuit is completed.

#### 7a.5 Session Timer

Displays as `HH:MM:SS` in the header. Continues when backgrounded via Expo TaskManager. If phone is inactive > 4 hours, a prompt on return asks "Did you finish your workout?" to prevent runaway timers.

#### 7a.6 Session End Flow

1. Tap "Finish Workout"
2. Incomplete sets flagged with yellow warning (not blocked)
3. Post-workout mood captured: "How did that feel?" — same five options as pre-workout, stored as `mood`
4. Session summary modal shows: duration, volume, sets, PRs, volume delta vs last session, overall RPE input, and session notes field
5. Progression engine runs (see section 7c.2 for idempotency specification)

#### 7a.7 Retroactive Session Editing

Historical sessions are not strictly read-only. A user who logged the wrong weight may edit any set value via the session detail view. Edits are tracked: each changed field appends an entry to a `SetEdit` audit log (stored locally; not synced to server). The edit audit log distinguishes original logged values from corrections, which preserves PR integrity — a retroactive edit that would exceed a current PR triggers a prompt: "This edit would set a new PR. Apply it?" The user must explicitly confirm PR adjustments.

#### 7a.8 Edge Cases

| Scenario | Behaviour |
|---|---|
| App crash mid-session | Session state persisted to SQLite on every set completion; recoverable on relaunch |
| Network loss during session | Fully offline; zero impact on logging |
| User closes app mid-session | Floating "Return to workout" banner on home screen |
| Weight field left blank | Treated as bodyweight; 0 kg stored |
| Negative reps entered | Input validation rejects values < 1 |
| Session duration > 4 hours | Warning prompt; session data preserved regardless |

---

### 7b. Exercise Library

#### 7b.1 Exercise List Screen

500+ built-in exercises. Real-time search (debounced 150ms) across name, aliases, and muscle group names. Filter by muscle group, equipment, movement pattern, category, custom-only toggle, and favourites toggle.

#### 7b.2 Exercise Detail Screen

Shows: video thumbnail, primary/secondary muscles, equipment, pattern, personal records, e1RM sparkline, last 10 sessions history, instructions. "Add to workout" CTA.

#### 7b.3 Custom Exercise Creation

Fields: name (required, max 60 chars), aliases, category (required), primary muscles (required, max 3), secondary muscles (max 5), equipment, movement pattern, compound/unilateral toggles, photo, video (max 60s, transcoded to H.264 720p), instructions, default rest.

#### 7b.4 Built-In Exercise Coverage

| Category | Count |
|---|---|
| Barbell | 120 |
| Dumbbell | 95 |
| Machine | 80 |
| Cable | 60 |
| Bodyweight | 70 |
| Kettlebell | 35 |
| Band | 25 |
| Cardio | 25 |
| **Total** | **510** |

---

### 7c. Templates & Programs

#### 7c.1 Templates

A template is a reusable workout blueprint. Templates are not locked — the user deviates freely during a live session. Template editor supports drag-to-reorder, per-exercise set configuration using `TemplateExercise` and `TemplateSet` models (section 6.3), clone, and archive.

#### 7c.2 Programs

A program is a multi-week sequence of `ProgramSlot` entries linking templates to specific weeks and days, with built-in progression logic.

**Retroactive program adoption:** If a user has already logged sessions before starting a program, the program onboarding screen offers to infer training maxes from PR history (e.g., takes the best estimated 1RM from the last 8 weeks for each primary lift). The user can accept the inference or manually enter training maxes. The program only affects future sessions — historical data is not re-tagged with program metadata.

**Built-in programs at launch:**

| Program | Author | Duration | Days/Week |
|---|---|---|---|
| 5/3/1 (Boring But Big) | Jim Wendler | 16 weeks | 4 |
| GZCLP | Cody Lefever | Indefinite | 3 |
| PPL (Reddit) | Community | Indefinite | 6 |
| Starting Strength | Mark Rippetoe | 12 weeks | 3 |
| PHUL | Brandon Campbell | Indefinite | 4 |
| nSuns 5/3/1 | nSuns | Indefinite | 5–6 |

**Progression engine — idempotency and recovery:**

The progression engine runs on session completion. Its output (next session's target weights and sets) is written to a `ProgramProgressionSnapshot` record in the database, keyed to `(programId, userId, sessionId)`. The engine is **idempotent**: re-running it for the same `sessionId` produces the same output and overwrites (not duplicates) the existing snapshot.

If the app crashes before the engine runs, it is triggered automatically on the next app launch if an unprocessed session is detected (session has `endedAt` set but no associated `ProgramProgressionSnapshot`). The engine reads only committed session data from the database, so a crash during logging does not corrupt the progression calculation.

**Deload auto-detection — suppression rule:** Auto-deload suggestions are suppressed when the active program has a scheduled `deloadWeek` within the next two sessions. This prevents the suggestion banner from firing immediately before a planned deload week.

**Deload signals:**
- Volume load dropped > 15% over two consecutive weeks
- RPE average increased > 1.0 point over three sessions on the same exercise
- Session duration trend increasing without proportional volume increase
- `preworkoutMood` reported as "tired" or "bad" in 3+ of the last 5 sessions (note: uses `preworkoutMood`, not post-workout `mood`, for more reliable fatigue signal)

---

### 7d. Personal Records

#### 7d.1 PR Detection

PR detection runs synchronously on every set save. It is local and requires no network. Warmup sets are explicitly excluded inside the detection function — callers do not need to pre-filter.

**PR types:** maximum weight (any rep count), maximum reps at a given weight, estimated 1RM, total volume in a single set.

```typescript
function detectPersonalRecords(
  newSet: Set,
  exercise: Exercise,
  historicalSets: Set[]
): PersonalRecord[] {
  // Explicitly exclude warmup sets — do not rely on caller to pre-filter
  const eligibleHistory = historicalSets.filter(
    s => s.setType !== 'warmup' && !s.isWarmup
  );
  const newPRs: PersonalRecord[] = [];

  // Also exclude the new set itself if it's a warmup
  if (newSet.setType === 'warmup' || newSet.isWarmup) return newPRs;

  const newEstimated1RM = compute1RM(newSet.weightKgActual ?? newSet.weightKg, newSet.reps);
  const best1RM = Math.max(0, ...eligibleHistory.map(s =>
    compute1RM(s.weightKgActual ?? s.weightKg, s.reps)
  ));
  if (newEstimated1RM > best1RM)
    newPRs.push(createPRRecord('estimated_1rm', newEstimated1RM));

  const maxWeight = Math.max(0, ...eligibleHistory.map(s => s.weightKgActual ?? s.weightKg ?? 0));
  if ((newSet.weightKgActual ?? newSet.weightKg ?? 0) > maxWeight)
    newPRs.push(createPRRecord('weight', newSet.weightKgActual ?? newSet.weightKg!));

  const newVolume = (newSet.weightKgActual ?? newSet.weightKg ?? 0) * (newSet.reps ?? 0);
  const maxVolume = Math.max(0, ...eligibleHistory.map(s =>
    (s.weightKgActual ?? s.weightKg ?? 0) * (s.reps ?? 0)
  ));
  if (newVolume > maxVolume)
    newPRs.push(createPRRecord('volume', newVolume));

  return newPRs;
}
```

#### 7d.2 PR Celebration Modal

Animates in without interrupting session flow. Auto-dismisses after 5 seconds. Multiple PRs queue sequentially. Shows previous value, new value, and delta.

#### 7d.3 PR History Screen

Progress > Records. Per-exercise: current PR values, date achieved, sparkline. Filterable by muscle group, date range, PR type. Sortable by most recent, % improvement, exercise name.

---

### 7e. Analytics & Progress Tracking

#### 7e.1 Analytics Hub

All charts are interactive — pinch to zoom, drag to pan, tap data points for exact values. Overview cards: this week summary, training streak, volume trend vs last week, AI-suggested next targets.

#### 7e.2 Volume Load Charts

Y-axis: total volume (kg). X-axis: date. Toggle per-session / weekly / monthly. Filter by exercise or muscle group. Moving average overlay (7-day or 4-week). Deload periods highlighted. **Downsampling:** LTTB (Largest Triangle Three Buckets) algorithm capped at 200 points — preserves visual shape of the volume curve better than uniform stride.

#### 7e.3 Estimated 1RM Over Time

Line chart per exercise. Up to 4 exercises overlaid. Tappable data points. Trend line with R² displayed. Dashed projected trend. **Downsampling:** max-per-period aggregation (not average) — the highest e1RM in each period is the meaningful data point for strength tracking, not the mean.

#### 7e.4 Muscle Group Frequency Heatmap

Bar chart of sessions per muscle group per week. Colour coding: green (recommended range), yellow (slightly off), red (significantly off). Recommendation ranges are research-backed defaults, adjustable in Settings.

#### 7e.5 Progressive Overload Tracker

Per exercise: weight progression over time, consecutive sessions at same weight (stall detection), percentage improvement per month. **Plateau detection rule:** If estimated 1RM is within 1% across 3+ sessions spanning 2+ weeks, the exercise is flagged. Badge appears in the library; AI assistant is proactively notified.

#### 7e.6 Session Duration Trends

Bar chart of session duration per workout with volume overlay. Alert if duration increases > 20% without proportional volume increase.

#### 7e.7 Nutrition Logging and Correlation

**Manual entry:** Progress > Nutrition provides a daily nutrition log screen. Fields: calories, protein, carbs, fat, fibre, water, notes. Quick-entry from home screen dashboard for yesterday's totals. Source defaults to `'manual'`.

**Correlation charts:** When nutrition data is available (manual or import):
- Scatter plot: daily calories vs session volume
- Line chart: protein intake vs e1RM trend
- Surplus/deficit periods annotated on strength charts

---

### 7f. Rest Timer

#### 7f.1 Architecture

Works when screen is locked, app is backgrounded. States: `idle → counting → alert → dismissed`.

#### 7f.2 Per-Exercise Rest Defaults

| Exercise type | Default rest |
|---|---|
| Heavy compound (> 85% 1RM) | 3:00 |
| Moderate compound | 2:00 |
| Isolation / accessory | 1:00 |
| Superset (within group) | 0:00 |
| Superset (between circuits) | 1:30 |

Override hierarchy: User global default → Exercise-level default → Template-level default → Session-level override.

#### 7f.3 Alert System

On timer zero: (1) haptic notification pattern, (2) audio alert (5 selectable sounds), (3) lock screen notification with next set details. User can dismiss, add time (+30/+60/+90), or skip.

#### 7f.4 Lock Screen Widget

iOS Live Activities (ActivityKit via native module): shows countdown and next set details; skip and +30s actions without unlocking.

---

### 7g. Plate Calculator & 1RM Calculator

#### 7g.1 Plate Calculator

**Target weight vs actual loaded weight resolution:**

If the calculated `shortfall > 0` (target is not achievable with the user's plate set), the UI shows:

```
Target: 102.5 kg
Closest achievable: 101 kg  (shortfall: 1.5 kg)
[Use 101 kg]  [Cancel]
```

If the user taps "Use 101 kg":
- `Set.weightKg` is set to 102.5 kg (the intended target, for reference)
- `Set.weightKgActual` is set to 101 kg (the weight actually on the bar)
- A small indicator in the set row shows "≈101 kg" to signal rounding

If the user taps "Cancel", they return to the calculator to adjust. PR detection and analytics always use `weightKgActual`. The UI always displays `weightKgActual` during and after sessions.

**Modes:** Barbell (20 kg standard), barbell (15 kg women's), EZ bar (10 kg), trap bar (30 kg), dumbbell, custom bar weight. Full kg/lb support with mid-session unit switching.

#### 7g.2 1RM Calculator

| Formula | Equation | Notes |
|---|---|---|
| Epley | `weight × (1 + reps / 30)` | Best for reps 1–10 |
| Brzycki | `weight × 36 / (37 - reps)` | Slightly more conservative |
| Lombardi | `weight × reps^0.10` | Better for higher rep ranges |
| O'Conner | `weight × (1 + reps / 40)` | Simpler |

Context note in UI: "1RM estimates become less accurate above 10 reps." "Use as new PR?" button for manual recording.

---

### 7h. Body Measurements & Weight Tracking

#### 7h.1 Data Entry

Quick weigh-in widget on home screen (single tap, one number, save). Full measurement entry modal from Progress > Body. Fields: weight, body fat %, 10 measurement dimensions, photos (front/side/back), notes. Apple Health pull on first link; continuous nightly sync.

#### 7h.2 Charts

Body weight: line chart with daily points, 7-day moving average, goal weight dashed line, rate-of-change annotation. Body fat and lean mass overlays. Measurements chart with normalised display (start = 100%). Photo timeline with side-by-side comparison mode. Dual-axis correlation: body weight vs e1RM for selected exercise.

---

### 7i. Workout History & Calendar

#### 7i.1 Session History

Reverse-chronological list. Search by session name, exercise, date range. Filters: date range, exercises included, duration, volume, PRs only, template used.

#### 7i.2 Session Detail View

Read-only by default. Edit mode available (see section 7a.7 for retroactive editing). Add retroactive note, share, delete (30-day undo from cloud), clone as template.

#### 7i.3 Calendar Heatmap

Cell colour intensity encodes volume. Tap day → session summary. Swipe to navigate months. Year view (52-week GitHub-style overview). Training streak displayed.

---

### 7j. Cloud Sync & Backup

#### 7j.1 Sync Strategy

**Tier 1 — iCloud (iOS only):** Automatic, background, no configuration. CloudKit private database, end-to-end encrypted.

**Tier 2 — Custom backend sync:** Required for Android, cross-platform, and AI features. Opt-in via account creation.

**Local-only mode (Android and iOS):** A user who dismisses the sign-in screen enters local-only mode. The `User.isLocalOnly` flag is set to `true`. The app functions fully — all core features work with no degradation. A persistent but dismissible banner appears on the Profile tab: "Your data is stored only on this device. Create an account to enable backup and sync." AI features display a gate prompt (see section 8). No automatic data loss occurs, but the user is clearly informed there is no backup. This warning is repeated once per 30 days until the user either creates an account or explicitly dismisses the reminder permanently.

#### 7j.2 Sync Protocol

1. **Push:** Client sends all locally created/updated records since `lastPushedAt`
2. **Pull:** Server sends all changes since `lastPulledAt` for this user
3. **Conflict resolution:** Last-write-wins by `updatedAt`; exceptions: set deletion is never overwritten by creation; `endedAt` is never overwritten by null
4. **PR conflict resolution:** See section 6.8

**Sync frequency:** Foreground every 60 seconds; background every 15 minutes; immediate pull on launch; immediate push on session end.

#### 7j.3 Conflict Scenarios

| Scenario | Resolution |
|---|---|
| Same set edited on two devices | Last `updatedAt` wins |
| Set deleted on A, edited on B | Deletion wins |
| Session ended on A while open on B | `endedAt` from A applied; B shows "Session ended on another device" |
| PR set on two devices (same exercise+type) | Higher value wins; tie goes to earlier `achievedAt` |
| Custom exercise created on both devices with same name | Both preserved; user prompted to merge or keep both |

#### 7j.4 Backup

Automatic: full JSON export nightly to iCloud Drive (iOS) / Google Drive (Android). Last 30 backups retained. Manual: Profile > Export > "Create Backup Now" → encrypted ZIP.

---

### 7k. Data Import/Export

#### 7k.1 Export Formats

JSON (full), CSV (sessions), CSV (sets), CSV (body metrics), JSON (single program). Export flow: Profile > Export → select format → select date range → select data types → generate → share sheet.

#### 7k.2 Strong App Import

**Unit handling:** The import flow includes a unit selection step before parsing begins:

```
┌─────────────────────────────────┐
│   Import from Strong            │
│                                 │
│   What unit does your Strong    │
│   export use?                   │
│                                 │
│   ○ Kilograms (kg)              │
│   ● Pounds (lb)                 │
│                                 │
│   [Continue]                    │
└─────────────────────────────────┘
```

If the user selects lb, all weight values are converted to kg (× 0.453592) before being written to the database. The conversion is displayed in the preview: "Weights converted from lb to kg."

**Import process:**
1. Unit selection screen
2. File picker → validate CSV structure
3. Parse with progress bar
4. Exercise name fuzzy matching (Levenshtein distance < 3)
5. Disambiguation screen for unmatched exercises
6. Preview: "Found 324 sessions, 2,847 sets, 47 exercises"
7. User confirms; background worker executes import
8. "Import complete. 324 sessions added."

Target: > 95% successful row import rate. Failures logged and downloadable.

#### 7k.3 JSON Import (Restore)

Accepts full backup JSON. Validates schema version. Applies migrations if older. User chooses: merge or replace (destructive, with confirmation).

---

### 7l. Settings & Customization

#### 7l.1 Settings Screen Hierarchy

```
Settings
├── Account
│   ├── Profile (name, avatar)
│   ├── Subscription status
│   ├── Link additional sign-in provider
│   └── Sign out / Delete account
├── Units & Defaults
│   ├── Weight unit (kg / lb)
│   ├── Distance unit (km / mi)
│   ├── Default rest time
│   ├── Default RPE display
│   └── 1RM formula preference
├── Appearance
│   ├── Theme (system / light / dark / OLED)
│   ├── Accent colour (12 swatches + custom hex)
│   └── Text size (5 levels)
├── Rest Timer
│   ├── Auto-start on set completion
│   ├── Alert type (haptic, sound, both)
│   ├── Alert sound selector
│   └── Lock screen widget enabled
├── Notifications
│   ├── Rest timer alerts
│   ├── Weekly summary
│   ├── Streak reminders
│   ├── PR celebrations
│   └── Sync status alerts
│   ├── Show session on watch
│   ├── Rest timer on watch
│   └── Haptic intensity
├── Apple Health
│   ├── Read body weight
│   ├── Write workout data
│   └── Sync frequency
├── Data & Privacy
│   ├── Backup settings
│   ├── Export data
│   ├── Import data
│   ├── Clear cache
│   └── Privacy policy
└── About
    ├── Version + Changelog
    ├── Feedback
    └── Rate the app
```

#### 7l.2 Accent Colour System

Applied to: tab bar active icon, primary action buttons, chart line (default), PR badge, active set highlight. Default: Electric Blue (`#007AFF`). Twelve pre-set swatches plus custom hex input.

#### 7l.3 OLED Dark Mode

All backgrounds use `#000000` (true black) in OLED mode, reducing power consumption on OLED displays. A meaningful differentiator for night-time gym sessions.

---


#### 7m.1 Architecture

Native SwiftUI companion app communicating via WatchConnectivity. All writes proxied through the iOS app — Watch never writes directly to SQLite. Watch changes queued when phone is out of range and replayed on reconnect.

**Watch queue capacity:** The Watch-to-phone queue holds a maximum of 50 pending set-completion events (approximately 2–3 full sessions). If the queue approaches 80% capacity (40 events), the Watch UI displays a warning indicator: "Sync pending — keep phone nearby." At 100% capacity (50 events), new set completions are blocked on Watch with a prompt: "Connect to your phone to continue logging." WatchConnectivity message size limits are handled by batching set events into arrays before transmission.

#### 7m.2 Watch Screens

Home (active session): session name, timer, exercise name, set number, weight × reps, Done button. Rest timer: countdown, progress arc, Done and +30s buttons. Glance (no active session): last session summary, days since last workout, quick-start button.

#### 7m.3 Watch Complications

| Complication | Content |
|---|---|
| Modular small | Streak counter |
| Modular large | Last session date + volume |
| Circular | Rest timer countdown (during session) |
| Graphic bezel | Weekly volume progress ring |

---

### 7n. Notifications & Rest Timer Alerts

#### 7n.1 Notification Types

| Notification | Trigger | Priority |
|---|---|---|
| Rest timer complete | Timer reaches zero | High (immediate) |
| Weekly summary | Sunday 8pm | Default |
| Streak reminder | No session logged by 8pm on scheduled day | Low |
| PR milestone | New all-time PR | Default |
| Sync failure | 3 failed sync attempts | Default |
| Deload suggestion | Auto-detected | Default |

#### 7n.2 Notification Permissions

Requested after the user's third session. Custom pre-permission screen explains what will be sent before the system dialogue.

---

### 7o. AI Workout Suggestions

> Requires an active account and network connectivity. Degrades to rule-based suggestions offline.

#### 7o.1 Feature Overview

Powered by Claude API on the backend. Provides: pre-session suggestions, plateau detection, deload recommendations, conversational interface, program adjustments.

#### 7o.2 Conversational Interface

Chat-style UI in a modal. AI initiates with a session-specific greeting. User can ask free-form questions. Responses are markdown-formatted with structured action cards where applicable (e.g., "Apply this weight change to tomorrow's session" button).

#### 7o.3 Context Sent to Claude API

**Context format:** The full 12 weeks of raw sets is not transmitted. Instead, the server aggregates training data into a compact weekly summary per exercise before sending to the API. This reduces context size from a potential 20–50KB of raw set data to approximately 3–5KB of structured summaries, lowering per-request cost while preserving the information needed for pattern detection.

```json
{
  "user_profile": {
    "experience_level": "intermediate",
    "training_goal": "strength",
    "active_program": "5/3/1 BBB",
    "unit_preference": "kg"
  },
  "training_summary": {
    "weeks": [
      {
        "week_start": "2026-05-25",
        "exercises": [
          {
            "name": "Barbell Back Squat",
            "sessions": 2,
            "weekly_max_e1rm_kg": 162.5,
            "avg_rpe": 7.8,
            "total_volume_kg": 3900,
            "set_count": 15
          }
        ],
        "preworkout_moods": ["good", "okay"],
        "total_session_count": 4
      }
    ]
  },
  "personal_records": {
    "Barbell Back Squat": { "estimated_1rm_kg": 162.5 }
  },
  "plateau_flags": ["Romanian Deadlift — no 1RM progress in 4 sessions"],
  "body_metrics": {
    "weight_trend": "stable",
    "current_weight_kg": 82.5
  }
}
```

#### 7o.4 AI Feature Limitations & Guardrails

- Queries mentioning pain or injury are redirected to a healthcare professional
- Suggestions are labelled as suggestions, not prescriptions
- AI can be disabled entirely in Settings
- All conversations stored locally; user-deletable
- Rate limiting: 20 queries/day (Pro tier), unlimited (Elite tier). Free tier: AI not available (see section 8)

---

### 7p. Social Features

> Phase 2 — not in v1.0 scope.

Follow system, PR sharing, community program library, coach mode (trainer assigns programs, reviews logs, comments on sessions), leaderboards. All social features are opt-in. Default: private account. Coach mode requires explicit client invitation.

---

## 8. Subscription Tier & Feature Gate Matrix

### 8.1 Tier Definitions

| Tier | Price | Target user |
|---|---|---|
| Free | $0/month | New users; occasional loggers |
| Pro | $9.99/month (or $79.99/year) | Dedicated lifters; primary target |
| Elite | $19.99/month (or $159.99/year) | Data nerds; coaches; power users |

### 8.2 Feature Gate Matrix

| Feature | Free | Pro | Elite |
|---|---|---|---|
| **Core Logging** | | | |
| Workout logging (unlimited sessions) | ✓ | ✓ | ✓ |
| Exercise library (500+ built-in) | ✓ | ✓ | ✓ |
| Custom exercises | 5 max | Unlimited | Unlimited |
| Templates (create and use) | 3 max | Unlimited | Unlimited |
| Rest timer | ✓ | ✓ | ✓ |
| Plate & 1RM calculator | ✓ | ✓ | ✓ |
| PR detection and history | ✓ | ✓ | ✓ |
| **Programs** | | | |
| Run built-in programs | 1 active | Unlimited | Unlimited |
| Create custom programs | ✗ | ✓ | ✓ |
| Progression engine (auto weight calc) | ✓ (built-in only) | ✓ | ✓ |
| Deload auto-detection | ✓ (banner only) | ✓ (full) | ✓ (full) |
| **Analytics** | | | |
| Session history (full) | Last 90 days | Unlimited | Unlimited |
| Volume load charts | Basic (no drill-down) | Full interactive | Full interactive |
| Estimated 1RM charts | ✓ (current exercise) | All exercises | All exercises |
| Muscle group frequency heatmap | ✗ | ✓ | ✓ |
| Progressive overload tracker | ✗ | ✓ | ✓ |
| Plateau detection | ✗ | ✓ | ✓ |
| Nutrition correlation charts | ✗ | ✗ | ✓ |
| Training calendar heatmap | ✓ (month view) | ✓ (year view) | ✓ (year view) |
| **Body Metrics** | | | |
| Body weight logging | ✓ | ✓ | ✓ |
| Full measurement dimensions | ✗ | ✓ | ✓ |
| Progress photos | ✗ | ✓ | ✓ |
| Body metrics correlation charts | ✗ | ✓ | ✓ |
| **Sync & Backup** | | | |
| iCloud sync (iOS) | ✓ | ✓ | ✓ |
| Cross-platform backend sync | ✗ | ✓ | ✓ |
| Automatic nightly backup | ✗ | ✓ | ✓ |
| Manual export (JSON, CSV) | ✓ | ✓ | ✓ |
| Strong import | ✓ | ✓ | ✓ |
| **AI Features** | | | |
| AI workout suggestions | ✗ | ✓ (20/day) | ✓ (unlimited) |
| Conversational AI assistant | ✗ | ✓ | ✓ |
| AI program adjustments | ✗ | ✓ | ✓ |
| Rest timer on Watch | ✓ | ✓ | ✓ |
| Set logging on Watch | ✗ | ✓ | ✓ |
| Watch complications | ✗ | ✓ | ✓ |
| **Notifications** | | | |
| Rest timer alerts | ✓ | ✓ | ✓ |
| Weekly summary | ✗ | ✓ | ✓ |
| Streak reminders | ✗ | ✓ | ✓ |
| Lock screen Live Activity | ✗ | ✓ | ✓ |
| **Phase 2 (v2.0)** | | | |
| Social features | ✗ | ✓ | ✓ |
| Coach mode | ✗ | ✗ | ✓ |
| Raw data API access | ✗ | ✗ | ✓ |

### 8.3 Gate UX

When a Free user hits a gated feature, a bottom sheet appears:

```
┌─────────────────────────────────┐
│  This feature is in Pro         │
│                                 │
│  Plateau detection helps you    │
│  break through stalls with      │
│  data-driven suggestions.       │
│                                 │
│  Pro: $9.99/month               │
│  Elite: $19.99/month            │
│                                 │
│  [Start 14-day free trial]      │
│  [See all Pro features]         │
│  [Not now]                      │
└─────────────────────────────────┘
```

- Gate prompts are shown at most twice per feature per 7-day period
- Free trial: 14 days Pro, no credit card required, converts to paid or downgrades automatically
- Strong import users receive a 30-day Pro trial on first import completion

### 8.4 Free Tier Experience When Hitting Limits

| Limit | User experience |
|---|---|
| Custom exercises at 5 | Cannot create a 6th; existing 5 function fully; prompt to upgrade |
| Templates at 3 | Cannot create a 4th; existing 3 function fully; prompt to upgrade |
| Session history > 90 days | Older sessions are not deleted — they are archived and inaccessible until upgrade; a count is shown: "47 older sessions available on Pro" |
| Analytics features gated | Feature card shown with a lock icon and one-line description; tapping opens upgrade sheet |

---

## 9. UI/UX Design System

### 9.1 Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Display | SF Pro Rounded | 34pt | Bold |
| Title 1 | SF Pro Display | 28pt | Bold |
| Title 2 | SF Pro Display | 22pt | Semibold |
| Title 3 | SF Pro Text | 20pt | Semibold |
| Headline | SF Pro Text | 17pt | Semibold |
| Body | SF Pro Text | 17pt | Regular |
| Subheadline | SF Pro Text | 15pt | Regular |
| Footnote | SF Pro Text | 13pt | Regular |
| Caption | SF Pro Text | 12pt | Regular |
| Numeric (weights) | SF Mono | 20pt | Medium |

Android uses Roboto in equivalent weight/size roles.

### 9.2 Colour Tokens

```typescript
const colours = {
  background: {
    primary:   { dark: '#000000', oled: '#000000', light: '#F2F2F7' },
    secondary: { dark: '#1C1C1E', oled: '#111111', light: '#FFFFFF' },
    tertiary:  { dark: '#2C2C2E', oled: '#1A1A1A', light: '#F2F2F7' },
    elevated:  { dark: '#3A3A3C', oled: '#222222', light: '#FFFFFF' },
  },
  label: {
    primary:   { dark: '#FFFFFF', light: '#000000' },
    secondary: { dark: '#EBEBF599', light: '#3C3C4399' },
    tertiary:  { dark: '#EBEBF54D', light: '#3C3C434D' },
    disabled:  { dark: '#EBEBF530', light: '#3C3C4330' },
  },
  system: {
    blue: '#007AFF', green: '#34C759', orange: '#FF9500', red: '#FF3B30',
    purple: '#AF52DE', yellow: '#FFCC00', pink: '#FF2D55', teal: '#5AC8FA',
  },
  semantic: {
    success: '#34C759', warning: '#FF9500', error: '#FF3B30',
    info: '#007AFF', pr: '#FFD700', plateau: '#FF9500',
  },
  separator: { dark: '#38383A', light: '#C6C6C8' },
};
```

### 9.3 Spacing System (8pt base grid)

| Token | Value | Usage |
|---|---|---|
| spacing.xs | 4pt | Icon padding, compact labels |
| spacing.sm | 8pt | Component internal padding |
| spacing.md | 16pt | Standard content padding |
| spacing.lg | 24pt | Section spacing |
| spacing.xl | 32pt | Screen-level margins |
| spacing.xxl | 48pt | Hero sections |

### 9.4 Border Radius

| Token | Value | Usage |
|---|---|---|
| radius.xs | 4pt | Tags, chips |
| radius.sm | 8pt | Input fields, small cards |
| radius.md | 12pt | Cards, bottom sheet handles |
| radius.lg | 16pt | Modals, bottom sheets |
| radius.xl | 24pt | Large cards |
| radius.full | 9999pt | Pills, avatars, FABs |

### 9.5 Component Library

| Component | Description |
|---|---|
| `SetRow` | Single set with state machine (pending/active/completing/completed), weight/reps inputs, checkmark |
| `ExerciseCard` | Collapsible exercise in session containing set rows |
| `RestTimerRing` | Animated SVG countdown ring |
| `PRBadge` | Gold badge on set and exercise |
| `VolumeBar` | Horizontal progress relative to target |
| `MuscleHeatmap` | Front/back silhouette with muscle highlighting |
| `SessionCard` | History list item |
| `ChartContainer` | Wrapper with zoom/pan gesture support |
| `FilterChip` | Dismissible filter pill |
| `BottomSheet` | Draggable bottom sheet with snap points |
| `NumericKeypad` | Custom keypad with weight/reps formatting |
| `ProgressRing` | Circular progress indicator |
| `Sparkline` | Mini inline chart |
| `SyncIndicator` | Animated sync status icon |
| `PlateVisualiser` | Visual plate layout on barbell |
| `ToastMessage` | Auto-dismissing notification |
| `GatePrompt` | Subscription upgrade bottom sheet |

### 9.6 Animation Principles

| Principle | Application |
|---|---|
| Physical feel | Spring physics throughout (not easing curves) |
| Instant response | Scale 0.97 touch feedback within 1 frame |
| Meaningful motion | Animate only on state change |
| Reduced motion | All non-essential animations off when system Reduce Motion is on |
| Delight moments | PR celebration: particle burst; set completion: haptic + micro-animation |

### 9.7 Haptic Design

| Event | Pattern |
|---|---|
| Set completed (no PR) | Light impact |
| Set completed (PR) | Success notification |
| Rest timer complete | Notification pattern (1 long + 2 short) |
| Drag reorder drop | Medium impact |
| Error / validation fail | Error notification |
| Toggle on | Light impact |

---

## 10. State Management Architecture

### 10.1 Approach

Zustand for UI state. WatermelonDB reactive queries for data state. Separation keeps the data layer independent of React's render cycle.

### 10.2 Key Zustand Stores

```typescript
interface ActiveSessionStore {
  sessionId: string | null;
  sessionName: string;
  startedAt: Date | null;
  elapsedSeconds: number;
  exercises: SessionExercise[];
  activeSetId: string | null;
  startSession: (templateId?: string) => Promise<void>;
  endSession: () => Promise<SessionSummary>;
  addExercise: (exerciseId: string) => void;
  completeSet: (setId: string, data: SetData) => Promise<PR[]>;
  updateSet: (setId: string, data: Partial<SetData>) => void;
  deleteSet: (setId: string) => void;
  reorderExercises: (from: number, to: number) => void;
}

interface RestTimerStore {
  state: 'idle' | 'counting' | 'alert' | 'dismissed';
  targetSeconds: number;
  remainingSeconds: number;
  exerciseName: string | null;
  nextSetDescription: string | null;
  startTimer: (seconds: number, context?: TimerContext) => void;
  addTime: (seconds: number) => void;
  dismiss: () => void;
}

interface UIStore {
  activeTab: 'home' | 'progress' | 'log' | 'library' | 'profile';
  bottomSheetContent: 'setEditor' | 'exercisePicker' | 'restTimer' | null;
  toasts: Toast[];
  isOffline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  showToast: (toast: Toast) => void;
  dismissToast: (id: string) => void;
  setBottomSheet: (content: UIStore['bottomSheetContent']) => void;
}
```

### 10.3 Optimistic Updates

For set completion (most latency-sensitive operation):

1. Zustand store updates immediately (optimistic) → UI re-renders < 16ms
2. WatermelonDB write happens asynchronously
3. PR detection runs after successful write
4. If write fails: toast error + rollback store state

This ensures the UI reflects completion in < 16ms. DB write confirmation (the 300ms SLA) is separate from the user-facing interaction — see section 12.1.

---

## 11. Offline-First Architecture

### 11.1 Offline Guarantee and Local-Only Mode

**Always offline (zero connectivity required):** All workout logging, exercise library, templates, programs, PR detection, all analytics, rest timer, calculators, body metrics, session history, full settings.

**Local-only mode on Android:** When a user installs the app on Android and declines account creation, they enter local-only mode. All core features function identically. The following are unavailable: cloud sync, AI assistant (gate prompt shown), Watch set logging (Watch rest timer still works). A persistent dismissible banner informs the user their data has no backup. The banner re-surfaces every 30 days unless permanently dismissed.

**Requires connectivity:** AI assistant (degrades to rule-based suggestions), cloud sync (queues changes for later).

### 11.2 Network Detection and Sync Queue

```typescript
import NetInfo from '@react-native-community/netinfo';

const NetworkService = {
  isConnected: false,
  init() {
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      if (!wasConnected && this.isConnected) SyncService.triggerSync();
    });
  }
};
```

Sync queue is bounded at 10,000 changes. If exceeded, completed-session sets are compressed into a batch payload. All writes are wrapped in transactions; FK constraints enforced at application layer; rollback available on every write failure.

---

## 12. Performance Requirements

### 12.1 Latency Targets — Precise Definitions

The "two-tap set completion" guarantee has two distinct components:

| Guarantee | Definition | Target | Measurement |
|---|---|---|---|
| UI responsiveness | Time from tap to UI reflecting set as completed (optimistic) | < 16ms (1 frame) | Render timing instrumentation |
| DB write confirmation | Time from tap to WatermelonDB write confirmed | < 300ms (p95) | E2E instrumented test |
| Sync acknowledgement | Time from DB write to server sync push ack | Not guaranteed; async | Server sync log |

Users perceive the UI responsiveness guarantee. The DB write guarantee is a data integrity SLA. Sync is best-effort and never blocks UX.

| Other Interaction | Target | Method |
|---|---|---|
| Session screen initial load | < 500ms | Time from navigation start to LCP |
| Exercise search first result | < 150ms | Time from keystroke to list update |
| Analytics chart render | < 800ms | Time from tab focus to chart visible |
| App cold start | < 2.5s | Icon tap to home screen interactive |
| App warm start | < 300ms | App switch to interactive |

### 12.2 List Performance

All long lists use FlatList with: `getItemLayout`, `maxToRenderPerBatch={10}`, `windowSize={5}`, stable `keyExtractor`, `removeClippedSubviews={true}`, `React.memo` items with custom comparison.

### 12.3 Database Performance

Indexed columns: `exercise_id`, `session_id`, `user_id`, `created_at`, `updated_at`. Compound index on `(exercise_id, created_at)` for exercise history. PR detection uses indexed lookup. Analytics queries run on a read-only connection.

### 12.4 Chart Downsampling Strategy

- **Volume load charts:** LTTB (Largest Triangle Three Buckets) algorithm, max 200 points. Preserves visual shape of the curve including local peaks and valleys.
- **Estimated 1RM charts:** Max-per-period aggregation (weekly). The highest e1RM in each week is the meaningful data point; averaging would obscure peak performance.
- **Muscle frequency heatmap:** No downsampling required; data is already aggregated by week.
- **Body weight chart:** Mean-per-day with 7-day moving average computed server-side for datasets > 365 days.

### 12.5 Memory Management

Images: Expo Image, 50MB LRU disk cache. Videos: streamed. Exercise library: loaded once into normalised store. Charts: downsampled per section 12.4.

---

## 13. Accessibility Requirements

### 13.1 Standards

WCAG 2.1 AA on iOS and Android. All screens tested with VoiceOver and TalkBack.

### 13.2 Visual Accessibility

Minimum 4.5:1 contrast for text; 3:1 for UI components. No colour-only indicators. All text uses system dynamic type. All animations respect `useReducedMotion()`.

### 13.3 Screen Reader Labels

| Element | Label |
|---|---|
| Set row (pending) | "Set 1, 102 kilograms, 5 reps, not completed" |
| Set row (completed) | "Set 1, 102 kilograms, 5 reps, completed, personal record" |
| Complete set button | "Mark set 1 complete" |
| Rest timer | "Rest timer, 1 minute 47 seconds remaining" |
| PR badge | "Personal record" |
| Chart | "Bench press estimated 1RM trend. Increased from 120 to 142 kilograms over 12 weeks" |
| Plate visualiser | "Barbell loaded with 2 × 20 kg and 1 × 2.5 kg plates per side. Total weight: 85 kilograms" |
| Gate prompt | "Pro feature. [Feature name] is available on the Pro plan. Activate free trial button." |

### 13.4 Motor Accessibility

Minimum tap target: 44×44pt. Set completion checkmark: 48×48pt. Swipe-to-delete alternative: long-press context menu. Drag-to-reorder alternative: up/down arrow buttons in edit mode. Full keyboard navigation on iPad.

### 13.5 Cognitive Accessibility

Consistent back navigation. Two-step confirmation for destructive actions. Plain-language error messages. 30-second undo toast for destructive operations.

---

## 14. Testing Strategy

### 14.1 Test Pyramid

```
        ┌─────────────┐
        │  E2E Tests   │  ~35 tests (Maestro)
        └──────┬───────┘
        ┌──────▼───────┐
        │ Integration  │  ~150 tests (Jest + Testing Library)
        └──────┬───────┘
        ┌──────▼───────┐
        │  Unit Tests  │  ~420 tests (Jest)
        └──────────────┘
```

### 14.2 Unit Tests

Coverage targets: > 90% business logic, > 80% UI components.

| Suite | Key cases |
|---|---|
| `pr-detection.test.ts` | Warmup sets explicitly excluded inside function; PR on new max; no false PR on equal weight |
| `one-rm-calculator.test.ts` | All four formula accuracy; edge cases (reps = 1, reps > 15) |
| `plate-calculator.test.ts` | Exact weight achievable; shortfall resolved correctly; `weightKgActual` written |
| `progression-engine.test.ts` | Idempotent on same sessionId; deload week suppression; linear increment |
| `strong-import-parser.test.ts` | lb-to-kg conversion; valid CSV parsed; malformed rows skipped |
| `sync-conflict-resolution.test.ts` | Last-write-wins; deletion beats creation; PR conflict (higher value wins) |
| `session-volume.test.ts` | Volume excludes warmup; unilateral counted ×2 |
| `superset-group.test.ts` | Dissolution on single remaining exercise; max size enforcement |
| `measurement-schema.test.ts` | Zod validation rejects malformed; version migration applied on read |

### 14.3 Integration Tests

| Test | Scope |
|---|---|
| Active session flow | Start → add exercise → complete 3 sets → end → verify summary |
| PR celebration | Set beats PR → modal → PR written to DB using `weightKgActual` |
| Rest timer | Set completed → timer → zero → notification → dismiss |
| Sync push | Create session offline → connect → sync → server receives |
| Import flow (lb) | Load Strong lb CSV → unit selected → converted → session count verified |
| Progression snapshot | Session ended → snapshot written → re-run is idempotent |
| Gate prompt | Free user taps gated feature → gate sheet appears |
| Local-only warning | Android no-auth → banner shown → re-surfaces after 30 days |

### 14.4 E2E Tests (Maestro)

```yaml
# e2e/log-a-workout.yaml
appId: com.thegymapp
---
- launchApp
- tapOn: "Start Workout"
- tapOn: "Empty Session"
- tapOn: "Add Exercise"
- tapOn: "Barbell Back Squat"
- tapOn: "Add to workout"
- inputText:
    id: "weight-input-1"
    text: "100"
- inputText:
    id: "reps-input-1"
    text: "5"
- tapOn:
    id: "complete-set-1"
- assertVisible: "Rest Timer"
- tapOn: "Skip timer"
- tapOn: "Finish Workout"
- assertVisible: "Workout Complete"
```

**Critical E2E paths:**
1. Full workout log (start → sets → finish → summary)
2. Template-based session
3. Program progression (week 1 complete → week 2 updated weights)
4. PR detection and celebration
5. Strong import with lb unit selection
6. Export and share
8. Offline session with subsequent sync
9. Subscription gate prompt and trial activation
10. Local-only Android mode — banner displayed, core logging works

### 14.5 Performance and Regression Testing

- Startup time: Flipper Performance Plugin
- SQLite query plans: all analytics queries analysed
- Memory profiling: Android Studio + Xcode Instruments
- E2E tests run in CI on every PR to `main`; unit/integration on every commit
- Device matrix: iPhone 12 mini, iPhone 16 Pro Max, Pixel 7
- OS matrix: iOS 16, iOS 18; Android 12, Android 14

---

## 15. Phased Development Roadmap

### 15.1 Phase 0 — Foundation (Weeks 1–8)

Expanded from 6 to 8 weeks. The sync API contract is defined in Phase 0 even though the server is not built until Phase 2 — this prevents rework when the backend sync layer is implemented.

| Deliverable | Week |
|---|---|
| Project scaffold (Expo, TypeScript, NativeWind) | 1 |
| WatermelonDB schema v1 — all 12 entities + migration infrastructure | 1–3 |
| Sync API contract defined (schema + endpoint spec, server not yet built) | 2–3 |
| Navigation structure (Expo Router) | 3 |
| Design system tokens + base components | 3–4 |
| Exercise library (static data, list, detail) | 4–5 |
| Basic workout logger (no template, no timer) | 5–7 |
| Local PR detection (warmup exclusion verified in unit tests) | 7–8 |
| Subscription tier data model + gate prompt component (no payment) | 8 |

**Phase 0 gate:** All 12 database entities defined, migrated, and covered by unit tests. Sync API contract reviewed and signed off by engineering and backend.

### 15.2 Phase 1 — MVP (Weeks 9–18)

**Goal:** Feature-complete core for internal testing. No sync, no AI, no payment.

| Feature | Week |
|---|---|
| Rest timer (in-app) | 9–10 |
| Templates + program structure (TemplateExercise/TemplateSet as Models) | 10–12 |
| ProgramSlot junction model + program detail view | 12–13 |
| Session history + calendar heatmap | 13–14 |
| Plate calculator (with shortfall resolution + weightKgActual) | 14 |
| 1RM calculator | 14 |
| Body metrics logging + manual nutrition entry | 14–15 |
| Basic analytics (volume + e1RM charts with LTTB downsampling) | 15–17 |
| Strong import (with unit selection step) | 17 |
| Export (JSON + CSV) | 17–18 |
| Settings screen + onboarding flow | 18 |

**MVP gate:** Internal testers can log full workout, see history, run Strong import (including lb-to-kg conversion), and hit a gate prompt on Pro features. Crash-free rate > 99% in TestFlight.

### 15.3 Phase 2 — v1.0 Beta (Weeks 19–28)

**Goal:** Full v1.0 feature set; external beta users; payment integration.

| Feature | Week |
|---|---|
| iCloud sync (iOS) | 19–21 |
| Backend setup (Node.js + PostgreSQL + tRPC) | 19–21 |
| Apple Sign In + Google Sign In + local-only mode | 21–22 |
| Google/Apple account linking (cross-platform portability) | 22 |
| Cross-platform backend sync (Android) | 22–24 |
| Subscription payment (App Store + Google Play) + gate enforcement | 23–25 |
| Lock screen Live Activity | 27 |
| Advanced analytics (heatmap, nutrition correlation) | 26–28 |
| AI programming assistant (Claude API, aggregated context) | 27–28 |
| Push notifications (full suite) | 28 |
| Built-in programs (all six) | 28 |

### 15.4 Phase 3 — v1.0 Launch (Weeks 29–34)

| Activity | Week |
|---|---|
| Beta feedback integration | 29–30 |
| Performance profiling + optimisation | 30–31 |
| Accessibility audit + remediation | 31–32 |
| App Store assets + submission | 32–33 |
| Launch monitoring + hotfix team on standby | 34 |

### 15.5 Phase 4 — v2.0 (Weeks 35+)

| Feature | Quarter |
|---|---|
| Social follow + workout feed | Q3 2026 |
| PR share cards | Q3 2026 |
| Community program library | Q3 2026 |
| Coach mode | Q4 2026 |
| Garmin + Whoop integration | Q4 2026 |
| Android home screen widget | Q4 2026 |
| Video form analysis (on-device ML) | Q4 2026 |
| Raw data API access (Elite tier) | Q1 2027 |

---

## 16. Success Metrics

### 16.1 Technical KPIs

| Metric | Target | Measurement |
|---|---|---|
| Set completion UI latency | < 16ms (1 frame, p95) | Render timing instrumentation |
| Set completion DB write | < 300ms (p95) | E2E instrumented test |
| App cold start | < 2.5s (p95) | Firebase Performance Monitoring |
| Crash-free sessions | > 99.5% | Sentry crash reporting |
| Sync conflict rate | < 0.1% of sessions | Server sync conflict log |
| Strong import success rate | > 95% of rows | Import telemetry |
| Background sync success | > 98% | Server sync log |

### 16.2 Business KPIs

| Metric | Target | Timeline |
|---|---|---|
| App Store rating (iOS) | > 4.7 | Within 6 months |
| Day-1 retention | > 60% | At launch |
| Day-7 retention | > 45% | At launch |
| Day-30 retention | > 25% | At launch |
| Conversion Free → Pro | > 12% of MAU | Within 3 months |
| Monthly churn (Pro) | < 5% | Within 6 months |
| Strong import completion | > 80% of users who attempt | At launch |

### 16.3 Engagement KPIs

| Metric | Target |
|---|---|
| Sessions logged per active user per week | > 3.5 |
| Analytics screen DAU as % of total DAU | > 40% |
| AI assistant interaction rate (Pro) | > 30% weekly |
| Rest timer usage rate | > 70% of sessions |
| Template usage rate | > 60% of sessions |

### 16.4 Instrumentation

All key events via PostHog (self-hosted). No PII transmitted. User IDs anonymised. Opt-out in Settings > Privacy.

```typescript
Analytics.track('session_started', { templateId, isFromProgram, subscriptionTier });
Analytics.track('set_completed', { exerciseId, isPR, hasRpe, weightKgActualDiffersFromTarget });
Analytics.track('rest_timer_dismissed', { remainingSeconds });
Analytics.track('gate_prompt_shown', { feature, tier });
Analytics.track('trial_activated', { fromFeature });
Analytics.track('ai_assistant_opened', {});
Analytics.track('import_completed', { rowCount, successRate, unitConversionApplied });
Analytics.track('sync_completed', { changesCount, conflictCount });
Analytics.track('local_only_warning_shown', { timesShown });
```

---

## 17. Known Risks & Mitigations

### 17.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| WatermelonDB sync edge cases cause data loss | Medium | Critical | Extensive sync unit tests; 30-day server change log; user-visible conflict resolution; `PersonalRecord` conflict specified |
| RN New Architecture instability with WatermelonDB | Medium | High | Pin RN version; fallback to bridge mode; monitor RN release notes |
| Expo managed workflow limits Watch connectivity | High | Medium | Evaluate bare workflow ejection; EAS Build custom native modules |
| Claude API cost overruns at scale | Medium | High | Aggregated context (not raw sets); server-side rate limiting; response caching; cost alerts at 80% budget |
| Strong import format changes | Low | Medium | Parser modular and versioned; monitor Strong release notes |
| SQLite performance on large datasets (5+ years) | Low | Medium | Pagination; pre-aggregated summary tables; archiving strategy |
| Watch queue overflow | Low | Medium | 50-event cap; 80% warning indicator; block logging at 100% with user prompt |
| TemplateExercise as first-class Model adds join overhead | Low | Low | Indexed FKs on all joins; lazy-loaded via WatermelonDB relations |

### 17.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Users do not adopt AI assistant | Medium | Medium | Surface proactively; home screen nudge; onboarding tutorial |
| Strong user base does not migrate | High | Medium | Perfect import (including unit handling); 30-day Pro trial on import completion |
| Subscription price resistance | Medium | High | Free tier with genuine core value; 14-day trial; convert through demonstrated value |
| Free tier limits feel punitive | Medium | Medium | 90-day history window is generous; archiving rather than deletion communicates respect for data |

### 17.3 Competitive Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Strong releases AI feature | Medium | High | Speed to market; differentiate on analytics depth and program intelligence |
| New well-funded competitor | Low | Medium | Deepen data moat; community features create stickiness |
| Hevy gains significant analytics | Medium | Medium | Focus on power user tier Hevy explicitly does not serve |

### 17.4 Regulatory & Privacy Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Health data regulation changes | Low | High | Body metrics are fitness data, not medical; stored locally; privacy policy reviewed by counsel |
| App Store subscription policy changes | Low | Medium | Full compliance with App Store guidelines |
| GDPR / data deletion requirements | Low | Medium | Full account + data deletion within 30 days (automated); export available before deletion |

---

## 18. Security & Data Protection

This section was identified as a gap in v1.1 and is added here as a required engineering reference. All items are in-scope for Phase 2 and must be reviewed before beta release.

### 18.1 Transport Security

All API communication uses TLS 1.3. Certificate pinning is applied to the tRPC backend and the sync API endpoints via a native module. The app fails closed on a pin mismatch — API calls are blocked and the user is shown: "A security check failed. Please update the app or contact support." CloudKit communication relies on Apple's own TLS infrastructure and does not require additional pinning.

### 18.2 Authentication & Token Handling

Auth tokens (Apple/Google) are stored in the iOS Keychain and the Android Keystore — never in AsyncStorage or SQLite. Token refresh is handled silently in the background; a failed refresh after 3 retries triggers a re-authentication prompt. The backend issues short-lived JWTs (15-minute expiry) with rotating refresh tokens (30-day expiry, single-use). Refresh token rotation invalidates the previous token on the server immediately.

### 18.3 Local Data Encryption

SQLite databases on device are not encrypted by default (WatermelonDB does not support SQLCipher out of the box). Progress photo files stored locally are protected by the device's file-level encryption (iOS Data Protection class `NSFileProtectionComplete`; Android equivalent via the Keystore-backed file encryption). Users who are particularly sensitive about local data are directed to enable device-level biometric lock, which is surfaced once during onboarding.

> **Engineering note:** SQLCipher integration for WatermelonDB is a Phase 2 investigation item (risk: performance overhead). The decision to adopt it must be made before beta launch and requires a migration path for existing unencrypted databases.

### 18.4 API Security

- All sync and AI endpoints require a valid JWT; unauthenticated requests return 401
- Rate limiting: 300 requests/minute per user on sync; 20 AI requests/day on Pro (enforced server-side, not client-side)
- Input validation via Zod on every inbound API payload; malformed payloads are rejected with 400 and logged
- AI endpoint: user query content is validated for maximum length (2,000 characters); any query containing PII patterns (email, phone number) triggers a warning and is stripped before forwarding to the Claude API
- The server never logs raw user query content; only anonymised metadata (query length, feature used, response confidence) is retained

### 18.5 Data Minimisation

The Claude API receives only the aggregated training summary defined in section 7o.3. Raw set data, personal identifiers, and conversation history are never transmitted to the AI provider. Server-side AI response caching is keyed to a hash of the training summary — the hash is computed client-side and sent; the server uses it as a cache key without needing the underlying data.

### 18.6 Account Deletion

On account deletion:
1. User receives a confirmation email with a 48-hour cancellation window
2. After 48 hours: all server-side records are permanently deleted from PostgreSQL within 24 hours
3. CloudKit data is deleted via the CloudKit API immediately on deletion confirmation
4. Local SQLite databases are not automatically wiped (device data is the user's property); the user is offered a "Clear all local data" option as part of the deletion flow
5. A deletion confirmation email is sent on completion
6. The backend retains only anonymised, non-linkable aggregate analytics (total session count bucket, subscription tier history) for business reporting — no personal data

---

## 19. Error Handling & Degraded State Standards

This section was absent from v1.1 and is added to ensure consistent error surface across the product. Engineers must implement these standards in every feature area.

### 19.1 Error Classification

| Class | Description | User-visible? | Examples |
|---|---|---|---|
| `RECOVERABLE` | Transient; retrying is likely to succeed | Toast with retry action | Network timeout, sync push fail |
| `USER_ACTION` | User must take a step to resolve | In-context inline message | Invalid import file, storage full |
| `DEGRADED` | Feature unavailable; core app works | Banner or disabled state | AI down, sync service outage |
| `FATAL` | App cannot continue; must restart | Full-screen error with crash report | DB corruption, migration failure |

### 19.2 Standard Error UI Patterns

**Toast (RECOVERABLE):**
```
[!] Sync failed — tap to retry           [Retry]
```
Auto-dismisses in 6 seconds if user does not interact. Maximum 2 toasts visible simultaneously; additional toasts queue.

**Inline (USER_ACTION):**
Displayed directly below the offending input field. Red text, no icon, plain language. Clears on correction.

**Degraded banner (DEGRADED):**
```
[~] AI suggestions are temporarily unavailable. Rule-based hints are active.
```
Amber colour. Dismissible. Does not block any interaction.

**Fatal screen (FATAL):**
Full-screen. Dark background. Displays: "Something went wrong" headline, plain-language description, "Send crash report" and "Restart app" buttons. Crash report bundles: SQLite schema version, last 50 sync events, device model, OS version. No user data included.

### 19.3 DB Write Failure Handling

If a WatermelonDB write fails after the optimistic UI update (section 10.3):
1. Zustand store is rolled back to the pre-write state
2. The set row returns to `active` state with a red left border
3. A toast appears: "Set could not be saved — tap to retry"
4. Retry re-attempts the write up to 3 times with exponential backoff (500ms, 1s, 2s)
5. After 3 failures, a `FATAL` class error is raised and the session is flagged for manual recovery on next launch

### 19.4 Sync Error Handling

| Condition | Behaviour |
|---|---|
| Push fails (network) | Queue retained; retry on next foreground cycle; toast shown after 2nd failure |
| Push fails (server 5xx) | Exponential backoff; sync status indicator turns amber |
| Pull returns conflict | Conflict resolution runs silently; user notified only if a PR was affected (section 6.8) |
| Pull fails (auth) | Token refresh attempted; if fails, user shown re-auth prompt |
| Schema version mismatch | App prompts user to update; sync blocked until update |

### 19.5 Import Error Handling

Partial import failures do not block the overall import. Each row is processed independently. Failed rows are collected and written to an error report file accessible from the import completion screen: "312 sessions imported. 12 rows skipped — view details." The error report lists the row number, the raw content, and the failure reason (e.g., "Invalid date format", "Unknown exercise name").

---

## Appendix A: Third-Party Dependencies

| Package | Version | Purpose | License |
|---|---|---|---|
| `expo` | ~52.x | Managed workflow framework | MIT |
| `react-native` | 0.74.x | UI framework | MIT |
| `expo-router` | ~3.x | File-based navigation | MIT |
| `@nozbe/watermelondb` | ^0.27 | Local database + sync | MIT |
| `zustand` | ^4.x | UI state management | MIT |
| `nativewind` | ^4.x | Tailwind CSS for RN | MIT |
| `react-native-reanimated` | ^3.x | Animations | MIT |
| `victory-native` | ^40.x | Charts (Skia-based) | MIT |
| `expo-image` | ~1.x | Image display + caching | MIT |
| `@react-native-community/netinfo` | ^11.x | Network status | MIT |
| `react-native-watch-connectivity` | ^1.x | Watch bridge | MIT |
| `expo-sqlite` | ~13.x | SQLite adapter | MIT |
| `expo-task-manager` | ~11.x | Background tasks | MIT |
| `expo-notifications` | ~0.28.x | Push notifications | MIT |
| `expo-haptics` | ~12.x | Haptic feedback | MIT |
| `expo-file-system` | ~16.x | File access | MIT |
| `expo-sharing` | ~11.x | Share sheet | MIT |
| `expo-document-picker` | ~11.x | File picker | MIT |
| `expo-camera` | ~15.x | Custom exercise video | MIT |
| `@expo/vector-icons` | ^14.x | Icons | MIT |
| `nanoid` | ^5.x | UUID generation | MIT |
| `date-fns` | ^3.x | Date formatting | MIT |
| `zod` | ^3.x | Runtime type validation (incl. measurement schema) | MIT |

---

## Appendix B: API Response Contracts

### AI Assistant Endpoint

```typescript
// POST /api/ai/suggest
interface AISuggestRequest {
  userId: string;                     // Anonymised hash
  query: string;
  context: AggregatedTrainingContext; // Weekly summaries, not raw sets
  conversationHistory: ConversationMessage[];
}

interface AISuggestResponse {
  suggestion: string;                 // Markdown-formatted
  structuredActions: ProgramAdjustment[] | null;
  confidence: 'high' | 'medium' | 'low';
  disclaimer: string | null;
  tokensUsed: number;
}

interface ProgramAdjustment {
  type: 'weight_change' | 'volume_change' | 'rest_change' | 'deload';
  exerciseId: string | null;
  description: string;
  valueDelta: number | null;
  applyNow: boolean;
}
```

### Sync Endpoint

```typescript
// POST /api/sync/push
interface SyncPushRequest {
  userId: string;
  changes: {
    [tableName: string]: {
      created: Record<string, unknown>[];
      updated: Record<string, unknown>[];
      deleted: string[];
    };
  };
  lastPulledAt: string | null;
}

// POST /api/sync/pull
interface SyncPullResponse {
  changes: SyncPushRequest['changes'];
  timestamp: string;
  prConflictsResolved: PRConflictResolution[];  // Notify client of resolved PR conflicts
}

interface PRConflictResolution {
  exerciseId: string;
  recordType: string;
  winningValue: number;
  losingValue: number;
  resolution: 'higher_value_wins' | 'earlier_date_wins';
}
```

---

## 20. Team Sign-Off

**Document:** The Gym App — Comprehensive Product Plan v1.2
**Approval date:** 2026-06-06
**Approved by:** Team Lead

---

### Final Review Notes

This document has been reviewed in full at the team lead level. The following observations are recorded for the engineering team before development begins.

**Additions in v1.2:**

Section 18 (Security & Data Protection) was absent from v1.1 and has been added in full. Token storage, TLS pinning, API input validation, data minimisation for the AI layer, and the account deletion flow are now specified. The SQLCipher investigation is formally flagged as a required decision point before beta launch — this is not optional.

Section 19 (Error Handling & Degraded State Standards) has been added. The absence of a unified error classification and UI pattern standard in a product of this complexity would produce inconsistent user experience across feature areas. Engineers must treat section 19 as binding, not advisory.

**Items to resolve before Phase 0 gate:**

1. Confirm EAS Build supports the Watch connectivity native module without bare workflow ejection. If it does not, the bare workflow decision must be made at project scaffold, not mid-Phase 2.
2. Confirm the sync API contract (section 4.3, sections 15.1 and Appendix B) has been reviewed by the backend lead and locked before WatermelonDB schema work begins.
3. Assign ownership of the SQLCipher investigation to a named engineer with a Phase 2 week-19 deadline for a go/no-go decision.

**Items to resolve before MVP gate (Phase 1 end):**

4. Accessibility audit of the SetRow component specifically — it is the highest-frequency interaction in the app and the labels defined in section 13.3 must be verified against VoiceOver in a real device build, not simulator.
5. The PostHog instrumentation events in section 16.4 must be implemented and verified against a staging instance before beta opens to external users. Launching with broken analytics forfeits the ability to make data-driven decisions during the most critical retention window.

**Standing decisions confirmed:**

- WatermelonDB with first-class TemplateExercise/TemplateSet models: confirmed. The join overhead is acceptable given indexed FKs.
- LTTB for volume charts, max-per-period for e1RM charts: confirmed. Both downsampling strategies are now documented in sections 7e.2, 7e.3, and 12.4.
- Aggregated training context to Claude API (not raw sets): confirmed. Section 7o.3 specifies the exact payload structure.
- weightKgActual as the authoritative value for PR detection and analytics: confirmed. All references are consistent across sections 6.7, 7d.1, and 7g.1.
- Local-only mode as a first-class supported state, not an error state: confirmed. The 30-day re-surface cadence for the backup warning is intentional — it is a safety net, not a nag.

**On scope and ambition:**


The product ambition is correct. There is a genuine gap in the market between Strong (fast but dumb) and coach-led apps (smart but slow). This plan occupies that gap with precision.

---

| Role | Name | Status |
|---|---|---|
| Team Lead | — | APPROVED |
| Lead Product Designer | — | Submitted v1.1 |
| Engineering Lead | — | Pending Phase 0 gate sign-off |
| Backend Lead | — | Pending sync contract review |
| QA Lead | — | Pending test plan expansion for sections 18–19 |

*All role holders are expected to confirm their section-specific sign-offs before the Phase 0 gate date. This document is the single source of truth from this point forward. Changes require a version increment and team lead re-approval.*

---

*End of Document — The Gym App Comprehensive Product Plan v1.2*
*Team lead approval pass completed 2026-06-06. Sections 18 (Security) and 19 (Error Handling) added. Five pre-Phase-0 action items recorded above. Document status: APPROVED for development.*