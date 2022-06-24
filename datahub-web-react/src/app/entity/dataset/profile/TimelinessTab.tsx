import { Column } from '@ant-design/plots';
import { Descriptions, InputNumber, Steps, Tag } from 'antd';
import moment from 'moment-timezone';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useGetDatasetQuery, useGetDatasetRunsQuery } from '../../../../graphql/dataset.generated';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';
import { RelationshipDirection } from '../../../../types.generated';
import { useEntityData } from '../../shared/EntityContext';

type DatasetCustomPropertiesWithSla = {
    finishedBySla: string;
    startedBySla: string;
    [key: string]: string;
};

type RunCustomPropertiesWithExternalUrl = {
    executionDate: string;
    externalUrl: string;
    state: string;
    startDate: string;
    endDate: string;
};

type Run = RunCustomPropertiesWithExternalUrl & {
    timeLeftToEnd: number;
    timeLeftToStart: number;
    runDuration: number;
};

function formatDateString(date: string | undefined) {
    if (date === undefined) {
        return date;
    }
    if (date.includes('.')) {
        return date.substring(0, date.indexOf('.'));
    }
    if (date.includes('+')) {
        return date.substring(0, date.indexOf('+'));
    }
    return date;
}

function renderDescriptions(
    runs: Run[],
    slaDuration: moment.Duration,
    startSlaDuration: moment.Duration,
    runCount: number,
    setRunCount,
) {
    function renderLatestRunSteps(latestRun: Run) {
        function formatProcessingTimeText(startDate: string | undefined, endDate: string | undefined): string {
            if (startDate === 'None') {
                return '';
            }

            if (endDate === 'None') {
                return `Running for: ${+moment
                    .duration(moment(moment.now()).diff(moment(startDate)))
                    .asMinutes()
                    .toFixed(2)} mins`;
            }
            return `Ran for: ${+moment
                .duration(moment(endDate).diff(moment(startDate)))
                .asMinutes()
                .toFixed(2)} mins`;
        }

        const {
            executionDate: latestRunExecutionDate,
            state: latestRunState,
            startDate: latestRunStartDate,
            endDate: latestRunEndDate,
            timeLeftToEnd: latestRunTimeLeft,
            timeLeftToStart: latestStartTimeLeft,
        } = latestRun;

        const stateToStepMapping = {
            scheduled: 1,
            running: 2,
            success: 3,
            failed: 3,
            skipped: 3,
        };

        const finishedAtText: string =
            latestRunEndDate === 'None' ? 'Finished' : `Finished at ${formatDateString(latestRunEndDate)}`;
        const currentStep: number = stateToStepMapping[latestRunState] || 0;
        const latestRunWaitingTimeText =
            latestRunStartDate === 'None' ? 'Waiting to start' : `Started at ${formatDateString(latestRunStartDate)}`;
        const latestRunProcessingTimeText = formatProcessingTimeText(latestRunStartDate, latestRunEndDate);
        let latestRunTimeLeftText = '';
        if (slaDuration.asMinutes() > 0) {
            latestRunTimeLeftText =
                latestRunTimeLeft >= 0
                    ? `Time remaining until end SLA: ${+moment.duration(latestRunTimeLeft).asMinutes().toFixed(2)} mins`
                    : `Time delayed over end SLA: ${+moment.duration(-latestRunTimeLeft).asMinutes().toFixed(2)} mins`;
        }
        let latestStartTimeLeftText = '';
        if (startSlaDuration.asMinutes() > 0) {
            latestStartTimeLeftText =
                latestStartTimeLeft >= 0
                    ? `\nTime remaining until start SLA: ${+moment
                          .duration(latestStartTimeLeft)
                          .asMinutes()
                          .toFixed(2)} mins`
                    : `\nTime delayed over start SLA: ${+moment
                          .duration(-latestStartTimeLeft)
                          .asMinutes()
                          .toFixed(2)} mins`;
        }
        return (
            <Steps current={currentStep}>
                <Steps.Step title="Scheduled" description={formatDateString(latestRunExecutionDate)} />
                <Steps.Step title={latestRunWaitingTimeText} description={latestStartTimeLeftText} />
                <Steps.Step title="In Progress" description={latestRunProcessingTimeText} />
                <Steps.Step title={finishedAtText} description={latestRunTimeLeftText} />
            </Steps>
        );
    }

    function renderOverSlaRate(runsOverSlaCount: number, runsCount: number, sla) {
        function getTagColor(rate: number, runsOverSlaRateText: string) {
            if (runsOverSlaRateText === 'N/A') {
                return 'grey';
            }
            if (rate <= 0) return 'blue';
            if (rate <= 0.1) return 'yellow';
            return 'red';
        }

        const runsOverSlaRate = runsOverSlaCount / runsCount;
        let runsOverSlaRateText = 'N/A';
        if (sla.asMinutes() > 0) {
            runsOverSlaRateText = runsOverSlaRate.toLocaleString(undefined, {
                style: 'percent',
                minimumFractionDigits: 1,
            });
        }
        const tagColor = getTagColor(runsOverSlaRate, runsOverSlaRateText);

        return <Tag color={tagColor}>{runsOverSlaRateText}</Tag>;
    }

    function renderOverSlaDelayAverage(runsOverSla: Run[], sla_type: string) {
        function getTagColor(delayedMins: number) {
            if (delayedMins <= 0) return 'blue';
            if (delayedMins <= 240) return 'yellow';
            return 'red';
        }
        let runsOverSlaDelayedMins: number;
        if (sla_type === 'startedBy') {
            runsOverSlaDelayedMins = moment
                .duration(runsOverSla.reduce((acc, e) => acc - e.timeLeftToStart, 0))
                .asMinutes();
        } else {
            runsOverSlaDelayedMins = moment
                .duration(runsOverSla.reduce((acc, e) => acc - e.timeLeftToEnd, 0))
                .asMinutes();
        }

        const runsOverSlaAverageDelay =
            runsOverSlaDelayedMins === 0 ? '0' : +(runsOverSlaDelayedMins / runsOverSla.length).toFixed(2);
        const runsOverSlaAverageDelayText = `${runsOverSlaAverageDelay} mins`;
        const tagColor = getTagColor(runsOverSlaDelayedMins);

        return <Tag color={tagColor}>{runsOverSlaAverageDelayText}</Tag>;
    }

    const startSlaDurationText =
        startSlaDuration.asMinutes() > 0 ? `${+startSlaDuration.asMinutes().toFixed(2)} mins` : '-';
    const endSlaDurationText = slaDuration.asMinutes() > 0 ? `${+slaDuration.asMinutes().toFixed(2)} mins` : '-';
    const slaText = `${startSlaDurationText} / ${endSlaDurationText}`;
    const runsCount = runs.length;
    const runsOverEndSla = runs.filter((r) => {
        return r.timeLeftToEnd < 0;
    });
    const runsOverEndSlaCount = runsOverEndSla.length;

    const runsOverStartSla = runs.filter((r) => {
        return r.timeLeftToStart < 0;
    });
    const runsOverStartSlaCount = runsOverStartSla.length;

    return (
        <Descriptions title="" bordered>
            <Descriptions.Item label="Latest run" span={3}>
                {renderLatestRunSteps(runs[runs.length - 1])}
            </Descriptions.Item>
            <Descriptions.Item label="Start / End SLAs">{slaText}</Descriptions.Item>
            <Descriptions.Item label="Show last N runs">
                <InputNumber min={1} max={99} value={runCount} onChange={setRunCount} />
            </Descriptions.Item>
            <Descriptions.Item label="Runs collected">{runs.length}</Descriptions.Item>
            <Descriptions.Item label="Runs finished over SLA">
                {slaDuration.asMinutes() > 0 ? runsOverEndSlaCount : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Runs finished over SLA rate">
                {renderOverSlaRate(runsOverEndSlaCount, runsCount, slaDuration)}
            </Descriptions.Item>
            <Descriptions.Item label="Completion Delay Average">
                {slaDuration.asMinutes() > 0 ? renderOverSlaDelayAverage(runsOverEndSla, 'finishedBy') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Runs started over SLA">
                {startSlaDuration.asMinutes() > 0 ? runsOverStartSlaCount : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Runs started over SLA rate">
                {renderOverSlaRate(runsOverStartSlaCount, runsCount, startSlaDuration)}
            </Descriptions.Item>
            <Descriptions.Item label="Start Delay Average">
                {startSlaDuration.asMinutes() > 0 ? renderOverSlaDelayAverage(runsOverStartSla, 'startedBy') : 'N/A'}
            </Descriptions.Item>
        </Descriptions>
    );
}

function renderTimelinessPlot(runs: Run[], slaDuration: moment.Duration, startSlaDuration: moment.Duration) {
    function getSlaAnnotations(endSlaInMinutes: number, startSlaInMinutes: number) {
        const annotations: any[] = [];
        if (endSlaInMinutes > 0) {
            const endLine = {
                type: 'line',
                start: ['start', endSlaInMinutes] as [string, number],
                end: ['end', endSlaInMinutes] as [string, number],
                style: {
                    stroke: 'purple',
                    lineDash: [2, 2],
                },
            };
            const endText = {
                type: 'text',
                position: ['max', endSlaInMinutes] as [string, number],
                content: 'End SLA',
                offsetX: -20,
                style: { textBaseline: 'top' as const },
            };
            annotations.push(endText);
            annotations.push(endLine);
        }
        if (startSlaInMinutes > 0) {
            const startLine = {
                type: 'line',
                start: ['start', startSlaInMinutes] as [string, number],
                end: ['end', startSlaInMinutes] as [string, number],
                style: {
                    stroke: 'purple',
                    lineDash: [2, 2],
                },
            };
            const startText = {
                type: 'text',
                position: ['max', startSlaInMinutes] as [string, number],
                content: 'Start SLA',
                offsetX: -24,
                style: { textBaseline: 'top' as const },
            };
            annotations.push(startText);
            annotations.push(startLine);
        }
        return annotations;
    }

    function getPlotValues(startDateString: string, endDateString: string, executionDate: Date, runDuration: number) {
        if (startDateString !== 'None' && endDateString !== 'None') {
            const startDate = new Date(startDateString);
            const endDate = new Date(endDateString);
            return [
                (startDate.getTime() - executionDate.getTime()) / 60000,
                (endDate.getTime() - executionDate.getTime()) / 60000,
            ];
        }
        if (startDateString !== 'None') {
            const startDate = new Date(startDateString);
            return [
                (startDate.getTime() - executionDate.getTime()) / 60000,
                (startDate.getTime() - executionDate.getTime()) / 60000 + runDuration / 60000,
            ];
        }
        return null;
    }

    const endSlaInMins = slaDuration.asMinutes();
    const startSlaInMins = startSlaDuration.asMinutes();
    const runsPlotData = runs.map((r) => {
        const executionDate = new Date(r.executionDate);
        return {
            ...r,
            execDate: formatDateString(r.executionDate),
            values: getPlotValues(r.startDate, r.endDate, executionDate, r.runDuration),
        };
    });

    // mapping of execDate => color based on if job missed any SLA
    const slaMissData = new Map();
    runsPlotData.forEach(function (item) {
        if (
            (item.endDate !== 'None' && endSlaInMins !== 0 && item.values !== null && item.values[1] > endSlaInMins) ||
            (item.startDate !== 'None' &&
                startSlaInMins !== 0 &&
                item.values !== null &&
                item.values[0] > startSlaInMins)
        ) {
            slaMissData.set(item.execDate, 'Crimson');
        } else if (item.state === 'running' || item.endDate === 'None') {
            slaMissData.set(item.execDate, 'Grey');
        } else {
            slaMissData.set(item.execDate, 'CornflowerBlue');
        }
    });

    const config = {
        data: runsPlotData,
        padding: 'auto' as const,
        xField: 'execDate',
        yField: 'values',
        isRange: true,
        xAxis: {
            title: {
                text: 'Execution Date',
            },
        },
        yAxis: {
            title: {
                text: 'Time Spent in Minutes',
            },
        },
        color: (execDate) => {
            return slaMissData.get(execDate.execDate);
        },
        annotations: getSlaAnnotations(endSlaInMins, startSlaInMins),
        tooltip: {
            showMarkers: false,
            enterable: true,
            domStyles: {
                'g2-tooltip': {
                    width: '300px',
                    padding: 0,
                },
            },
            customContent: (title, items) => {
                const run = items[0]?.data as Run;
                const timeLeftToEnd = moment.duration(run?.timeLeftToEnd).asMinutes();
                const timeLeftToStart = moment.duration(run?.timeLeftToStart).asMinutes();
                const execDateString = formatDateString(run?.executionDate);
                const dateDom = `<div>Execution date: ${execDateString}</div>`;
                const stateDom = `<div>State: ${run?.state}</div>`;
                const runDuration = `<div>Task run duration: ${+(run?.runDuration / 60000).toFixed(2)} minutes</div>`;
                let timeLeftDom = '';
                if (endSlaInMins !== 0) {
                    timeLeftDom =
                        timeLeftToEnd < 0
                            ? `<div>Time delayed over end SLA: ${+-timeLeftToEnd.toFixed(2)} mins</div>`
                            : `<div>Time remaining until end SLA: ${+timeLeftToEnd.toFixed(2)} mins</div>`;
                }
                let startTimeLeftDom = '';
                if (startSlaInMins !== 0) {
                    startTimeLeftDom =
                        timeLeftToStart < 0
                            ? `<div>Time delayed over start SLA: ${+-timeLeftToStart.toFixed(2)} mins</div>`
                            : `<div>Time remaining until start SLA: ${+timeLeftToStart.toFixed(2)} mins</div>`;
                }
                let startedAt = '';
                if (run !== undefined && run.startDate !== 'None') {
                    startedAt = `<div>Started At: ${formatDateString(run.startDate)}</div>`;
                }
                let finishedAt = '';
                if (run !== undefined && run.endDate !== 'None') {
                    finishedAt = `<div>Ended At: ${formatDateString(run.endDate)}</div>`;
                }
                return `<div>${dateDom}${startedAt}${finishedAt}${runDuration}${stateDom}${timeLeftDom}${startTimeLeftDom}<div>Open in <a href="${run?.externalUrl}">Airflow</a></div></div>`;
            },
        },
    };

    return (
        <>
            <Column {...config} />
        </>
    );
}

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

export const TimelinessTab = () => {
    // @mutable
    const [runCount, setRunCount] = useState(20);

    const { urn } = useEntityData();
    const { loading: isLoadingDataset, data: datasetQueryResponse } = useGetDatasetQuery({
        variables: { urn },
    });
    const { loading: isLoadingRuns, data: runsQueryResponse } = useGetDatasetRunsQuery({
        variables: { urn, start: 0, count: runCount, direction: RelationshipDirection.Outgoing },
    });

    if (isLoadingDataset || isLoadingRuns) return loadingPage;

    const datasetCustomPropertiesWithSla = datasetQueryResponse?.dataset?.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as DatasetCustomPropertiesWithSla;
    const slaDuration = moment.duration(datasetCustomPropertiesWithSla?.finishedBySla, 'seconds');

    const startSlaDuration = moment.duration(datasetCustomPropertiesWithSla?.startedBySla, 'seconds');
    const now = moment.utc();
    const runs = runsQueryResponse?.dataset?.runs?.runs
        ?.map(
            (run) =>
                ({
                    ...run?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
                    externalUrl: run?.externalUrl,
                } as RunCustomPropertiesWithExternalUrl),
        )
        .map((r) => {
            const endDate: moment.Moment = r.endDate === 'None' ? now : moment(r.endDate);
            const startDate: moment.Moment = r.startDate === 'None' ? now : moment(r.startDate);
            const slaTarget: moment.Moment = moment(r.executionDate).add(slaDuration);
            const startSlaTarget: moment.Moment = moment(r.executionDate).add(startSlaDuration);
            return {
                ...r,
                timeLeftToEnd: slaTarget.diff(endDate),
                timeLeftToStart: startSlaTarget.diff(startDate),
                runDuration: endDate.diff(r.startDate),
            };
        }) as Run[];
    runs.sort((a, b) => (new Date(a.executionDate).getTime() > new Date(b.executionDate).getTime() ? 1 : -1));

    return (
        <>
            {renderDescriptions(runs, slaDuration, startSlaDuration, runCount, setRunCount)}
            {renderTimelinessPlot(runs, slaDuration, startSlaDuration)}
        </>
    );
};
