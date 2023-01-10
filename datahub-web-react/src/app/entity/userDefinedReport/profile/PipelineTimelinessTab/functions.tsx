import React, { useCallback } from 'react';
import { useHistory } from 'react-router';
import moment from 'moment-timezone';
import { groupBy, orderBy } from 'lodash';
import { Tag, Tooltip } from 'antd';
import { blue, grey, yellow, red, green, orange } from '@ant-design/colors';
import { DeliveredProcedureOutlined } from '@ant-design/icons';
import {
    DataJobEntity,
    DataRunEntity,
    FormattedDataJob,
    FormattedSegment,
    RunState,
    SegmentState,
    SLAMissData,
    SLATypes,
} from './interfaces';
import { CLIENT_TZ, DATE_DISPLAY_FORMAT } from './constants';
import { CorpGroup } from '../../../../../types.generated';
import { convertSecsToHumanReadable, ExternalUrlLink } from '../../../shared/stripe-utils';

// helper function to add date param to URl for pipeline timeliness report page
export const useSearchParams = () => {
    const history = useHistory();

    const setSearchParam = useCallback(
        (key: string, value: string | undefined, addToHistory = false) => {
            const newParams = new URLSearchParams(history.location.search);
            if (typeof value === 'string') newParams.set(key, value);
            if (value === undefined) newParams.delete(key);
            history[addToHistory ? 'push' : 'replace']({
                ...history.location,
                search: `?${newParams.toString()}`,
            });
        },
        [history],
    );

    const getSearchParam = useCallback(
        (key: string) => new URLSearchParams(history.location.search).get(key),
        [history],
    );

    return {
        setSearchParam,
        getSearchParam,
    };
};

// get string run state
export function getRunState(run: DataRunEntity | null | undefined) {
    if (run && run?.state && run?.state[0]?.result?.resultType) {
        return run.state[0].result.resultType;
    }
    return 'RUNNING';
}

// Helper functions for items in SegmentContent component

// get state tag for segment content, color of tag based on run state
export function getStateTag(currentRun: DataRunEntity | null) {
    if (currentRun) {
        const state = getRunState(currentRun);
        switch (state) {
            case RunState.RUNNING:
                return <Tag color={grey.primary}>{state.toLowerCase()}</Tag>;
            case RunState.SUCCESS:
                return <Tag color={green.primary}>{state.toLowerCase()}</Tag>;
            case RunState.SKIPPED:
                return <Tag color={grey[grey.length - 1]}>{state.toLowerCase()}</Tag>;
            case RunState.FAILURE:
                return <Tag color={red.primary}>{state.toLowerCase()}</Tag>;
            case RunState.UP_FOR_RETRY:
                return <Tag color={orange.primary}>{state.toLowerCase()}</Tag>;
            default:
                return <Tag color="default">{state.toLowerCase()}</Tag>;
        }
    }
    return <Tag color={grey.primary}>not_started</Tag>;
}

// get tag for whether or not run missed SLA (blue = no, red = yes, yellow = no SLA defined)
export function getSLAMissTag(currentRun: DataRunEntity | null) {
    if (!currentRun || !currentRun?.slaMissData || currentRun?.slaMissData?.slaType === SLATypes.noSlaDefined) {
        return <Tag color={yellow.primary}>N/A</Tag>;
    }
    if (!currentRun.slaMissData.missedSLA) {
        return <Tag color={blue.primary}>No</Tag>;
    }

    return <Tag color={red.primary}>Yes</Tag>;
}

