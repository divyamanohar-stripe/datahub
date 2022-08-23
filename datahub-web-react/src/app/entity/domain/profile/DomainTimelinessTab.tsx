import React, { useState, useCallback } from 'react';
import { DeliveredProcedureOutlined } from '@ant-design/icons';
import { DatePicker, Descriptions, Layout, Steps, Table, Tag, Tooltip } from 'antd';
import { groupBy, orderBy } from 'lodash';
import moment from 'moment-timezone';
import styled from 'styled-components';
import { useHistory } from 'react-router';
import { useGetDomainTimelinessQuery } from '../../../../graphql/domain.generated';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';
import { CompactEntityNameList } from '../../../recommendations/renderer/component/CompactEntityNameList';
import { useEntityData } from '../../shared/EntityContext';
import analytics, { EventType } from '../../../analytics';

const { Header, Sider, Content } = Layout;
const { Step } = Steps;

const useSearchParams = () => {
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

//  Styles
const LoadingText = styled.div`
    margin-top: 18px;
    font-size: 12px;
`;

const LoadingContainer = styled.div`
    padding-top: 40px;
    padding-bottom: 40px;
    width: 100%;
    text-align: center;
`;

const loadingPage = (
    <LoadingContainer>
        <LoadingSvg height={80} width={80} />
        <LoadingText>Fetching data...</LoadingText>
    </LoadingContainer>
);

const ExternalUrlLink = styled.a`
    font-size: 16px;
    color: grey;
`;

// Types
type RunEntity = {
    externalUrl: string;
    properties: {
        customProperties: {
            key: string;
            value: string;
        }[];
    };
};

type DataJobEntity = {
    jobId: string;
    type: 'DATA_JOB';
    urn: string;
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
        description?: string;
        name?: string;
    };
    runs?: {
        runs: RunEntity[];
    };
};

type FormattedRunCustomProperties = {
    executionDate: string;
    startDate: string;
    state: RunState;
    endDate?: string;
};

type FormattedRun = FormattedRunCustomProperties & {
    externalUrl: string;
    startTime: number;
    duration: number | null;
    landingTime: number | null;
};

type FormattedDataJobCustomProperties = {
    contact?: string;
    finishedBySla?: string;
    project?: string;
    slack_channels?: string;
};

type FormattedDataJob = FormattedDataJobCustomProperties & {
    jobId: string;
    segmentName: string;
    formattedRuns: FormattedRun[];
    averageStartMoment: moment.Moment | null;
    averageLandingMoment: moment.Moment | null;
    averageDuration: number | null;
    currentRun: FormattedRun | null;
    currentRunState: string;
    previousSuccessRun: FormattedRun | null;
    previousSameWeekdayRun: FormattedRun | null;
    previousEOMRun: FormattedRun | null;
    dataJobSLAMoment: moment.Moment | null;
    dataJobEntity: DataJobEntity;
};

type DataJobWithTimeliness = FormattedDataJob & {
    missedSLA: boolean | null;
    willMissSLA: boolean | null;
    estimatedLandingMoment: moment.Moment | null;
};

type FormattedSegment = {
    segmentName: string;
    segmentAverageLandingMoment: moment.Moment | null;
    segmentAverageStartMoment: moment.Moment | null;
    segmentActualLandingMoment: moment.Moment | null;
    segmentEstimatedLandingMoment: moment.Moment | null;
    segmentState: SegmentState;
    segmentTasks: DataJobWithTimeliness[];
};

enum RunState {
    NOT_STARTED = 'not started',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
}

enum SegmentState {
    RUNNING = 'running',
    DELAYED = 'delayed',
    AT_RISK = 'at risk',
    COMPLETED = 'completed',
    NOT_STARTED = 'not started',
    UNKNOWN = 'unknown',
}

enum UnitOfTime {
    SECONDS = 'seconds',
}

const CLIENT_TZ = moment.tz.guess();
const DATE_SEARCH_PARAM_FORMAT = 'YYYY-MM-DD';
const DATE_DISPLAY_FORMAT = 'MM/DD/YYYY HH:mm:ss';

