import moment from 'moment-timezone';

export type DataJobProperties = {
    readonly jobId: string;
    readonly project: string;
    readonly finishedBySla: string;
    readonly finishedBySlaDuration: moment.Duration;
};

export type RunProperties = {
    executionDate: string;
    externalUrl: string;
    state: string;
    startDate: string;
    endDate: string;
};

export type Run = RunProperties & {
    errorTimeLeftToEnd: number;
    runDuration: number;
    landingTime: number;
    isWithinSla: boolean;
    color: string | null;
};

export function extractDataJobPropertiesFromEntity(dataJobEntity: any): DataJobProperties {
    const extracted = dataJobEntity?.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value as string }),
        {},
    );
    return {
        jobId: dataJobEntity.jobId,
        project: extracted.project,
        finishedBySla: extracted.finishedBySla,
        finishedBySlaDuration: moment.duration(extracted?.finishedBySla, 'seconds'),
    };
}

export function extractRunFromDataJobEntityRun(dataJobEntityRun: any): RunProperties {
    return {
        ...dataJobEntityRun?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
        externalUrl: dataJobEntityRun?.externalUrl,
    } as RunProperties;
}

export function extractDataJobFromEntity(dataJobEntity: any):
    | { readonly error: string }
    | {
          readonly allRuns: readonly Run[];
          readonly latestRuns: readonly Run[];
          readonly dataJobProperties: DataJobProperties;
      } {
    const dataJobProperties = extractDataJobPropertiesFromEntity(dataJobEntity);
    const now = moment.utc();

    const taskId = dataJobEntity?.jobId;

    if (dataJobProperties === undefined) return { error: `Task ${taskId}: not correctly set up` };

    const errorSlaDuration = dataJobProperties.finishedBySlaDuration;

    const allRuns: Run[] = dataJobEntity?.runs?.runs?.map(extractRunFromDataJobEntityRun).map((r) => {
        const endDate: moment.Moment = r.endDate === 'None' ? now : moment(r.endDate);
        const slaTarget: moment.Moment = moment(r.executionDate).add(errorSlaDuration);
        return {
            ...r,
            errorTimeLeftToEnd: slaTarget.diff(endDate, 'seconds'),
            runDuration: endDate.diff(r.startDate, 'seconds'),
            landingTime: endDate.diff(r.executionDate, 'seconds'),
            isWithinSla: endDate.isBefore(slaTarget),
        };
    });

    // sort by start date to remove all but last try per execution date
    allRuns.sort((a, b) => (new Date(a.startDate).getTime() < new Date(b.startDate).getTime() ? 1 : -1));

    const uniqueExecDates: string[] = [];

    const latestRuns = allRuns.filter((run) => {
        const isDuplicate = uniqueExecDates.includes(run.executionDate);
        if (!isDuplicate) {
            uniqueExecDates.push(run.executionDate);
            return true;
        }
        return false;
    });

    // sort by execution date
    latestRuns.sort((a, b) => (new Date(a.executionDate).getTime() > new Date(b.executionDate).getTime() ? 1 : -1));

    return { allRuns, latestRuns, dataJobProperties };
}