// get tool tip element for run landing time, potentially use estimated landing time
export function getCurrentRunLandingTimeToolTip(
    currentRun: DataRunEntity | null,
    averageDuration: number | null,
    averageLandingTime: number | null,
    reportDate: moment.Moment,
) {
    if (currentRun) {
        if (currentRun?.execution?.endDate) {
            const utcExecutionDate = moment.utc(currentRun.execution.endDate);
            let toolTipText = `UTC: ${utcExecutionDate.format(DATE_DISPLAY_FORMAT)}\n`;
            toolTipText += `Local: ${moment.tz(utcExecutionDate, CLIENT_TZ).format(DATE_DISPLAY_FORMAT)}`;
            return (
                <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${toolTipText}`}>
                    T+
                    {convertSecsToHumanReadable(
                        (currentRun.execution.endDate - currentRun.execution.logicalDate) / 1000,
                    )}
                </Tooltip>
            );
        }
        if (averageDuration) {
            const utcExecutionDate = moment.utc(currentRun.execution.startDate).add(averageDuration, 'seconds');
            let toolTipText = `UTC: ${utcExecutionDate.format(DATE_DISPLAY_FORMAT)}\n`;
            toolTipText += `Local: ${moment.tz(utcExecutionDate, CLIENT_TZ).format(DATE_DISPLAY_FORMAT)}`;
            return (
                <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${toolTipText}`}>
                    ETA T+
                    {convertSecsToHumanReadable(utcExecutionDate.diff(reportDate, 'seconds'))}
                </Tooltip>
            );
        }
    }
    if (averageLandingTime) {
        const utcExecutionDate = moment.utc(reportDate).add(averageLandingTime, 'seconds');
        let toolTipText = `UTC: ${utcExecutionDate.format(DATE_DISPLAY_FORMAT)}\n`;
        toolTipText += `Local: ${moment.tz(utcExecutionDate, CLIENT_TZ).format(DATE_DISPLAY_FORMAT)}`;
        return (
            <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${toolTipText}`}>
                ETA T+
                {convertSecsToHumanReadable(utcExecutionDate.diff(reportDate, 'seconds'))}
            </Tooltip>
        );
    }
    return <>N/A</>;
}

// get SLA string for column data, include SLA type and value (ex. error finished SLA: T+5Hours)
export function getSLAString(currentRun: DataRunEntity | null) {
    return currentRun && currentRun?.slaMissData && currentRun?.slaMissData.sla
        ? `${
              currentRun.slaMissData.slaType !== SLATypes.noSlaDefined ? `${currentRun.slaMissData.slaType}: ` : ''
          }T+${convertSecsToHumanReadable(currentRun.slaMissData.sla)}`
        : '';
}

// get Airflow link icon from run entity, if run has not started, link to Airflow task page
export function getAirflowLinkFromRun(currentRun: DataRunEntity | null, fallbackTaskName) {
    if (!currentRun) {
        return (
            <Tooltip title="View task details">
                <ExternalUrlLink
                    href={`https://airflow.corp.stripe.com/admin/tasks/${fallbackTaskName}`}
                    target="_blank"
                >
                    <DeliveredProcedureOutlined />
                </ExternalUrlLink>
            </Tooltip>
        );
    }
    return (
        <Tooltip title="View task run details">
            <ExternalUrlLink href={currentRun.externalUrl} target="_blank">
                <DeliveredProcedureOutlined />
            </ExternalUrlLink>
        </Tooltip>
    );
}

/**
 * get SLA information about the current run we are examining in the format of SLAMissData
 * this includes information about whether we have missed SLA, what the value of SLA is in seconds,
 * (we prioritize by error level and finished by SLAs), the sla type, state of run, and how by how many
 * seconds we may have missed SLA by
 * @param run current run entity to examine
 */
