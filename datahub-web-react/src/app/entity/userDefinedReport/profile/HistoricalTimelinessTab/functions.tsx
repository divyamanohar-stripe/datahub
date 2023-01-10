import moment from 'moment-timezone';
import { DataJobEntity, RunEntity } from './interfaces';
import { DATE_DISPLAY_TOOLTIP_FORMAT } from './constants';

/**
 * Convert seconds into human readable format
 * @param seconds number of seconds to format
 * @param showSeconds boolean to show seconds in display
 */
export function convertSecsToHumanReadable(seconds: number, showSeconds: boolean) {
    const oriSeconds = seconds;
    const floatingPart = oriSeconds - Math.floor(oriSeconds);

    let secondsFloor = Math.floor(seconds);

    const secondsPerHour = 60 * 60;
    const secondsPerMinute = 60;

    const hours = Math.floor(secondsFloor / secondsPerHour);
    secondsFloor -= hours * secondsPerHour;

    const minutes = Math.floor(secondsFloor / secondsPerMinute);
    secondsFloor -= minutes * secondsPerMinute;

    let readableFormat = '';
    if (hours > 0) {
        readableFormat += `${hours}Hours `;
    }
    if (minutes > 0) {
        readableFormat += `${minutes}Min `;
    }
    if (secondsFloor + floatingPart > 0 && showSeconds) {
        if (Math.floor(oriSeconds) === oriSeconds) {
            readableFormat += `${secondsFloor}Sec `;
        } else {
            secondsFloor += floatingPart;
            readableFormat += `${secondsFloor.toFixed(2)}Sec`;
        }
    }
    return readableFormat;
}

// get string run state
export function getRunState(run: RunEntity | null | undefined) {
    if (run && run?.state && run?.state[0]?.result?.resultType) {
        return run.state[0].result.resultType;
    }
    return 'RUNNING';
}

export function formatDateString(date: string | number | Date) {
    return moment.utc(date).format(DATE_DISPLAY_TOOLTIP_FORMAT);
}

/**
 * Calculate percentile from array of values
 * @param arr array of numeric values
 * @param q percentile (ex. 0.9 => p90)
 */
export const quantile = (arr, q) => {
    const sorted = arr.sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base];
};

/**
 * Get all unique execution dates across all data jobs in order to line up timelines across charts
 * @param dataJobEntities list of DataJob Entities in user defined report.
 */
export function getAllExecDates(dataJobEntities): any[] {
    const allExecDates = new Set();
    dataJobEntities.forEach((dataJob) => {
        const runs = dataJob?.runs?.runs?.map((run) => run.execution.logicalDate);
        runs.map((r) => allExecDates.add(formatDateString(r)));
    });
    return Array.from(allExecDates).sort();
}

/**
 * Get display name of data job owner from ownership entity
 * @param dataJobEntity DataJob Entity
 */
export function getDataJobOwner(dataJobEntity) {
    const { ownership } = dataJobEntity;
    if (ownership?.owners && ownership.owners.length > 0) {
        return ownership.owners[0].owner;
    }
    return undefined;
}

/**
 * Get map of owner to list of datajob entities for grouping jobs by owner in UI
 * @param dataJobEntities list of DataJob Entities
 */
export function getDataJobOwnerGroup(dataJobEntities) {
    const dataJobOwnerMap = new Map<any, DataJobEntity[]>();
    for (let idx = 0; idx < dataJobEntities.length; idx++) {
        const currDataJob = dataJobEntities[idx];
        const currOwner = getDataJobOwner(currDataJob);
        if (dataJobOwnerMap.has(currOwner)) {
            const currDataJobs = dataJobOwnerMap.get(currOwner) as DataJobEntity[];
            currDataJobs.push(currDataJob);
            dataJobOwnerMap.set(currOwner, currDataJobs);
        } else {
            dataJobOwnerMap.set(currOwner, [currDataJob]);
        }
    }
    return dataJobOwnerMap;
}
