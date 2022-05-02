import { Line } from '@ant-design/plots';
import { Descriptions, InputNumber, Steps, Tag } from 'antd';
import moment from 'moment-timezone';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useGetDatasetQuery, useGetDatasetRunsQuery } from '../../../../graphql/dataset.generated';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';
import { RelationshipDirection } from '../../../../types.generated';
import { useEntityData } from '../../shared/EntityContext';

type DatasetCustomPropertiesWithSlc = {
    slc: string;
    [key: string]: string;
};

type RunCustomPropertiesWithExternalUrl = {
    executionDate: string;
    externalUrl: string;
    state: string;
    startDate?: string;
    endDate?: string;
};

type Run = RunCustomPropertiesWithExternalUrl & {
    timeLeft: number;
    timeSpent: number;
};

function renderDescriptions(runs: Run[], slcDuration: moment.Duration, runCount: number, setRunCount) {
    function renderLatestRunSteps(latestRun: Run) {
        /**
         * Formats time difference to hh:mm:ss text
         * @param diff time difference in milliseconds
         * @returns hh:mm:ss formatted text
         */
        function formatTimeDiff(diff: number): string {
            return Math.floor(moment.duration(diff).asHours()) + moment.utc(diff).format(':mm:ss');
        }

        function formatProcessingTimeText(startDate: string | undefined, endDate: string | undefined): string {
            if (startDate === undefined) {
                return '';
            }
            return `Processing time: ${formatTimeDiff(
                moment(endDate === undefined ? moment.now() : endDate).diff(moment(startDate)),
            )}`;
        }

        const {
            executionDate: latestRunExecutionDate,
            state: latestRunState,
            startDate: latestRunStartDate,
            endDate: latestRunEndDate,
            timeLeft: latestRunTimeLeft,
        } = latestRun;

        const stateToStepMapping = {
            scheduled: 1,
            running: 2,
            success: 3,
            failed: 3,
            skipped: 3,
        };

        const currentStep: number = stateToStepMapping[latestRunState] || 0;
        const latestRunWaitingTimeText = `Waiting time: ${formatTimeDiff(
            moment(latestRunStartDate === undefined ? moment.now() : latestRunStartDate).diff(
                moment(latestRunExecutionDate),
            ),
        )}`;
        const latestRunProcessingTimeText = formatProcessingTimeText(latestRunStartDate, latestRunEndDate);
        const latestRunTimeLeftText =
            latestRunTimeLeft >= 0
                ? `Time left: ${formatTimeDiff(latestRunTimeLeft)}`
                : `Time delayed: ${formatTimeDiff(-latestRunTimeLeft)}`;

        return (
            <Steps current={currentStep}>
                <Steps.Step title="Scheduled" description={moment(latestRunExecutionDate).toString()} />
                <Steps.Step title="Waiting to start" description={latestRunWaitingTimeText} />
                <Steps.Step title="In Progress" description={latestRunProcessingTimeText} />
                <Steps.Step title="Finished" description={latestRunTimeLeftText} />
            </Steps>
        );
    }

    function renderOverSlcRate(runsOverSlcCount: number, runsCount: number) {
        function getTagColor(rate: number) {
            if (rate <= 0) return 'blue';
            if (rate <= 0.1) return 'yellow';
            return 'tag';
        }

        const runsOverSlcRate = runsOverSlcCount / runsCount;
        const runsOverSlcRateText = runsOverSlcRate.toLocaleString(undefined, {
            style: 'percent',
            minimumFractionDigits: 1,
        });
        const tagColor = getTagColor(runsOverSlcRate);

        return <Tag color={tagColor}>{runsOverSlcRateText}</Tag>;
    }

    function renderOverSlcDelayAverage(runsOverSlc: Run[]) {
        function getTagColor(delayedHours: number) {
            if (delayedHours <= 0) return 'blue';
            if (delayedHours <= 4) return 'yellow';
            return 'red';
        }

        const runsOverSlcDelayedHours = moment.duration(runsOverSlc.reduce((acc, e) => acc - e.timeLeft, 0)).asHours();
        const runsOverSlcAverageDelay =
            runsOverSlcDelayedHours === 0 ? '0' : (runsOverSlcDelayedHours / runsOverSlc.length).toFixed(2);
        const runsOverSlcAverageDelayText = `${runsOverSlcAverageDelay} hours`;
        const tagColor = getTagColor(runsOverSlcDelayedHours);

        return <Tag color={tagColor}>{runsOverSlcAverageDelayText}</Tag>;
    }

    const slcText = `${slcDuration.asHours().toFixed(0)} hours`;
    const runsCount = runs.length;
    const runsOverSlc = runs.filter((r) => {
        return r.timeLeft < 0;
    });
    const runsOverSlcCount = runsOverSlc.length;

    return (
        <Descriptions title="" bordered>
            <Descriptions.Item label="Latest run" span={3}>
                {renderLatestRunSteps(runs[0])}
            </Descriptions.Item>
            <Descriptions.Item label="SLC">{slcText}</Descriptions.Item>
            <Descriptions.Item label="Show last N runs">
                <InputNumber min={1} max={99} value={runCount} onChange={setRunCount} />
            </Descriptions.Item>
            <Descriptions.Item label="Runs collected">{runsCount}</Descriptions.Item>
            <Descriptions.Item label="Runs over SLC">{runsOverSlcCount}</Descriptions.Item>
            <Descriptions.Item label="Runs over SLC rate">
                {renderOverSlcRate(runsOverSlcCount, runsCount)}
            </Descriptions.Item>
            <Descriptions.Item label="Delay average">{renderOverSlcDelayAverage(runsOverSlc)}</Descriptions.Item>
        </Descriptions>
    );
}