function getSLAMissData(run: DataRunEntity): SLAMissData {
    const state = getRunState(run);
    let missedBy = 0;
    let missedSLA = false;
    if (run?.slaInfo && run.slaInfo.slaDefined === 'true') {
        const startDate = new Date(run.execution.startDate);
        const execDate = new Date(run.execution.logicalDate);

        // get end date, if no end date is set, use current time
        let endDate = new Date();
        if (run.execution?.endDate) {
            endDate = new Date(run.execution.endDate);
        }

        // prioritize error & end SLA misses
        if (run.slaInfo?.errorFinishedBy) {
            const target = new Date(execDate.getTime());
            target.setSeconds(new Date(execDate.getTime()).getSeconds() + run.slaInfo.errorFinishedBy);
            if (endDate > target) {
                missedBy = (endDate.getTime() - target.getTime()) / 1000;
                missedSLA = true;
            }
            return {
                slaType: SLATypes.errorFinishedBy,
                sla: run.slaInfo.errorFinishedBy,
                missedBy,
                state,
                missedSLA,
            } as SLAMissData;
        }

        if (run.slaInfo?.errorStartedBy) {
            const target = new Date(execDate.getTime());
            target.setSeconds(new Date(execDate.getTime()).getSeconds() + run.slaInfo.errorStartedBy);
            if (startDate > target) {
                missedSLA = true;
                missedBy = (startDate.getTime() - target.getTime()) / 1000;
            }
            return {
                slaType: SLATypes.errorStartedBy,
                sla: run.slaInfo.errorStartedBy,
                missedBy,
                state,
                missedSLA,
            } as SLAMissData;
        }

        if (run.slaInfo?.warnFinishedBy) {
            const target = new Date(execDate.getTime());
            target.setSeconds(new Date(execDate.getTime()).getSeconds() + run.slaInfo.warnFinishedBy);
            if (endDate > target) {
                missedSLA = true;
                missedBy = (endDate.getTime() - target.getTime()) / 1000;
            }
            return {
                slaType: SLATypes.warnFinishedBy,
                sla: run.slaInfo.warnFinishedBy,
                missedBy,
                state,
                missedSLA,
            } as SLAMissData;
        }

        if (run.slaInfo?.warnStartedBy) {
            const target = new Date(execDate.getTime());
            target.setSeconds(new Date(execDate.getTime()).getSeconds() + run.slaInfo.warnStartedBy);
            if (startDate > target) {
                missedBy = (startDate.getTime() - target.getTime()) / 1000;
                missedSLA = true;
            }
            return {
                slaType: SLATypes.warnStartedBy,
                sla: run.slaInfo.warnStartedBy,
                missedBy,
                state,
                missedSLA,
            } as SLAMissData;
        }
    }
    return {
        state,
        missedSLA: false,
        slaType: SLATypes.noSlaDefined,
        missedBy,
    } as SLAMissData;
}

// get run that is the same day of week as the report date we are examining
function getPreviousSameWeekdayRun(runs: DataRunEntity[] | undefined, reportDate: moment.Moment): DataRunEntity | null {
    if (runs && runs.length > 0) {
        const previousSameWeekday = moment.utc(reportDate).subtract(1, 'week');
        const previousSameWeekdayRuns = runs.filter((r) => {
            return moment.utc(r.execution.logicalDate).isSame(previousSameWeekday);
        });
        // get latest run from the previous same day of week (take into account retries)
        previousSameWeekdayRuns.sort((a, b) => (a.execution.startDate < b.execution.startDate ? 1 : -1));
        if (previousSameWeekdayRuns.length === 0) return null;
        return previousSameWeekdayRuns[0];
    }
    return null;
}

// return most recent EOM (1st of month) run that is previous to the current date we are examining
function getPreviousEOMRun(runs: DataRunEntity[] | undefined, reportDate: moment.Moment): DataRunEntity | null {
    if (runs && runs.length > 0) {
        // NOTE: Get EOM runs that are previous to reportDate
        const previousEOMRuns = runs.filter((r) => {
            return moment.utc(r.execution.logicalDate).date() === 1 && reportDate > moment.utc(r.execution.logicalDate);
        });
        // get latest run from the previous EOM (take into account retries)
        previousEOMRuns.sort((a, b) => (a.execution.startDate < b.execution.startDate ? 1 : -1));
        if (previousEOMRuns.length === 0) return null;
        return previousEOMRuns[0];
    }
    return null;
}

