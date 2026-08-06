export enum FluencyClassification {
  FLUENT = 'Fluent',
  MODERATELY_FLUENT = 'Moderately Fluent',
  DISFLUENT = 'Disfluent',
  VERY_DISFLUENT = 'Very Disfluent',
}

export enum ProsodyClassification {
  NATURAL = 'natural',
  FLAT = 'flat',
  EXAGGERATED = 'exaggerated',
  ERRATIC = 'erratic',
}

export enum SessionResult {
  PASS = 'pass',
  FAIL = 'fail',
}

export enum SupportedLanguage {
  EN = 'en',
  KN = 'kn',
  TE = 'te',
  HI = 'hi',
  TA = 'ta',
  OR = 'or',
  GU = 'gu',
  NE = 'ne',
}

export const SUPPORTED_LANGUAGES: readonly string[] = Object.values(SupportedLanguage);