// Helper functions
function convertSecsToHumanReadable(seconds: number) {
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
    if (secondsFloor + floatingPart > 0) {
        if (Math.floor(oriSeconds) === oriSeconds) {
            readableFormat += `${secondsFloor}Sec `;
        } else {
            secondsFloor += floatingPart;
            readableFormat += `${secondsFloor.toFixed(2)}Sec`;
        }
    }
    return readableFormat;
}

function formatRun(runEntity: RunEntity): FormattedRun {
    function getRunStartTime(p: FormattedRunCustomProperties) {
        const { executionDate, startDate } = p;
        return moment.utc(startDate).diff(executionDate, UnitOfTime.SECONDS);
    }

    function getRunDuration(p: FormattedRunCustomProperties) {
        const { state, endDate, startDate } = p;
        if (state === RunState.SUCCESS) return moment.utc(endDate).diff(startDate, UnitOfTime.SECONDS);
        return null;
    }

    function getRunLandingTime(p: FormattedRunCustomProperties) {
        const { state, endDate, executionDate } = p;
        if (state === RunState.SUCCESS) return moment.utc(endDate).diff(executionDate, UnitOfTime.SECONDS);
        return null;
    }

    const { externalUrl } = runEntity;
    const formattedRunCustomProperties = runEntity.properties.customProperties.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as FormattedRunCustomProperties;
    const startTime = getRunStartTime(formattedRunCustomProperties);
    const duration = getRunDuration(formattedRunCustomProperties);
    const landingTime = getRunLandingTime(formattedRunCustomProperties);

    return {
        externalUrl,
        ...formattedRunCustomProperties,
        startTime,
        duration,
        landingTime,
    };
}