// return latest 7 runs that are previous to the current report date we are examining
function getPreviousRuns(
    runs: DataRunEntity[] | undefined,
    reportDate: moment.Moment,
    currentRun: DataRunEntity | null,
): DataRunEntity[] {
    const numRuns = 7;
    if (runs && runs.length > 0) {
        const isPreviousRun = (run) => moment.utc(run.execution.logicalDate) <= reportDate && run !== currentRun;
        runs.sort((a, b) => (a.execution.logicalDate < b.execution.logicalDate ? 1 : -1));
        const start = runs.findIndex(isPreviousRun);
        if (start === -1) return [];
        return runs.slice(start, numRuns + start);
    }
    return [];
}

// get current run entity of data job  (where run's execution date = current report date we are examining)
function getCurrentRun(runs: DataRunEntity[] | undefined, reportDate: moment.Moment): DataRunEntity | null {
    if (runs && runs.length > 0) {
        const currentRuns = runs.filter((r) => {
            return moment.utc(r.execution.logicalDate).isSame(reportDate);
        });
        currentRuns.sort((a, b) => (a.execution.startDate < b.execution.startDate ? 1 : -1));
        if (currentRuns.length === 0) return null;
        return currentRuns[0];
    }
    return null;
}

// return average duration in seconds of data job based on previous runs
function getAverageDuration(runs: DataRunEntity[] | undefined): number {
    if (runs && runs.length > 0) {
        let totalDurationSeconds = 0;
        let finishedRunsCount = 0;
        runs.forEach((run) => {
            if (run.execution?.endDate) {
                finishedRunsCount += 1;
                totalDurationSeconds += (run.execution.endDate - run.execution.startDate) / 1000;
            }
        });

        return finishedRunsCount !== 0 ? totalDurationSeconds / finishedRunsCount : 0;
    }
    return 0;
}

// return average landing time in seconds of data job based on previous runs (landing time = endDate - execution date)
function getAverageLandingTime(runs: DataRunEntity[] | undefined): number {
    if (runs && runs.length > 0) {
        let totalDurationSeconds = 0;
        let finishedRunsCount = 0;
        runs.forEach((run) => {
            if (run.execution?.endDate) {
                finishedRunsCount += 1;
                totalDurationSeconds += (run.execution.endDate - run.execution.logicalDate) / 1000;
            }
        });

        return finishedRunsCount !== 0 ? totalDurationSeconds / finishedRunsCount : 0;
    }
    return 0;
}

// get segment name if any tags on DataJob have format <reportName: segmentName>, otherwise, segment undefined
function getSegmentName(dataJob: DataJobEntity, reportName: string): string {
    if (dataJob?.globalTags?.tags && dataJob.globalTags.tags.length > 0) {
        for (let idx = 0; idx < dataJob.globalTags.tags.length; idx++) {
            const currTag = dataJob.globalTags.tags[idx];
            if (currTag?.tag?.name && currTag.tag.name.startsWith(`${reportName}:`)) {
                return currTag.tag.name.replace(`${reportName}:`, '').trim();
            }
        }
    }
    return 'Segment Undefined';
}

/**
 * format datajobs and add additional data including previous 7 runs of job, average duration, average landing time...etc
 * @param dataJobs all data jobs to examine
 * @param reportName user-defined name of UDR
 * @param reportDate current date of runs we are examining
 */