function renderLinePlot(runs: Run[], slcDuration: moment.Duration) {
    const slcInHours = slcDuration.asHours();

    const runsPlotData = runs
        .map((r) => ({
            ...r,
            timeSpentInHours: Number(moment.duration(r.timeSpent).asHours().toFixed(2)),
        }))
        .reverse();

    const config = {
        data: runsPlotData,
        padding: 'auto' as const,
        xField: 'executionDate',
        yField: 'timeSpentInHours',
        yAxis: {
            title: {
                text: 'Time Spent In Hours',
            },
        },
        point: {
            size: 3,
            shape: 'circle',
            style: {
                fill: 'white',
                stroke: 'blue',
                lineWidth: 1,
            },
        },
        annotations: [
            {
                type: 'regionFilter',
                start: ['min', slcInHours] as [string, number],
                end: ['max', 'max'] as [string, string],
                color: 'red',
            },
            {
                type: 'text',
                position: ['min', slcInHours] as [string, number],
                content: 'SLC',
                offsetY: -4,
                style: {
                    textBaseline: 'bottom' as const,
                },
            },
            {
                type: 'line',
                start: ['min', slcInHours] as [string, number],
                end: ['max', slcInHours] as [string, number],
                style: {
                    stroke: 'red',
                    lineDash: [2, 2],
                },
            },
        ],
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
                const timeLeft = moment.duration(run?.timeLeft).asHours();
                const dateDom = `<div>Execution date: ${moment(run?.executionDate).toString()}</div>`;
                const stateDom = `<div>State: ${run?.state}</div>`;
                const timeSpentDom = `<div>Time spent: ${moment
                    .duration(run?.timeSpent)
                    .asHours()
                    .toFixed(2)} hours</div>`;
                const timeLeftDom =
                    timeLeft < 0
                        ? `<div>Time delayed: ${-timeLeft.toFixed(2)} hours</div>`
                        : `<div>Time left: ${timeLeft.toFixed(2)} hours</div>`;

                return `<div>${dateDom}${stateDom}${timeSpentDom}${timeLeftDom}<div>Open in <a href="${run?.externalUrl}">Airflow</a></div></div>`;
            },
        },
    };

    return <Line {...config} />;
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

    const datasetCustomPropertiesWithSlc = datasetQueryResponse?.dataset?.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as DatasetCustomPropertiesWithSlc;
    const slcDuration = moment.duration(`PT${datasetCustomPropertiesWithSlc?.slc.toUpperCase()}`);

    const now = moment(moment.now());
    const runs = runsQueryResponse?.dataset?.runs?.runs
        ?.map(
            (run) =>
                ({
                    ...run?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
                    externalUrl: run?.externalUrl,
                } as RunCustomPropertiesWithExternalUrl),
        )
        .map((r) => {
            const endDate: moment.Moment = r.endDate === undefined ? now : moment(r.endDate);
            const slcTarget: moment.Moment = moment(r.executionDate).add(slcDuration);
            return {
                ...r,
                timeSpent: endDate.diff(r.executionDate),
                timeLeft: slcTarget.diff(endDate),
            };
        }) as Run[];

    return (
        <>
            {renderDescriptions(runs, slcDuration, runCount, setRunCount)}
            {renderLinePlot(runs, slcDuration)}
        </>
    );
};