function formatDataJob(domainDate: moment.Moment, dataJob: DataJobEntity): FormattedDataJob {
    function getSegmentName(j: DataJobEntity) {
        if (j.globalTags === undefined || j.globalTags.tags.length === 0) return 'Segment undefined';
        // TODO: using the first tag as the segment is not extensible.
        return j.globalTags.tags[0].tag.name;
    }

    function getRunsAverageStartMoment(runs: FormattedRun[], currentDate: moment.Moment) {
        const runCount = runs.length;
        if (runCount === 0) return null;

        const averageStartTime =
            runs.reduce((acc, r) => {
                const { startTime } = r;
                return acc + startTime;
            }, 0) / runCount;

        return moment.utc(currentDate).add(averageStartTime, UnitOfTime.SECONDS);
    }

    function getRunsAverageLandingMoment(runs: FormattedRun[], currentDate: moment.Moment) {
        const successRunCount = runs.filter((r) => {
            return r.state === RunState.SUCCESS;
        }).length;
        if (successRunCount === 0) return null;

        const averageLandingTime =
            runs.reduce((acc, r) => {
                const { landingTime } = r;
                if (landingTime === null) return acc;
                return acc + landingTime;
            }, 0) / successRunCount;

        return moment.utc(currentDate).add(averageLandingTime, UnitOfTime.SECONDS);
    }

    function getRunsAverageDuration(runs: FormattedRun[]) {
        const successRunCount = runs.filter((r) => {
            return r.state === RunState.SUCCESS;
        }).length;
        if (successRunCount === 0) return null;

        return (
            runs.reduce((acc, r) => {
                const { duration } = r;
                if (duration === null) return acc;
                return acc + duration;
            }, 0) / successRunCount
        );
    }

    function getCurrentRun(runs: FormattedRun[], currentDate: moment.Moment) {
        const currentRuns = runs.filter((r) => {
            return moment.utc(r.executionDate).isSame(currentDate);
        });
        if (currentRuns.length === 0) return null;
        return currentRuns[0];
    }

    function getCurrentRunState(currentRun: FormattedRun | null) {
        if (currentRun === null) return RunState.NOT_STARTED;
        return currentRun.state;
    }

    function getPreviousSuccessRun(runs: FormattedRun[], currentDate: moment.Moment) {
        // NOTE: Assuming runs are sorted already by executionDate (latest -> oldest), otherwise need to traverse the array.
        const previousSuccessRuns = runs.filter((r) => {
            return r.state === RunState.SUCCESS && moment.utc(r.executionDate) < currentDate;
        });
        if (previousSuccessRuns.length === 0) return null;
        return previousSuccessRuns[0];
    }

    function getPreviousSameWeekdayRun(runs: FormattedRun[], currentDate: moment.Moment) {
        const previousSameWeenkday = moment.utc(currentDate).subtract(1, 'week');
        const previousSameWeenkdayRuns = runs.filter((r) => {
            return r.state === RunState.SUCCESS && moment.utc(r.executionDate).isSame(previousSameWeenkday);
        });
        if (previousSameWeenkdayRuns.length === 0) return null;
        return previousSameWeenkdayRuns[0];
    }

    function getPreviousEOMRun(runs: FormattedRun[], currentDate: moment.Moment) {
        // NOTE: If currentDate is the first day of month, use last month's first day.
        let previousEOM: moment.Moment;
        if (currentDate.isSame(moment.utc().startOf('month'))) {
            previousEOM = moment.utc(currentDate).subtract(1, 'month');
        } else {
            previousEOM = moment.utc(currentDate).startOf('month');
        }
        const previousEOMRuns = runs.filter((r) => {
            return r.state === RunState.SUCCESS && moment.utc(r.executionDate).isSame(previousEOM);
        });
        if (previousEOMRuns.length === 0) return null;
        return previousEOMRuns[0];
    }

    function getDataJobSLAMoment(
        dataJobCustomProperties: FormattedDataJobCustomProperties,
        currentDate: moment.Moment,
    ) {
        const { finishedBySla } = dataJobCustomProperties;
        if (finishedBySla === undefined) return null;
        return moment.utc(currentDate).add(moment.duration(finishedBySla, 'seconds'));
    }

    const { jobId } = dataJob;
    const segmentName = getSegmentName(dataJob);
    const formattedRuns = dataJob.runs?.runs?.map(formatRun) as FormattedRun[];
    const averageStartMoment = getRunsAverageStartMoment(formattedRuns, domainDate);
    const averageLandingMoment = getRunsAverageLandingMoment(formattedRuns, domainDate);
    const averageDuration = getRunsAverageDuration(formattedRuns);
    const currentRun = getCurrentRun(formattedRuns, domainDate);
    const currentRunState = getCurrentRunState(currentRun);
    const previousSuccessRun = getPreviousSuccessRun(formattedRuns, domainDate);
    const previousSameWeekdayRun = getPreviousSameWeekdayRun(formattedRuns, domainDate);
    const previousEOMRun = getPreviousEOMRun(formattedRuns, domainDate);
    const formattedDataJobCustomProperties = dataJob.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as FormattedDataJobCustomProperties;
    const dataJobSLAMoment = getDataJobSLAMoment(formattedDataJobCustomProperties, domainDate);
    const dataJobEntity = dataJob;

    return {
        jobId,
        segmentName,
        formattedRuns,
        averageStartMoment,
        averageLandingMoment,
        averageDuration,
        currentRun,
        currentRunState,
        previousSuccessRun,
        previousSameWeekdayRun,
        previousEOMRun,
        ...formattedDataJobCustomProperties,
        dataJobSLAMoment,
        dataJobEntity,
    };
}

