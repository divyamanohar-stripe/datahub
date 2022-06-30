import { Column } from '@ant-design/plots';
import { Descriptions, InputNumber, Steps, Tag } from 'antd';
import moment from 'moment-timezone';
import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { useGetDatasetQuery, useGetDatasetRunsQuery } from '../../../../graphql/dataset.generated';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';
import { RelationshipDirection } from '../../../../types.generated';
import { useEntityData } from '../../shared/EntityContext';

type DatasetCustomPropertiesWithSla = {
    finishedBySla: string;
    startedBySla: string;
    warnFinishedBySla: string;
    warnStartedBySla: string;
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
    errorTimeLeftToEnd: number;
    errorTimeLeftToStart: number;
    warnTimeLeftToEnd: number;
    warnTimeLeftToStart: number;
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

function errorWarnText(errorSla: number, warnSla: number) {
    if (errorSla > 0 && warnSla > 0) {
        return ' ERROR / WARN ';
    }
    if (errorSla > 0) {
        return ' ERROR ';
    }
    if (warnSla > 0) {
        return ' WARN ';
    }
    return '';
}

function slash(errorSla: number, warnSla: number) {
    if (errorSla > 0 && warnSla > 0) {
        return ' / ';
    }
    return '';
}

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

function renderDescriptions(
    runs: Run[],
    errorSlaDuration: moment.Duration,
    errorStartSlaDuration: moment.Duration,
    warnSlaDuration: moment.Duration,
    warnStartSlaDuration: moment.Duration,
    runCount: number,
    setRunCount,
    nRunRef,
) {
    function renderLatestRunSteps(latestRun: Run) {
        function formatProcessingTimeText(startDate: string | undefined, endDate: string | undefined): string {
            if (startDate === 'None') {
                return '';
            }

            if (endDate === 'None') {
                return `Running for: ${convertSecsToHumanReadable(
                    moment.duration(moment(moment.now()).diff(moment(startDate))).asSeconds(),
                )}`;
            }
            return `Ran for: ${convertSecsToHumanReadable(
                moment.duration(moment(endDate).diff(moment(startDate))).asSeconds(),
            )}`;
        }

        const {
            executionDate: latestRunExecutionDate,
            state: latestRunState,
            startDate: latestRunStartDate,
            endDate: latestRunEndDate,
            errorTimeLeftToEnd: errorLatestRunTimeLeft,
            errorTimeLeftToStart: errorLatestStartTimeLeft,
            warnTimeLeftToEnd: warnLatestRunTimeLeft,
            warnTimeLeftToStart: warnLatestStartTimeLeft,
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
        if (errorSlaDuration.asMinutes() > 0) {
            latestRunTimeLeftText =
                errorLatestRunTimeLeft >= 0
                    ? `Time remaining until end ERROR SLA: ${convertSecsToHumanReadable(
                          moment.duration(errorLatestRunTimeLeft).asSeconds(),
                      )}`
                    : `Time delayed over end ERROR SLA: ${convertSecsToHumanReadable(
                          moment.duration(-errorLatestRunTimeLeft).asSeconds(),
                      )}`;
        } else if (warnSlaDuration.asMinutes() > 0) {
            latestRunTimeLeftText =
                warnLatestRunTimeLeft >= 0
                    ? `Time remaining until end WARN SLA: ${convertSecsToHumanReadable(
                          moment.duration(warnLatestRunTimeLeft).asSeconds(),
                      )}`
                    : `Time delayed over end WARN SLA: ${convertSecsToHumanReadable(
                          moment.duration(-warnLatestRunTimeLeft).asSeconds(),
                      )}`;
        }
        let latestStartTimeLeftText = '';
        if (errorStartSlaDuration.asMinutes() > 0) {
            latestStartTimeLeftText =
                errorLatestStartTimeLeft >= 0
                    ? `\nTime remaining until start ERROR SLA: ${convertSecsToHumanReadable(
                          moment.duration(errorLatestStartTimeLeft).asSeconds(),
                      )}`
                    : `\nTime delayed over start ERROR SLA: ${convertSecsToHumanReadable(
                          moment.duration(-errorLatestStartTimeLeft).asSeconds(),
                      )}`;
        }
        if (warnStartSlaDuration.asMinutes() > 0) {
            latestStartTimeLeftText =
                warnLatestStartTimeLeft >= 0
                    ? `\nTime remaining until start WARN SLA: ${convertSecsToHumanReadable(
                          moment.duration(warnLatestStartTimeLeft).asSeconds(),
                      )}`
                    : `\nTime delayed over start WARN SLA: ${convertSecsToHumanReadable(
                          moment.duration(-warnLatestStartTimeLeft).asSeconds(),
                      )}`;
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
            if (runsOverSlaRateText === '') {
                return 'grey';
            }
            if (rate <= 0) return 'blue';
            if (rate <= 0.1) return 'yellow';
            return 'red';
        }
        if (sla.asMinutes() === 0) {
            return '';
        }
        const runsOverSlaRate = runsOverSlaCount / runsCount;
        let runsOverSlaRateText = '';
        if (sla.asMinutes() > 0) {
            runsOverSlaRateText = runsOverSlaRate.toLocaleString(undefined, {
                style: 'percent',
                minimumFractionDigits: 1,
            });
        }
        const tagColor = getTagColor(runsOverSlaRate, runsOverSlaRateText);

        return <Tag color={tagColor}>{runsOverSlaRateText}</Tag>;
    }

    function renderOverSlaDelayAverage(runsOverSla: Run[], sla_type: string, error: boolean) {
        function getTagColor(delayedMins: number) {
            if (delayedMins <= 0) return 'blue';
            if (delayedMins <= 240) return 'yellow';
            return 'red';
        }
        let runsOverSlaDelayedMins: number;
        if (sla_type === 'startedBy') {
            runsOverSlaDelayedMins = moment
                .duration(
                    runsOverSla.reduce((acc, e) => acc - (error ? e.errorTimeLeftToStart : e.warnTimeLeftToStart), 0),
                )
                .asMinutes();
        } else {
            runsOverSlaDelayedMins = moment
                .duration(runsOverSla.reduce((acc, e) => acc - (error ? e.errorTimeLeftToEnd : e.warnTimeLeftToEnd), 0))
                .asMinutes();
        }

        const runsOverSlaAverageDelay =
            runsOverSlaDelayedMins === 0 ? 0 : +(runsOverSlaDelayedMins / runsOverSla.length).toFixed(2);
        const runsOverSlaAverageDelayText = `${convertSecsToHumanReadable(runsOverSlaAverageDelay * 60)}`;
        const tagColor = getTagColor(runsOverSlaDelayedMins);

        return <Tag color={tagColor}>{runsOverSlaAverageDelayText}</Tag>;
    }

    const runsCount = runs.length;

    const errorStartSlaDurationText =
        errorStartSlaDuration.asMinutes() > 0 ? `${convertSecsToHumanReadable(errorStartSlaDuration.asSeconds())}` : '';
    const errorEndSlaDurationText =
        errorSlaDuration.asMinutes() > 0 ? `${convertSecsToHumanReadable(errorSlaDuration.asSeconds())}` : '';
    const errorSlaText = `${errorStartSlaDurationText} - ${errorEndSlaDurationText}`;

    const errorRunsOverEndSla = runs.filter((r) => {
        return r.errorTimeLeftToEnd < 0;
    });
    const errorRunsOverEndSlaCount = errorRunsOverEndSla.length;

    const errorRunsOverStartSla = runs.filter((r) => {
        return r.errorTimeLeftToStart < 0;
    });
    const errorRunsOverStartSlaCount = errorRunsOverStartSla.length;

    const warnStartSlaDurationText =
        warnStartSlaDuration.asMinutes() > 0 ? `${convertSecsToHumanReadable(warnStartSlaDuration.asSeconds())}` : '';
    const warnEndSlaDurationText =
        warnSlaDuration.asMinutes() > 0 ? `${convertSecsToHumanReadable(warnSlaDuration.asSeconds())}` : '';
    const warnSlaText = `${warnStartSlaDurationText} - ${warnEndSlaDurationText}`;

    const warnRunsOverEndSla = runs.filter((r) => {
        return r.warnTimeLeftToEnd < 0;
    });
    const warnRunsOverEndSlaCount = warnRunsOverEndSla.length;

    const warnRunsOverStartSla = runs.filter((r) => {
        return r.warnTimeLeftToStart < 0;
    });
    const warnRunsOverStartSlaCount = warnRunsOverStartSla.length;

    return (
        <Descriptions title="" bordered>
            <Descriptions.Item label="Latest run" span={3}>
                {renderLatestRunSteps(runs[runs.length - 1])}
            </Descriptions.Item>
            <Descriptions.Item label="ERROR / WARN Start - End SLAs">
                {errorSlaText} / {warnSlaText}
            </Descriptions.Item>
            <Descriptions.Item label="Show last N runs">
                <InputNumber
                    ref={nRunRef}
                    min={1}
                    max={99}
                    value={runCount}
                    onPressEnter={() => {
                        const myVal = +nRunRef.current!.value;
                        setRunCount(myVal > 0 ? myVal : 20);
                    }}
                    onStep={setRunCount}
                />
            </Descriptions.Item>
            <Descriptions.Item label="Runs collected">{runs.length}</Descriptions.Item>
            <Descriptions.Item
                label={`Runs finished over${errorWarnText(
                    errorSlaDuration.asMinutes(),
                    warnSlaDuration.asMinutes(),
                )}SLA`}
            >
                {errorSlaDuration.asMinutes() > 0 ? errorRunsOverEndSlaCount : ''}{' '}
                {slash(errorSlaDuration.asMinutes(), warnSlaDuration.asMinutes())}
                {warnSlaDuration.asMinutes() > 0 ? warnRunsOverEndSlaCount : ''}
            </Descriptions.Item>
            <Descriptions.Item
                label={`% finished over${errorWarnText(errorSlaDuration.asMinutes(), warnSlaDuration.asMinutes())}SLA`}
            >
                {renderOverSlaRate(errorRunsOverEndSlaCount, runsCount, errorSlaDuration)}{' '}
                {slash(errorSlaDuration.asMinutes(), warnSlaDuration.asMinutes())}
                {renderOverSlaRate(warnRunsOverEndSlaCount, runsCount, warnSlaDuration)}
            </Descriptions.Item>
            <Descriptions.Item
                label={`${errorWarnText(
                    errorSlaDuration.asMinutes(),
                    warnSlaDuration.asMinutes(),
                )}SLA End Delay Average`}
            >
                {errorSlaDuration.asMinutes() > 0
                    ? renderOverSlaDelayAverage(errorRunsOverEndSla, 'finishedBy', true)
                    : ''}{' '}
                {slash(errorSlaDuration.asMinutes(), warnSlaDuration.asMinutes())}
                {warnSlaDuration.asMinutes() > 0
                    ? renderOverSlaDelayAverage(warnRunsOverEndSla, 'finishedBy', false)
                    : ''}
            </Descriptions.Item>
            <Descriptions.Item
                label={`Runs started over${errorWarnText(
                    errorStartSlaDuration.asMinutes(),
                    warnStartSlaDuration.asMinutes(),
                )}SLA`}
            >
                {errorStartSlaDuration.asMinutes() > 0 ? errorRunsOverStartSlaCount : ''}{' '}
                {slash(errorStartSlaDuration.asMinutes(), warnStartSlaDuration.asMinutes())}
                {warnStartSlaDuration.asMinutes() > 0 ? warnRunsOverStartSlaCount : ''}
            </Descriptions.Item>
            <Descriptions.Item
                label={`% started over${errorWarnText(
                    errorStartSlaDuration.asMinutes(),
                    warnStartSlaDuration.asMinutes(),
                )}SLA`}
            >
                {renderOverSlaRate(errorRunsOverStartSlaCount, runsCount, errorStartSlaDuration)}{' '}
                {slash(errorStartSlaDuration.asMinutes(), warnStartSlaDuration.asMinutes())}
                {renderOverSlaRate(warnRunsOverStartSlaCount, runsCount, warnStartSlaDuration)}
            </Descriptions.Item>
            <Descriptions.Item
                label={`${errorWarnText(
                    errorStartSlaDuration.asMinutes(),
                    warnStartSlaDuration.asMinutes(),
                )}SLA Start Delay Average`}
            >
                {errorStartSlaDuration.asMinutes() > 0
                    ? renderOverSlaDelayAverage(errorRunsOverStartSla, 'startedBy', true)
                    : ''}
                {slash(errorStartSlaDuration.asMinutes(), warnStartSlaDuration.asMinutes())}
                {warnStartSlaDuration.asMinutes() > 0
                    ? renderOverSlaDelayAverage(warnRunsOverStartSla, 'startedBy', false)
                    : ''}
            </Descriptions.Item>
        </Descriptions>
    );
}

function renderTimelinessPlot(
    runs: Run[],
    errorSlaDuration: moment.Duration,
    errorStartSlaDuration: moment.Duration,
    warnSlaDuration: moment.Duration,
    warnStartSlaDuration: moment.Duration,
) {
    function getSlaAnnotations(
        errorEndSlaInMinutes: number,
        errorStartSlaInMinutes: number,
        warnEndSlaInMinutes: number,
        warnStartSlaInMinutes: number,
    ) {
        const annotations: any[] = [];
        if (errorEndSlaInMinutes > 0) {
            const errorEndLine = {
                type: 'line',
                start: ['start', errorEndSlaInMinutes] as [string, number],
                end: ['end', errorEndSlaInMinutes] as [string, number],
                style: {
                    stroke: 'Red',
                    lineDash: [2, 2],
                },
            };
            const errorEndText = {
                type: 'text',
                position: ['max', errorEndSlaInMinutes] as [string, number],
                content: 'Error End SLA',
                offsetX: -40,
                style: { textBaseline: 'top' as const },
            };
            annotations.push(errorEndLine);
            annotations.push(errorEndText);
        }
        if (errorStartSlaInMinutes > 0) {
            const errorStartLine = {
                type: 'line',
                start: ['start', errorStartSlaInMinutes] as [string, number],
                end: ['end', errorStartSlaInMinutes] as [string, number],
                style: {
                    stroke: 'Red',
                    lineDash: [2, 2],
                },
            };
            const errorStartText = {
                type: 'text',
                position: ['max', errorStartSlaInMinutes] as [string, number],
                content: 'Error Start SLA',
                offsetX: -44,
                style: { textBaseline: 'top' as const },
            };
            annotations.push(errorStartLine);
            annotations.push(errorStartText);
        }
        if (warnEndSlaInMinutes > 0) {
            const warnEndLine = {
                type: 'line',
                start: ['start', warnEndSlaInMinutes] as [string, number],
                end: ['end', warnEndSlaInMinutes] as [string, number],
                style: {
                    stroke: 'Gold',
                    lineDash: [2, 2],
                },
            };
            const warnEndText = {
                type: 'text',
                position: ['max', warnEndSlaInMinutes] as [string, number],
                content: 'Warn End SLA',
                offsetX: -40,
                style: { textBaseline: 'top' as const },
            };
            annotations.push(warnEndLine);
            annotations.push(warnEndText);
        }
        if (warnStartSlaInMinutes > 0) {
            const warnStartLine = {
                type: 'line',
                start: ['start', warnStartSlaInMinutes] as [string, number],
                end: ['end', warnStartSlaInMinutes] as [string, number],
                style: {
                    stroke: 'Gold',
                    lineDash: [2, 2],
                },
            };
            const warnStartText = {
                type: 'text',
                position: ['max', warnStartSlaInMinutes] as [string, number],
                content: 'Warn Start SLA',
                offsetX: -44,
                style: { textBaseline: 'top' as const },
            };
            annotations.push(warnStartText);
            annotations.push(warnStartLine);
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

    const errorEndSlaInMins = errorSlaDuration.asMinutes();
    const errorStartSlaInMins = errorStartSlaDuration.asMinutes();
    const warnEndSlaInMins = warnSlaDuration.asMinutes();
    const warnStartSlaInMins = warnStartSlaDuration.asMinutes();
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
            (item.endDate !== 'None' &&
                errorEndSlaInMins !== 0 &&
                item.values !== null &&
                item.values[1] > errorEndSlaInMins) ||
            (item.startDate !== 'None' &&
                errorStartSlaInMins !== 0 &&
                item.values !== null &&
                item.values[0] > errorStartSlaInMins)
        ) {
            slaMissData.set(item.execDate, 'Crimson');
        } else if (
            (item.endDate !== 'None' &&
                warnEndSlaInMins !== 0 &&
                item.values !== null &&
                item.values[1] > warnEndSlaInMins) ||
            (item.startDate !== 'None' &&
                warnStartSlaInMins !== 0 &&
                item.values !== null &&
                item.values[0] > warnStartSlaInMins)
        ) {
            slaMissData.set(item.execDate, 'GoldenRod');
        } else if (item.state === 'running' || item.endDate === 'None') {
            slaMissData.set(item.execDate, 'Grey');
        } else {
            slaMissData.set(item.execDate, 'CornflowerBlue');
        }
    });

    function getYs(index: number) {
        return runsPlotData.map((r) => (r.values !== null ? r.values[index] : 0));
    }
    const minVal = Math.floor(Math.min(...getYs(0)));
    const maxVal = Math.floor(Math.max(...getYs(1)));
    const diff = Math.ceil(maxVal * 0.01);
    const minY = Math.floor(minVal - diff > 0 ? minVal - diff : 0);
    const maxY = Math.ceil(maxVal + diff);

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
            minLimit: minY,
            maxLimit: maxY,
        },
        color: (execDate) => {
            return slaMissData.get(execDate.execDate);
        },
        annotations: getSlaAnnotations(errorEndSlaInMins, errorStartSlaInMins, warnEndSlaInMins, warnStartSlaInMins),
        tooltip: {
            showMarkers: false,
            enterable: true,
            domStyles: {
                'g2-tooltip': {
                    width: '315px',
                    padding: 0,
                },
            },
            customContent: (title, items) => {
                const run = items[0]?.data as Run;
                const errorTimeLeftToEnd = moment.duration(run?.errorTimeLeftToEnd).asSeconds();
                const errorTimeLeftToStart = moment.duration(run?.errorTimeLeftToStart).asSeconds();
                const warnTimeLeftToEnd = moment.duration(run?.warnTimeLeftToEnd).asSeconds();
                const warnTimeLeftToStart = moment.duration(run?.warnTimeLeftToStart).asSeconds();
                const execDateString = formatDateString(run?.executionDate);
                const dateDom = `<div>Execution date: ${execDateString}</div>`;
                const stateDom = `<div>State: ${run?.state}</div>`;
                const runDuration = `<div>Task run duration: ${convertSecsToHumanReadable(
                    run?.runDuration / 1000,
                )}</div>`;
                let errorTimeLeftDom = '';
                if (errorEndSlaInMins !== 0) {
                    errorTimeLeftDom =
                        errorTimeLeftToEnd < 0
                            ? `<div>Time delayed over ERROR end SLA: ${convertSecsToHumanReadable(
                                  -errorTimeLeftToEnd,
                              )}</div>`
                            : `<div>Time remaining until ERROR end SLA: ${convertSecsToHumanReadable(
                                  errorTimeLeftToEnd,
                              )}</div>`;
                }
                let errorStartTimeLeftDom = '';
                if (errorStartSlaInMins !== 0) {
                    errorStartTimeLeftDom =
                        errorTimeLeftToStart < 0
                            ? `<div>Time delayed over ERROR start SLA: ${convertSecsToHumanReadable(
                                  -errorTimeLeftToStart,
                              )}</div>`
                            : `<div>Time remaining until ERROR start SLA: ${convertSecsToHumanReadable(
                                  errorTimeLeftToStart,
                              )}</div>`;
                }
                let warnTimeLeftDom = '';
                if (warnEndSlaInMins !== 0) {
                    warnTimeLeftDom =
                        warnTimeLeftToEnd < 0
                            ? `<div>Time delayed over WARN end SLA: ${convertSecsToHumanReadable(
                                  -warnTimeLeftToEnd,
                              )}</div>`
                            : `<div>Time remaining until WARN end SLA: ${convertSecsToHumanReadable(
                                  warnTimeLeftToEnd,
                              )}</div>`;
                }
                let warnStartTimeLeftDom = '';
                if (warnStartSlaInMins !== 0) {
                    warnStartTimeLeftDom =
                        warnTimeLeftToStart < 0
                            ? `<div>Time delayed over WARN start SLA: ${convertSecsToHumanReadable(
                                  -warnTimeLeftToStart,
                              )}</div>`
                            : `<div>Time remaining until WARN start SLA: ${convertSecsToHumanReadable(
                                  warnTimeLeftToStart,
                              )}</div>`;
                }
                let startedAt = '';
                if (run !== undefined && run.startDate !== 'None') {
                    startedAt = `<div>Started At: ${formatDateString(run.startDate)}</div>`;
                }
                let finishedAt = '';
                if (run !== undefined && run.endDate !== 'None') {
                    finishedAt = `<div>Ended At: ${formatDateString(run.endDate)}</div>`;
                }
                return `<div>${dateDom}${startedAt}${finishedAt}${runDuration}${stateDom}${errorTimeLeftDom}${errorStartTimeLeftDom}${warnTimeLeftDom}${warnStartTimeLeftDom}<div>Open in <a href="${run?.externalUrl}">Airflow</a></div></div>`;
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
    const nRunRef: React.MutableRefObject<HTMLInputElement | null> = useRef(null);

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
    const errorSlaDuration = moment.duration(datasetCustomPropertiesWithSla?.finishedBySla, 'seconds');
    const errorStartSlaDuration = moment.duration(datasetCustomPropertiesWithSla?.startedBySla, 'seconds');

    const warnSlaDuration = moment.duration(datasetCustomPropertiesWithSla?.warnFinishedBySla, 'seconds');
    const warnStartSlaDuration = moment.duration(datasetCustomPropertiesWithSla?.warnStartedBySla, 'seconds');
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
            const slaTarget: moment.Moment = moment(r.executionDate).add(errorSlaDuration);
            const startSlaTarget: moment.Moment = moment(r.executionDate).add(errorStartSlaDuration);
            const warnSlaTarget: moment.Moment = moment(r.executionDate).add(warnSlaDuration);
            const warnStartSlaTarget: moment.Moment = moment(r.executionDate).add(warnStartSlaDuration);
            return {
                ...r,
                errorTimeLeftToEnd: slaTarget.diff(endDate),
                errorTimeLeftToStart: startSlaTarget.diff(startDate),
                warnTimeLeftToEnd: warnSlaTarget.diff(endDate),
                warnTimeLeftToStart: warnStartSlaTarget.diff(startDate),
                runDuration: endDate.diff(r.startDate),
            };
        }) as Run[];
    runs.sort((a, b) => (new Date(a.executionDate).getTime() > new Date(b.executionDate).getTime() ? 1 : -1));

    return (
        <>
            {renderDescriptions(
                runs,
                errorSlaDuration,
                errorStartSlaDuration,
                warnSlaDuration,
                warnStartSlaDuration,
                runCount,
                setRunCount,
                nRunRef,
            )}
            {renderTimelinessPlot(runs, errorSlaDuration, errorStartSlaDuration, warnSlaDuration, warnStartSlaDuration)}
        </>
    );
};