export function getFormattedDataJobs(dataJobs: DataJobEntity[], reportName: string, reportDate: moment.Moment) {
    dataJobs.forEach((job) => {
        job.runs.runs.forEach((run) => {
            const currRun = run;
            currRun.slaMissData = getSLAMissData(currRun);
        });
    });
    const formattedDataJobs: FormattedDataJob[] = dataJobs.map((dataJob) => {
        const segmentName = getSegmentName(dataJob, reportName);
        const { jobId } = dataJob;
        const previousSameWeekdayRun = getPreviousSameWeekdayRun(dataJob?.runs?.runs, reportDate);
        const previousEOMRun = getPreviousEOMRun(dataJob?.runs?.runs, reportDate);
        const currentRun = getCurrentRun(dataJob?.runs?.runs, reportDate);
        const previousRuns = getPreviousRuns(dataJob?.runs?.runs, reportDate, currentRun);
        const currentRunState = currentRun && currentRun?.state ? getRunState(currentRun) : RunState.NOT_STARTED;
        const averageLandingTime = getAverageLandingTime(dataJob?.runs?.runs);
        const averageDuration = getAverageDuration(dataJob?.runs?.runs);
        const dataJobEntity = dataJob;
        const contact = dataJob?.ownership?.owners
            ? (dataJob.ownership.owners.map((owner) => owner.owner) as CorpGroup[])
            : [];
        return {
            segmentName,
            jobId,
            previousSameWeekdayRun,
            previousEOMRun,
            previousRuns,
            currentRun,
            currentRunState,
            averageLandingTime,
            averageDuration,
            dataJobEntity,
            contact,
        } as FormattedDataJob;
    });
    return formattedDataJobs;
}

// get state of the segment, (ex. if any jobs are running, segment is running, if no jobs started, segment is not started)
function getSegmentState(dataJobs: FormattedDataJob[]): SegmentState {
    if (dataJobs.some((dataJob) => dataJob.currentRunState === RunState.RUNNING)) {
        return SegmentState.RUNNING;
    }
    if (dataJobs.some((dataJob) => dataJob.currentRunState === RunState.FAILURE)) {
        return SegmentState.FAILURE;
    }
    if (dataJobs.every((dataJob) => [RunState.SKIPPED, RunState.SUCCESS].includes(dataJob.currentRunState))) {
        return SegmentState.COMPLETED;
    }
    if (dataJobs.every((dataJob) => dataJob.currentRunState === RunState.NOT_STARTED)) {
        return SegmentState.NOT_STARTED;
    }
    return SegmentState.RUNNING;
}

// if any DataJobs in the segment missed SLA, return true
function getSegmentMissedSLA(dataJobs: FormattedDataJob[]) {
    const currRuns = dataJobs.map((dataJob) => {
        return dataJob.currentRun;
    });
    return currRuns.some((run) => run?.slaMissData && run.slaMissData.missedSLA);
}

/**
 * group DataJobs into segments (based on segment name determine from tag on DataJob) and calculate data
 * on each segment including average segment landing time, segment state, and whether or not any jobs
 * within each segment missed SLA
 * @param formattedDataJobs dataJobs to group into segments
 * @param reportDate
 */
export function getFormattedSegments(
    formattedDataJobs: FormattedDataJob[],
    reportDate: moment.Moment,
): FormattedSegment[] {
    const groupedDataJobs = groupBy(formattedDataJobs, (dataJob) => dataJob.segmentName);
    const segments = orderBy(
        Object.entries(groupedDataJobs).map(([name, dataJobs]) => {
            const orderedDataJobs = orderBy(dataJobs, 'averageLandingTime');
            // order segments by averageLandingTime
            const averageLandingTime =
                orderedDataJobs
                    .map((dataJob) => dataJob.averageLandingTime)
                    .reduce((partialSum, a) => partialSum + a, 0) / orderedDataJobs.length;
            const runState = getSegmentState(orderedDataJobs);
            const missedSLA = getSegmentMissedSLA(dataJobs);
            const lastDataJob = orderedDataJobs[orderedDataJobs.length - 1];
            const lastDataJobLandingTime = getCurrentRunLandingTimeToolTip(
                lastDataJob?.currentRun,
                lastDataJob?.averageDuration,
                lastDataJob?.averageLandingTime,
                reportDate,
            );
            return {
                name,
                averageLandingTime,
                runState,
                missedSLA,
                lastDataJobLandingTime,
                orderedDataJobs,
            } as FormattedSegment;
        }),
        'averageLandingTime',
    );
    return segments ?? [];
}