function getDataJobWithTimeliness(dataJob: FormattedDataJob): DataJobWithTimeliness {
    function checkMissedSLA(j: FormattedDataJob): boolean | null {
        const { dataJobSLAMoment, currentRun, currentRunState } = j;
        const now = moment.utc();
        if (dataJobSLAMoment === null) return null;
        if (currentRunState === RunState.NOT_STARTED || currentRun === null) return now > dataJobSLAMoment;

        const { endDate } = currentRun;
        if (endDate === 'None') return now > dataJobSLAMoment;
        return moment.utc(endDate) > dataJobSLAMoment;
    }

    function checkWillMissSLA(j: FormattedDataJob): boolean | null {
        const { dataJobSLAMoment, currentRun, currentRunState, averageDuration } = j;
        const now = moment.utc();
        if (dataJobSLAMoment === null) return null;

        if (currentRunState === RunState.NOT_STARTED || currentRun === null) {
            const landingTimeIfStartsNow = moment.utc(now).add(averageDuration, UnitOfTime.SECONDS);
            return landingTimeIfStartsNow > dataJobSLAMoment;
        }
        if (currentRunState === RunState.RUNNING) {
            const { startDate } = currentRun;
            const estimatedLandingMoment = moment.utc(startDate).add(averageDuration, UnitOfTime.SECONDS);
            return estimatedLandingMoment > dataJobSLAMoment;
        }
        return null;
    }

    function estimateLandingMoment(j: FormattedDataJob): moment.Moment | null {
        const { currentRun, currentRunState, averageDuration, averageStartMoment, averageLandingMoment } = j;
        const now = moment.utc();

        if (currentRunState === RunState.NOT_STARTED) {
            if (averageStartMoment === null) return null;
            if (now <= averageStartMoment) return averageLandingMoment;
            return moment.utc(now).add(averageDuration, UnitOfTime.SECONDS);
        }
        if (currentRunState === RunState.RUNNING && currentRun !== null) {
            const { startDate } = currentRun;
            const estimatedLandingMoment = moment.utc(startDate).add(averageDuration, UnitOfTime.SECONDS);
            return estimatedLandingMoment;
        }
        return null;
    }

    const missedSLA = checkMissedSLA(dataJob);
    const willMissSLA = checkWillMissSLA(dataJob);
    const estimatedLandingMoment = estimateLandingMoment(dataJob);

    return {
        missedSLA,
        willMissSLA,
        estimatedLandingMoment,
        ...dataJob,
    };
}

function formatSegments(dataJobs: DataJobWithTimeliness[]): FormattedSegment[] {
    function getSegmentState(jobs: DataJobWithTimeliness[]) {
        const currentRunStates = jobs.map((j) => j.currentRunState);
        const missedSLAs = jobs.map((j) => j.missedSLA);
        const willMissedSLAs = jobs.map((j) => j.willMissSLA);

        if (missedSLAs.some((b) => b)) return SegmentState.DELAYED;
        if (willMissedSLAs.some((b) => b)) return SegmentState.AT_RISK;
        if (currentRunStates.every((s) => s === RunState.SUCCESS)) return SegmentState.COMPLETED;
        if (currentRunStates.every((s) => s === RunState.NOT_STARTED)) return SegmentState.NOT_STARTED;
        if (currentRunStates.some((s) => s === RunState.RUNNING)) return SegmentState.RUNNING;
        return SegmentState.UNKNOWN;
    }

    function getSegmentAverageLandingMoment(jobs: DataJobWithTimeliness[]) {
        return jobs.reduce<moment.Moment | null>((segmentAverageLandingMoment, j) => {
            const { averageLandingMoment } = j;
            if (segmentAverageLandingMoment === null) return averageLandingMoment;
            if (segmentAverageLandingMoment !== null && averageLandingMoment !== null)
                return segmentAverageLandingMoment < averageLandingMoment
                    ? averageLandingMoment
                    : segmentAverageLandingMoment;
            return segmentAverageLandingMoment;
        }, null);
    }

    function getSegmentAverageStartMoment(jobs: DataJobWithTimeliness[]) {
        return jobs.reduce<moment.Moment | null>((segmentAverageStartMoment, j) => {
            const { averageStartMoment } = j;
            if (segmentAverageStartMoment === null) return averageStartMoment;
            if (segmentAverageStartMoment !== null && averageStartMoment !== null)
                return segmentAverageStartMoment > averageStartMoment ? averageStartMoment : segmentAverageStartMoment;
            return segmentAverageStartMoment;
        }, null);
    }

    function getSegmentActualLandingMoment(jobs: DataJobWithTimeliness[]) {
        const currentRunStates = jobs.map((j) => j.currentRunState);
        if (currentRunStates.every((s) => s === RunState.SUCCESS)) {
            return jobs
                .map((j) => moment.utc(j.currentRun?.endDate))
                .reduce((largestMoment, m) => {
                    return largestMoment < m ? m : largestMoment;
                });
        }
        return null;
    }

    const groupedDataJobs = groupBy(dataJobs, (j) => j.segmentName);
    const sortedSegments = Object.entries(groupedDataJobs)
        .map(([segmentName, unorderedSegmentTasks]) => {
            const segmentState = getSegmentState(unorderedSegmentTasks);
            const segmentAverageLandingMoment = getSegmentAverageLandingMoment(unorderedSegmentTasks);
            const segmentAverageStartMoment = getSegmentAverageStartMoment(unorderedSegmentTasks);
            const segmentActualLandingMoment = getSegmentActualLandingMoment(unorderedSegmentTasks);
            const segmentTasks = orderBy(unorderedSegmentTasks, 'averageLandingMoment');
            return {
                segmentName,
                segmentAverageLandingMoment,
                segmentAverageStartMoment,
                segmentActualLandingMoment,
                segmentState,
                segmentTasks,
            };
        })
        .sort((a, b) => {
            if (a.segmentAverageLandingMoment === null || b.segmentAverageLandingMoment === null) return 1;
            return a.segmentAverageLandingMoment > b.segmentAverageLandingMoment ? 1 : -1;
        });

    let segmentETAOffset: number;
    const formattedSegments = sortedSegments.map((s) => {
        const now = moment.utc();
        const { segmentActualLandingMoment, segmentAverageLandingMoment, segmentAverageStartMoment } = s;
        if (segmentETAOffset === undefined) {
            if (segmentAverageStartMoment === null || now < segmentAverageStartMoment) {
                segmentETAOffset = 0;
            } else {
                segmentETAOffset = moment.utc(now).diff(segmentAverageStartMoment, UnitOfTime.SECONDS);
            }
        }

        let segmentEstimatedLandingMoment: moment.Moment | null = null;
        if (segmentActualLandingMoment !== null)
            segmentETAOffset = segmentActualLandingMoment.diff(segmentAverageLandingMoment, UnitOfTime.SECONDS);
        else {
            segmentEstimatedLandingMoment = moment
                .utc(segmentAverageLandingMoment)
                .add(segmentETAOffset, UnitOfTime.SECONDS);
        }
        return {
            segmentEstimatedLandingMoment,
            ...s,
        };
    });

    return formattedSegments;
}

