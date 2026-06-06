import { Platform } from 'react-native';

type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

interface TextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  fontFamily: string;
  letterSpacing?: number;
}

const IOS_SANS = 'System';
const IOS_MONO = 'SF Mono';
const ANDROID_SANS = 'Roboto';
const ANDROID_MONO = 'monospace';

const sansFamily = Platform.select({ ios: IOS_SANS, android: ANDROID_SANS, default: ANDROID_SANS });
const monoFamily = Platform.select({ ios: IOS_MONO, android: ANDROID_MONO, default: ANDROID_MONO });

export const typography = {
  /**
   * display — 34pt / Bold
   * Use for hero numbers, workout completion callouts.
   */
  display: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: 'bold' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: 0.37,
  } satisfies TextStyle,

  /**
   * title1 — 28pt / Bold
   * Screen titles, modal headers.
   */
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 'bold' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: 0.36,
  } satisfies TextStyle,

  /**
   * title2 — 22pt / Semibold
   * Section headers, exercise names in detail views.
   */
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: 0.35,
  } satisfies TextStyle,

  /**
   * title3 — 20pt / Semibold
   * Card titles, template names.
   */
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: 0.38,
  } satisfies TextStyle,

  /**
   * headline — 17pt / Semibold
   * Tab bar labels, button labels, list section headers.
   */
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: -0.41,
  } satisfies TextStyle,

  /**
   * body — 17pt / Regular
   * Primary reading text, set notes, AI assistant messages.
   */
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: -0.41,
  } satisfies TextStyle,

  /**
   * subheadline — 15pt / Regular
   * Secondary labels, exercise muscle group tags.
   */
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: -0.24,
  } satisfies TextStyle,

  /**
   * footnote — 13pt / Regular
   * Timestamps, metadata, sync status labels.
   */
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: -0.08,
  } satisfies TextStyle,

  /**
   * caption — 12pt / Regular
   * Chart axis labels, badge text, legal disclaimers.
   */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as FontWeight,
    fontFamily: sansFamily,
    letterSpacing: 0,
  } satisfies TextStyle,

  /**
   * numeric — 20pt / Medium (monospaced)
   * Set row weight and reps fields. Monospaced prevents layout shift as digits change.
   */
  numeric: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '500' as FontWeight,
    fontFamily: monoFamily,
    letterSpacing: 0,
  } satisfies TextStyle,

  /**
   * numericLg — 32pt / Bold (monospaced)
   * Rest timer countdown, 1RM display, large stat callouts.
   */
  numericLg: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 'bold' as FontWeight,
    fontFamily: monoFamily,
    letterSpacing: 0,
  } satisfies TextStyle,
} as const;

export type TypographyRole = keyof typeof typography;
