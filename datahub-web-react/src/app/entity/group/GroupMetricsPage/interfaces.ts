import { CorpGroup, SlaInfo } from '../../../../types.generated';

export enum SLAMissTypes {
    warnStartedBy = '[warn] started by',
    warnFinishedBy = '[warn] finished by',
    startedBy = '[error] started by',
    finishedBy = '[error] finished by',
}

export enum RunState {
    RUNNING = 'RUNNING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    SKIPPED = 'SKIPPED',
    UP_FOR_RETRY = 'UP_FOR_RETRY',
}

export type SLAMissData = {
    executionDate: string;
    missType: SLAMissTypes;
    sla: string;
    missedBy: string;
    externalUrl: string;
    dataEnt: DataEntity;
    state: string;
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
};

export type DataEntity = {
    type: string;
    urn: string;
    runs: {
        runs?: DataRunEntity[];
    } | null;
};

export type DownstreamTeamEntity = {
    downstream: { relationships: any[] };
};

export type IncidentEntity = {
    id: string;
    urn: string;
    properties?: {
        name?: string;
        description?: string;
        summary?: string;
        severity?: string;
        state?: string;
        openedAt?: number;
    };
};

export interface DownstreamTeam {
    teamName: string;
    slack?: string;
    email?: string;
    homePage?: string;
    entities: any[];
    count?: number;
    ownerEntity?: CorpGroup;
}