function renderDomainHeader(
    domainDate: moment.Moment,
    setDomainDate,
    segments: FormattedSegment[],
    domainName: string | undefined,
) {
    const lastSegment = segments[segments.length - 1];
    const segmentStates = segments.map((s) => s.segmentState);

    let domainOverallStatusTag;
    if (segmentStates.every((s) => s === SegmentState.NOT_STARTED)) {
        domainOverallStatusTag = <Tag color="default">{SegmentState.NOT_STARTED}</Tag>;
    } else if (lastSegment.segmentState === SegmentState.DELAYED) {
        domainOverallStatusTag = <Tag color="red">{SegmentState.DELAYED}</Tag>;
    } else if (
        lastSegment.segmentState === SegmentState.AT_RISK ||
        segmentStates.some((s) => s === SegmentState.DELAYED || s === SegmentState.AT_RISK)
    ) {
        domainOverallStatusTag = <Tag color="yellow">{SegmentState.AT_RISK}</Tag>;
    } else {
        domainOverallStatusTag = <Tag color="blue">{SegmentState.RUNNING}</Tag>;
    }

    const { segmentActualLandingMoment, segmentEstimatedLandingMoment } = lastSegment;

    let domainLandingTimeText = 'N/A';
    let domainLandingTimeToolTip;
    if (segmentActualLandingMoment !== null) {
        domainLandingTimeText = `T+${convertSecsToHumanReadable(
            segmentActualLandingMoment.diff(domainDate, UnitOfTime.SECONDS),
        )}`;
        domainLandingTimeToolTip = `UTC: ${segmentActualLandingMoment.format(DATE_DISPLAY_FORMAT)}\n`;
        domainLandingTimeToolTip += `Local: ${moment
            .tz(segmentActualLandingMoment, CLIENT_TZ)
            .format(DATE_DISPLAY_FORMAT)}`;
    } else if (segmentEstimatedLandingMoment !== null) {
        domainLandingTimeText = `ETA: T+${convertSecsToHumanReadable(
            segmentEstimatedLandingMoment.diff(domainDate, UnitOfTime.SECONDS),
        )}`;
        domainLandingTimeToolTip = `UTC: ${segmentEstimatedLandingMoment.format(DATE_DISPLAY_FORMAT)}\n`;
        domainLandingTimeToolTip += `Local: ${moment
            .tz(segmentEstimatedLandingMoment, CLIENT_TZ)
            .format(DATE_DISPLAY_FORMAT)}`;
    }

    return (
        <Descriptions title="" bordered size="small">
            <Descriptions.Item label={`${domainName} Execution Date`}>
                <Tooltip title={`UTC scheduled run of tasks in ${domainName}`}>
                    <DatePicker onChange={setDomainDate} defaultValue={domainDate} />
                </Tooltip>
            </Descriptions.Item>
            <Descriptions.Item label={`${domainName} Status`}>{domainOverallStatusTag}</Descriptions.Item>
            <Descriptions.Item label={`${domainName} Landing Time`}>
                <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${domainLandingTimeToolTip}`}>
                    {domainLandingTimeText}
                </Tooltip>
            </Descriptions.Item>
        </Descriptions>
    );
}

function renderSegmentTimeline(
    domainDate: moment.Moment,
    domainId,
    domainUrn: string,
    segments: FormattedSegment[],
    setSegmentId,
) {
    function renderSegmentTimelineStep(segment: FormattedSegment) {
        let status: 'error' | 'process' | 'finish' | 'wait';
        if (segment.segmentState === SegmentState.COMPLETED) {
            status = 'finish';
        } else if (segment.segmentState === SegmentState.NOT_STARTED) {
            status = 'wait';
        } else if (segment.segmentState === SegmentState.RUNNING) {
            status = 'process';
        } else {
            status = 'error';
        }

        const { segmentActualLandingMoment, segmentEstimatedLandingMoment } = segment;
        let segmentTimelinessDescription = 'N/A';
        if (segmentActualLandingMoment !== null) {
            segmentTimelinessDescription = `T+${convertSecsToHumanReadable(
                segmentActualLandingMoment.diff(domainDate, UnitOfTime.SECONDS),
            )}`;
        } else if (segmentEstimatedLandingMoment !== null) {
            segmentTimelinessDescription = `ETA: T+${convertSecsToHumanReadable(
                segmentEstimatedLandingMoment.diff(domainDate, UnitOfTime.SECONDS),
            )}`;
        }

        return (
            <Step
                title={segment.segmentName}
                subTitle={segment.segmentState}
                description={segmentTimelinessDescription}
                status={status}
            />
        );
    }

    const logAndUpdateSegment = (segmentId: number) => {
        setSegmentId(segmentId);
        analytics.event({
            type: EventType.DomainTimelinessSegmentClickEvent,
            entityUrn: domainUrn,
            segment: `${domainId}:${segments[segmentId].segmentName}`,
        });
    };

    return (
        <Steps direction="vertical" progressDot current={-1} onChange={logAndUpdateSegment} size="small">
            {segments.map(renderSegmentTimelineStep)}
        </Steps>
    );
}

function renderSegmentTasks(domainDate: moment.Moment, segmentId: number, segments: FormattedSegment[]) {
    const timelinessColumns = [
        {
            title: 'Task',
            dataIndex: 'dataJobEntity',
            render: (dataJobEntity) => <CompactEntityNameList entities={[dataJobEntity]} />,
        },
        {
            title: 'State',
            dataIndex: 'currentRunState',
        },
        {
            title: 'Contact',
            dataIndex: 'contact',
        },
        {
            title: 'SLA',
            dataIndex: 'finishedBySla',
            render: (finishedBySla) => finishedBySla && <>T+{moment.duration(finishedBySla, 'seconds').asHours()}</>,
        },
        {
            title: 'Missed SLA?',
            dataIndex: 'missedSLA',
            render: (missedSLA) => {
                if (missedSLA === false) return <Tag color="blue">No</Tag>;
                if (missedSLA === true) return <Tag color="red">Yes</Tag>;
                return <Tag color="yellow">N/A</Tag>;
            },
        },
        {
            title: 'Will Miss SLA?',
            dataIndex: 'willMissSLA',
            render: (willMissSLA) => {
                if (willMissSLA === false) return <Tag color="blue">No</Tag>;
                if (willMissSLA === true) return <Tag color="red">Yes</Tag>;
                return <Tag color="yellow">N/A</Tag>;
            },
        },
        {
            title: 'Average Landing Time',
            dataIndex: 'averageLandingMoment',
            render: (averageLandingMoment) => {
                if (averageLandingMoment === null) return <>N/A</>;
                return <>T+{convertSecsToHumanReadable(averageLandingMoment.diff(domainDate, UnitOfTime.SECONDS))}</>;
            },
        },
        {
            title: 'Current Run Landing Time',
            render: (segmentTask) => {
                if (segmentTask.currentRun !== null && segmentTask.currentRun.endDate !== null) {
                    const utcExecutionDate = moment.utc(segmentTask.currentRun.endDate);
                    let toolTipText = `UTC: ${utcExecutionDate.format(DATE_DISPLAY_FORMAT)}\n`;
                    toolTipText += `Local: ${moment.tz(utcExecutionDate, CLIENT_TZ).format(DATE_DISPLAY_FORMAT)}`;
                    return (
                        <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${toolTipText}`}>
                            T+
                            {convertSecsToHumanReadable(utcExecutionDate.diff(domainDate, UnitOfTime.SECONDS))}
                        </Tooltip>
                    );
                }
                if (segmentTask.estimatedLandingMoment !== null) {
                    let toolTipText = `UTC: ${segmentTask.estimatedLandingMoment.format(DATE_DISPLAY_FORMAT)}\n`;
                    toolTipText += `Local: ${moment
                        .tz(segmentTask.estimatedLandingMoment, CLIENT_TZ)
                        .format(DATE_DISPLAY_FORMAT)}`;
                    return (
                        <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${toolTipText}`}>
                            ETA: T+
                            {convertSecsToHumanReadable(
                                segmentTask.estimatedLandingMoment.diff(domainDate, UnitOfTime.SECONDS),
                            )}
                        </Tooltip>
                    );
                }
                return <>N/A</>;
            },
        },
        {
            title: 'Airflow Link',
            render: (segmentTask) => {
                if (segmentTask.currentRun === null)
                    return (
                        <Tooltip title="View task details">
                            <ExternalUrlLink
                                href={`https://airflow.corp.stripe.com/admin/tasks/${segmentTask.dataJobEntity?.jobId}`}
                            >
                                <DeliveredProcedureOutlined />
                            </ExternalUrlLink>
                        </Tooltip>
                    );
                return (
                    <Tooltip title="View task run details">
                        <ExternalUrlLink href={segmentTask.currentRun.externalUrl}>
                            <DeliveredProcedureOutlined />
                        </ExternalUrlLink>
                    </Tooltip>
                );
            },
        },
    ];

    const similarTasksRender = (record) => {
        const { previousSuccessRun, previousSameWeekdayRun, previousEOMRun } = record;
        const previousSuccessRunRowData = {
            similarRunName: 'Previous success run',
            executionDate: previousSuccessRun !== null ? previousSuccessRun.executionDate : 'No data',
            landingTime:
                previousSuccessRun !== null
                    ? `T+${convertSecsToHumanReadable(previousSuccessRun.landingTime)}`
                    : 'No data',
            duration: previousSuccessRun !== null ? convertSecsToHumanReadable(previousSuccessRun.duration) : 'No data',
        };
        const previousSameWeekdayRunRowData = {
            similarRunName: 'Previous same weekday run',
            executionDate: previousSameWeekdayRun !== null ? previousSameWeekdayRun.executionDate : 'No data',
            landingTime:
                previousSameWeekdayRun !== null
                    ? `T+${convertSecsToHumanReadable(previousSameWeekdayRun.landingTime)}`
                    : 'No data',
            duration:
                previousSameWeekdayRun !== null
                    ? convertSecsToHumanReadable(previousSameWeekdayRun.duration)
                    : 'No data',
        };
        const previousEOMRunRowData = {
            similarRunName: 'Previous EOM run',
            executionDate: previousEOMRun !== null ? previousEOMRun.executionDate : 'No data',
            landingTime:
                previousEOMRun !== null ? `T+${convertSecsToHumanReadable(previousEOMRun.landingTime)}` : 'No data',
            duration: previousEOMRun !== null ? convertSecsToHumanReadable(previousEOMRun.duration) : 'No data',
        };

        const similarTasksTableData = [previousSuccessRunRowData, previousSameWeekdayRunRowData, previousEOMRunRowData];

        const columns = [
            {
                title: 'Similar run',
                dataIndex: 'similarRunName',
            },
            {
                title: 'Execution date',
                dataIndex: 'executionDate',
            },
            {
                title: 'Landing time',
                dataIndex: 'landingTime',
            },
            {
                title: 'Duration',
                dataIndex: 'duration',
            },
        ];

        return <Table columns={columns} dataSource={similarTasksTableData} pagination={false} />;
    };

    return (
        <Table
            rowKey="jobId"
            columns={timelinessColumns}
            expandable={{
                expandedRowRender: similarTasksRender,
            }}
            dataSource={segments[segmentId].segmentTasks}
            size="small"
        />
    );
}

