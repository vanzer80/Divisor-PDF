export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export enum ProcessStage {
  QUEUED = 'QUEUED',
  ANALYZING = 'ANALYZING',
  SPLITTING = 'SPLITTING',
  DONE = 'DONE',
}

export enum PageStatus {
  PROCESSING = 'PROCESSING',
  OK = 'OK',
  ERROR = 'ERROR',
}

export enum ExtractionMode {
    ALL = 'ALL',
    SPECIFIC = 'SPECIFIC',
}

export interface PageResult {
  pageNumber: number;
  finalSize: number;
  status: PageStatus;
  blob?: Blob;
}

export interface JobStatus {
  jobId: string;
  stage: ProcessStage;
  overallProgress: number;
  processedPages: number;
  totalPages: number;
  results: PageResult[];
  warning?: string;
}

export interface ProgressUpdate {
    stage: ProcessStage;
    overallProgress: number;
    processedPages: number;
    result?: PageResult;
}