import type { TrainingGoal, ExperienceLevel } from '../types/enums';

interface BuiltInProgram {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
  daysPerWeek: number;
  goal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  deloadWeek: number | null;
  tags: string[];
}

export const BUILT_IN_PROGRAMS: readonly BuiltInProgram[] = [
  {
    id: 'prog_531_bbb',
    name: '5/3/1 BBB',
    description:
      "Jim Wendler's 5/3/1 with the Boring But Big accessory template. Four training days per week built around four core lifts — squat, bench, deadlift, and overhead press. Each lift follows a three-week wave of 5, 3, and 1+ sets at increasing percentages of your training max, then resets with a small load increase. BBB accessories add five sets of ten at 50–60 % on the same or opposite lift for hypertrophy volume. A programmed deload every fourth week keeps fatigue in check. Ideal for intermediate lifters seeking steady long-term strength progression.",
    totalWeeks: 16,
    daysPerWeek: 4,
    goal: 'strength',
    experienceLevel: 'intermediate',
    deloadWeek: 4,
    tags: ['powerlifting', 'strength', 'barbell', '5/3/1', 'wendler', 'intermediate'],
  },
  {
    id: 'prog_gzclp',
    name: 'GZCLP',
    description:
      "Cody LeFever's GZCLP (Garage Zombie Cinderella Linear Progression) is a three-day-per-week beginner programme built on three tiers of exercise intensity and volume. Tier 1 lifts (squat, bench, deadlift, OHP) use a 5×3 scheme with heavy loads and automatic weight progression every session. Tier 2 accessories use 3×10 at moderate loads. Tier 3 isolation work rounds out the session. When a Tier 1 lift stalls, the rep scheme resets and restarts at a lower weight, making failure a built-in progression mechanism rather than a dead end. No programmed deload — beginners recover quickly enough that a deload is rarely needed.",
    totalWeeks: 12,
    daysPerWeek: 3,
    goal: 'strength',
    experienceLevel: 'beginner',
    deloadWeek: null,
    tags: ['beginner', 'linear progression', 'barbell', 'three day', 'gzclp'],
  },
  {
    id: 'prog_ppl',
    name: 'PPL',
    description:
      "A six-day Push/Pull/Legs split targeting hypertrophy through high weekly frequency and volume. Each muscle group is trained twice per week across push days (chest, shoulders, triceps), pull days (back, biceps), and leg days (quads, hamstrings, glutes, calves). Progressive overload is applied weekly via additional reps before weight increases. The high volume and frequency make this programme best suited to intermediate trainees who can recover from six sessions per week. A deload is scheduled at week eight to manage accumulated fatigue.",
    totalWeeks: 12,
    daysPerWeek: 6,
    goal: 'hypertrophy',
    experienceLevel: 'intermediate',
    deloadWeek: 8,
    tags: ['hypertrophy', 'PPL', 'six day', 'push pull legs', 'bodybuilding', 'intermediate'],
  },
  {
    id: 'prog_starting_strength',
    name: 'Starting Strength',
    description:
      "Mark Rippetoe's Starting Strength is the canonical beginner barbell programme. Three days per week on alternating A and B workouts, built around the squat (every session), bench or press (alternating), deadlift (every session on A), and power clean or barbell row (every session on B). Load increases every single session by a fixed increment. No deload is prescribed — when linear progression stalls the programme transitions to an intermediate approach. The simplicity and aggression of the loading make it the fastest way for a true beginner to build a strength base.",
    totalWeeks: 12,
    daysPerWeek: 3,
    goal: 'strength',
    experienceLevel: 'beginner',
    deloadWeek: null,
    tags: ['beginner', 'linear progression', 'barbell', 'rippetoe', 'three day', 'starting strength'],
  },
  {
    id: 'prog_phul',
    name: 'PHUL',
    description:
      "Power Hypertrophy Upper Lower (PHUL) by Brandon Campbell combines powerlifting and bodybuilding principles across four training days per week. Two upper-body days and two lower-body days are divided into power-focused sessions (heavy triples to fives on the main lifts) and hypertrophy-focused sessions (moderate weight, 8–12 rep ranges with accessory exercises). The combination produces strength and size gains simultaneously, making it well suited to intermediate lifters who have exhausted beginner linear progression but are not yet ready for a full powerlifting-style peaking cycle. A deload is scheduled at week six.",
    totalWeeks: 12,
    daysPerWeek: 4,
    goal: 'powerbuilding' as TrainingGoal,
    experienceLevel: 'intermediate',
    deloadWeek: 6,
    tags: ['powerbuilding', 'upper lower', 'four day', 'PHUL', 'strength', 'hypertrophy', 'intermediate'],
  },
  {
    id: 'prog_nsuns',
    name: 'nSuns 5/3/1',
    description:
      "A high-volume 5/3/1 variant created by Reddit user nSuns. Five training days per week, each anchored by a main lift following an extended multi-set ladder (AMRAP set followed by four back-off sets with prescribed reps and percentages), a secondary lift, and accessory work. The programme generates significantly more weekly volume than classic 5/3/1, accelerating strength and muscle gains at the cost of higher recovery demands. Auto-regulation is built in — the weight for the next cycle is calculated from your AMRAP performance. A deload is scheduled every fourth week. Best suited to intermediate lifters who are comfortable with the base 5/3/1 structure.",
    totalWeeks: 16,
    daysPerWeek: 5,
    goal: 'strength',
    experienceLevel: 'intermediate',
    deloadWeek: 4,
    tags: ['5/3/1', 'nsuns', 'high volume', 'five day', 'strength', 'intermediate', 'barbell'],
  },
] as const;