export const DomainTimelinessTab = () => {
    const { urn } = useEntityData();
    const [segmentId, setSegmentId] = useState(0);
    const { getSearchParam, setSearchParam } = useSearchParams();
    const getDomainDate = (): moment.Moment => {
        const domainParam = getSearchParam('domainDate');
        if (domainParam === null || !moment(domainParam, DATE_SEARCH_PARAM_FORMAT, true).isValid()) {
            const newDomainParam = moment.utc().startOf('day').format(DATE_SEARCH_PARAM_FORMAT);
            setSearchParam('domainDate', newDomainParam);
            return moment(newDomainParam);
        }
        return moment.utc(domainParam);
    };
    const domainDate = getDomainDate();
    const setDomainDate = (newDomainDate: moment.Moment) => {
        setSearchParam('domainDate', newDomainDate.format(DATE_SEARCH_PARAM_FORMAT));
    };

    const maxEntityCount = 50;
    const maxRunCount = 31;
    const { loading: isLoadingDomain, data: domainQueryResponse } = useGetDomainTimelinessQuery({
        variables: { urn, entityStart: 0, entityCount: maxEntityCount, runStart: 0, runCount: maxRunCount },
    });
    if (isLoadingDomain) return loadingPage;
    console.log('domainQueryResponse', domainQueryResponse);

    const domainName = domainQueryResponse?.domain?.properties?.name;
    console.log(domainName);

    const dataJobEntities = domainQueryResponse?.domain?.entities?.searchResults
        ?.filter((e) => {
            return e.entity.type === 'DATA_JOB';
        })
        .map((e) => e.entity) as DataJobEntity[];
    console.log('dataJobEntities', dataJobEntities);

    const formattedDataJobs: FormattedDataJob[] = dataJobEntities.map((j) => {
        return formatDataJob(domainDate, j);
    });
    console.log('formattedDataJobs', formattedDataJobs);

    const dataJobsWithTimeliness = formattedDataJobs.map(getDataJobWithTimeliness);
    console.log('dataJobsWithTimeliness', dataJobsWithTimeliness);

    const formattedSegments = formatSegments(dataJobsWithTimeliness);
    console.log('formattedSegments', formattedSegments);

    analytics.event({
        type: EventType.DomainTimelinessViewEvent,
        entityUrn: urn,
    });

    return (
        <>
            <Layout>
                <Header>{renderDomainHeader(domainDate, setDomainDate, formattedSegments, domainName)}</Header>
                <Layout>
                    <Sider
                        width={260}
                        style={{
                            overflow: 'auto',
                            height: 700,
                            position: 'fixed',
                            marginLeft: 30,
                        }}
                    >
                        {renderSegmentTimeline(
                            domainDate,
                            domainQueryResponse?.domain?.id,
                            urn,
                            formattedSegments,
                            setSegmentId,
                        )}
                    </Sider>
                    <Layout
                        style={{
                            marginLeft: 290,
                            marginRight: 20,
                        }}
                    >
                        <Content>{renderSegmentTasks(domainDate, segmentId, formattedSegments)}</Content>
                    </Layout>
                </Layout>
            </Layout>
        </>
    );
};
