import type { DestinationEvidenceSource } from '../content/prompt';

export type ResearchSourceType = 'official' | 'primary' | 'reputable' | 'local';

export interface ResearchSourceDefinition {
  publisher: string;
  sourceType: ResearchSourceType;
  title: string;
  url: string;
}

export interface CollectedResearchSource extends DestinationEvidenceSource {
  contentHash: string;
  fetchedAt: Date;
  sourceText: string;
  sourceType: ResearchSourceType;
}

export interface ResearchQualityIssue {
  code:
    | 'insufficient_evidence'
    | 'insufficient_publishers'
    | 'insufficient_sources'
    | 'missing_official_source';
  detail: string;
}

export interface ResearchQualityReport {
  evidenceCharacters: number;
  issues: ResearchQualityIssue[];
  passed: boolean;
  publisherCount: number;
  sourceCount: number;
}

export interface DestinationResearchBundle {
  quality: ResearchQualityReport;
  sources: CollectedResearchSource[];
}
