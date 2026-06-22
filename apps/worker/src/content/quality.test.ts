import { describe, expect, it } from 'vitest';

import {
  calculateTextSimilarity,
  evaluateEditorialText,
  evaluateSourceUseCoverage,
} from './quality';

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

  it('rejects close reproduction of supplied research evidence', () => {
    const evidence =
      'The eastern entrance opens before sunrise and the local shuttle stops beside the ticket office. ';
    const report = evaluateEditorialText(evidence.repeat(8), {
      ...relaxedThresholds,
      maximumSourceSimilarity: 0.42,
      sourceTexts: [evidence.repeat(8)],
    });

    expect(report.issues.map((issue) => issue.code)).toContain('source_overlap');
  });

  it('requires valid evidence indexes across every factual guide section', () => {
    const issues = evaluateSourceUseCoverage(
      [
        {
          claimSummary: 'The first source supports only the opening destination overview.',
          sectionKeys: ['overview'],
          sourceIndex: 4,
        },
      ],
      3,
    );

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['insufficient_source_coverage', 'invalid_source_reference']),
    );
  });
});
