import { describe, expect, it } from 'vitest';

import { calculateTextSimilarity, evaluateEditorialText } from './quality';

const relaxedThresholds = {
  maximumAverageSentenceWords: 30,
  maximumWords: 500,
  minimumWords: 1,
  primaryKeyword: 'Udaipur travel guide',
};

describe('editorial quality gate', () => {
  it('accepts concise, practical writing', () => {
    const report = evaluateEditorialText(
      'Take the morning train if it suits your route. Carry water for the walk. Local buses cover the central neighbourhoods.',
      relaxedThresholds,
    );

    expect(report.passed).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('rejects travel clichés and unsafe certainty claims', () => {
    const report = evaluateEditorialText(
      'Embark on an unforgettable journey to a hidden gem. This district is 100% safe for every visitor.',
      relaxedThresholds,
    );

    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['absolute_claim', 'editorial_cliche']),
    );
  });

  it('rejects keyword stuffing and close reuse of an earlier article', () => {
    const repeated =
      'Udaipur travel guide explains the lake route and the quiet morning market for a two day visit. ';
    const text = repeated.repeat(8);
    const report = evaluateEditorialText(text, {
      ...relaxedThresholds,
      maximumKeywordDensityPercent: 2.5,
      maximumPriorSimilarity: 0.68,
      priorTexts: [text],
    });

    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['keyword_stuffing', 'too_similar']),
    );
    expect(calculateTextSimilarity(text, text)).toBe(1);
  });
});
