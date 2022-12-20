import { CorpGroup, SlaInfo } from '../../../../../types.generated';

export enum SLATypes {
    warnStartedBy = 'warn started SLA',
    warnFinishedBy = 'warn finished SLA',
    errorStartedBy = 'error started SLA',
    errorFinishedBy = 'error finished SLA',
    noSlaDefined = 'no SLA defined',
}

export enum RunState {
    NOT_STARTED = 'NOT STARTED',
    RUNNING = 'RUNNING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    SKIPPED = 'SKIPPED',
    UP_FOR_RETRY = 'UP_FOR_RETRY',
}

export type SLAMissData = {
    state: string;
    missedSLA: boolean;
    missedBy: number;
    sla?: number | null;
    slaType: SLATypes;
};

export type DataRunEntity = {
    execution: {
        logicalDate: number;
        startDate: number;
        endDate?: number | null;
    };
    state:
        | {
              status: string;
              result?: {
                  resultType?: string;
              } | null;
          }[];
    externalUrl: string;
    slaInfo?: SlaInfo | null;
    slaMissData?: SLAMissData | null;
};

export type DataJobEntity = {
    urn: string;
    jobId: string;
    dataFlow: {
        platform: {
            properties: {
                logoUrl: string;
            };
        };
    };
    ownership: {
        owners?:
            | {
                  owner?: CorpGroup | null;
              }[]
            | null;
    } | null;
    globalTags: {
        tags?: { tag?: { name?: string | null } | null }[];
    };
    runs: {
        runs: DataRunEntity[];
    };
};

export type FormattedDataJob = {
    segmentName: string;
    jobId: string;
    previousSameWeekdayRun: DataRunEntity | null;
    previousEOMRun: DataRunEntity | null;
    previousRuns: DataRunEntity[];
    currentRun: DataRunEntity | null;
    currentRunState: RunState;
    averageLandingTime: number;
    averageDuration: number;
    dataJobEntity: DataJobEntity | null;
    contact: CorpGroup[];
};

export enum SegmentState {
    RUNNING = 'in progress',
    COMPLETED = 'completed',
    FAILURE = 'failed',
    NOT_STARTED = 'not started',
}

export type FormattedSegment = {
    name: string;
    averageLandingTime: number;
    lastDataJobLandingTime: string | JSX.Element;
    runState: SegmentState;
    missedSLA: boolean;
    orderedDataJobs: FormattedDataJob[];
};

export type SimilarRunsRowData = {
    similarRunName: string | JSX.Element;
    sla: string | JSX.Element;
    missedSLA: string | JSX.Element;
    executionDate: string;
    landingTime: string | JSX.Element;
    duration: string;
    airflowLink: string | JSX.Element;
};
