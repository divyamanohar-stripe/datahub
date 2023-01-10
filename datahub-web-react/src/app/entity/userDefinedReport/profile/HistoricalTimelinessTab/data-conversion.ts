import moment from 'moment-timezone';
import { red, blue } from '@ant-design/colors';
import { DataJobEntity, RunEntity, RunProperties, ExtractedRun, DataJobProperties } from './interfaces';
import { getRunState } from './functions';

export function extractDataJobPropertiesFromEntity(dataJobEntity: DataJobEntity): DataJobProperties {
    return {
        jobId: dataJobEntity?.properties?.name,
        finishedBySLA: dataJobEntity?.slaInfo?.errorFinishedBy,
    };
}

export function extractRunFromDataJobEntityRun(dataJobEntityRun: RunEntity): RunProperties {
    return {
        executionDate: dataJobEntityRun.execution.logicalDate,
        startDate: dataJobEntityRun.execution.startDate,
        endDate: dataJobEntityRun?.execution?.endDate,
        externalUrl: dataJobEntityRun?.externalUrl,
        state: getRunState(dataJobEntityRun),
        finishedBySLA: dataJobEntityRun?.slaInfo?.errorFinishedBy,
    };
}

export function extractDataJobFromEntity(dataJobEntity: DataJobEntity): {
    readonly allRuns: readonly ExtractedRun[];
    readonly latestRuns: readonly ExtractedRun[];
    readonly dataJobProperties: DataJobProperties;
} {
    const dataJobProperties = extractDataJobPropertiesFromEntity(dataJobEntity);
    const now = moment.utc();

    const allRuns: ExtractedRun[] = dataJobEntity?.runs?.runs?.map(extractRunFromDataJobEntityRun).map((r) => {
        const endDate: moment.Moment = r.endDate ? moment(r.endDate) : now;
        const slaTarget = r.finishedBySLA ? moment(r.executionDate).add(r.finishedBySLA, 'seconds') : undefined;
        return {
            ...r,
            errorTimeLeftToEnd: slaTarget && slaTarget.diff(endDate, 'seconds'),
            runDuration: endDate.diff(r.startDate, 'seconds'),
            landingTime: endDate.diff(r.executionDate, 'seconds'),
            missedSLA: slaTarget !== undefined ? endDate.isAfter(slaTarget) : undefined,
            color: slaTarget && endDate.isBefore(slaTarget) ? blue.primary : red.primary,
        };
    });

    // sort by start date to remove all but last try per execution date
    allRuns.sort((a, b) => (new Date(a.startDate).getTime() < new Date(b.startDate).getTime() ? 1 : -1));

    const uniqueExecDates: number[] = [];

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
