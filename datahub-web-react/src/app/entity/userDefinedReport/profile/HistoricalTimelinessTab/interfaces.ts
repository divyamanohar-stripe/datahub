export type DataJobProperties = {
    jobId: string;
    finishedBySLA?: number | null;
};

export type RunProperties = {
    executionDate: number;
    startDate: number;
    endDate?: number | null;
    externalUrl: string;
    state: string;
    finishedBySLA?: number | null;
};

export type ExtractedRun = RunProperties & {
    errorTimeLeftToEnd?: number;
    runDuration: number;
    landingTime: number;
    missedSLA?: boolean;
    color?: string;
};

export type RunEntity = {
    externalUrl: string;
    execution: {
        logicalDate: number;
        startDate: number;
        endDate?: number | null;
    };
    state?:
        | {
              status: string;
              result?: {
                  resultType?: string;
              } | null;
          }[];
    slaInfo?: {
        errorFinishedBy?: number | null;
    } | null;
};

export type DataJobEntity = {
    type: 'DATA_JOB';
    urn: string;
    properties: {
        name: string;
    };
    ownership: {
        owners?:
            | {
                  owner?: {
                      urn: string;
                      type: string;
                      properties: {
                          displayName: string;
                      };
                  } | null;
              }[]
            | null;
    } | null;
    slaInfo?: {
        errorFinishedBy?: number | null;
    } | null;
    runs: {
        runs: RunEntity[];
    };
};
