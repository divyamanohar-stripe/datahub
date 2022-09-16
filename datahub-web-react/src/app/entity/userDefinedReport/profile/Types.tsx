export type RunEntity = {
    externalUrl: string;
    properties: {
        customProperties: {
            key: string;
            value: string;
        }[];
    };
};

export type DataJobEntity = {
    jobId: string;
    type: 'DATA_JOB';
    urn: string;
    dataFlow: any;
    ownership: any;
    globalTags?: {
        tags: {
            tag: { name: string };
        }[];
    };
    properties?: {
        customProperties: {
            key: string;
            value: string;
        }[];
        externalUrl?: string;
        description?: string;
        name?: string;
    };
    runs?: {
        runs: RunEntity[];
    };
};
