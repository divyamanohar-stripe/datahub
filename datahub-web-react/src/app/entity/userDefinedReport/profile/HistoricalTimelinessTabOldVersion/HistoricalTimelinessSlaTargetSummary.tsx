import * as React from 'react';
import moment from 'moment-timezone';
import { ComponentProps } from 'react';
import { Line } from '@ant-design/charts';
import { extractDataJobFromEntity } from './data-conversion';
import { nullthrows } from '../../../../../utils/nullthrows';

type Props = {
    targetSlaPercentage: number | null;
    dataJobEntitiesList: readonly any[];
};

export function HistoricalTimelinessSlaTargetSummary({ targetSlaPercentage, dataJobEntitiesList }: Props) {
    const intervalDays: readonly number[] = [7, 30, 90];
    const data = intervalDays.flatMap((days) => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const dataPoints = calculateSlidingWindowCounts(moment.duration(days, 'days'), dataJobEntitiesList);
        return dataPoints.map((dataPoint) => ({
            hits: dataPoint.counts.total - dataPoint.counts.misses,
            total: dataPoint.counts.total,
            days: `previous ${days} days`,
            dayCount: days,
            executionDate: dataPoint.executionDate.toDate(),
            percentMeetingSla: 1 - dataPoint.counts.misses / dataPoint.counts.total,
        }));
    });

    if (!data.length) {
        return <></>;
    }

    const lineDashForPoint = (point: Record<string, any>) => {
        const days = +nullthrows(/\d+/.exec(point.days))[0];
        switch (days) {
            case 7:
                return [1, 5];
            case 30:
                return [5, 6];
            case 90:
                return undefined;
            default:
                return undefined;
        }
    };

    const annotations: ComponentProps<typeof Line>['annotations'] = [];
    if (targetSlaPercentage !== null) {
        annotations.push(
            {
                type: 'region',
                start: ['start', targetSlaPercentage],
                end: ['end', 'start'],
                style: {
                    fill: '#faa423',
                    fillOpacity: 0.15,
                },
            },
            {
                type: 'text',
                content: `below target % \u25BC`,
                position: ['start', targetSlaPercentage],
                offsetX: 5,
                offsetY: -11,
                style: {
                    opacity: 0.2,
                },
            },
        );
    }

    const config: ComponentProps<typeof Line> = {
        data,
        padding: 'auto' as const,
        xField: 'executionDate',
        yField: 'percentMeetingSla',
        seriesField: 'days',
        smooth: true,
        point: {
            size: 0,
        },
        color: ['#005AB5', '#5D3A9B', '#4B0092'],
        lineStyle: (point) => ({
            // lineWidth: intervalDays.indexOf(+nullthrows(/\d+/.exec(point.days))[0]) + 1,
            lineDash: lineDashForPoint(point),
            lineWidth: 2,
            opacity: 0.7,
            color: ['#333333', '#888888', '#cccccc'],
        }),
        annotations,
        xAxis: {
            type: 'time',
        },
        yAxis: {
            min: 0,
            max: 1,
            tickCount: 3,
            label: {
                formatter: (x) => `${(100 * +x).toFixed(0)}%`,
            },
        },
        tooltip: {
            customContent: (executionDate, items) => {
                return `
                    <div style="padding: 10px 0px">
                        <div style="font-size: 120%; margin-bottom: 5px">${executionDate}</div>
                        <table style="margin-left: 10px">
                            <tbody>
                            ${items
                                .map(
                                    (item) => `
                                        <tr>
                                            <td align="right" style="padding-right: 2px; padding-top: 8px;">
                                                ${item.data.days}
                                            </td>
                                            <td style="color: ${
                                                item.mappingData.color
                                            }; padding-top: 5px; padding-right: 2px;">
                                                &#11044;
                                            </td>
                                            <td style="padding-top: 8px; font-weight: bold;">
                                                ${(100 * item.data.percentMeetingSla).toFixed(1)}%
                                            </td>
                                            <td style="padding-top: 8px; padding-left: 5px; opacity: 0.7">
                                                (${item.data.hits} of ${item.data.total} runs)
                                            </td>
                                        </tr>
                                    `,
                                )
                                .join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            },
        },
        legend: {
            position: 'left',
        },
    };
    return (
        <div style={{ marginLeft: '60px', marginBottom: '20px' }}>
            <div style={{ fontSize: '110%', marginTop: '20px', marginBottom: '20px', fontWeight: 'bold' }}>
                Percentage of jobs meeting SLA
            </div>
            <Line {...config} height={175} />
        </div>
    );
}

type Counts = { readonly total: number; readonly misses: number };

function mergeCounts(a: Counts, b: Counts): Counts {
    return { total: a.total + b.total, misses: a.misses + b.misses };
}

function calculateSlidingWindowCounts(windowLength: moment.Duration, dataJobEntities: readonly any[]) {
    const byExecutionDate: Map<number, Counts> = new Map();
    dataJobEntities.forEach((dataJobEntity) => {
        const extracted = extractDataJobFromEntity(dataJobEntity);
        if ('error' in extracted) {
            return;
        }

        // effectively zero; not set
        if (extracted.dataJobProperties.finishedBySlaDuration.asMinutes() < 1) {
            return;
        }

        extracted.latestRuns.forEach((run) => {
            const counts = { total: 1, misses: run.isWithinSla ? 0 : 1 };
            const executionDate = new Date(run.executionDate).getTime();
            const existing = byExecutionDate.get(executionDate);
            const merged = existing ? mergeCounts(counts, existing) : counts;
            byExecutionDate.set(executionDate, merged);
        });
    });

    const sortedWithDates: Array<{ readonly executionDate: moment.Moment; readonly counts: Counts }> = [];
    byExecutionDate.forEach((counts, executionDate) =>
        sortedWithDates.push({ executionDate: moment(new Date(executionDate)), counts }),
    );
    sortedWithDates.sort((a, b) => (a.executionDate.isBefore(b.executionDate) ? -1 : 1));

    const dataPoints: Array<{ readonly executionDate: moment.Moment; readonly counts: Counts }> = [];

    let firstIndex = 0;
    let lastIndex = 0;

    // Skip data points until we have a full {windowLength} of data
    while (lastIndex < sortedWithDates.length) {
        const { executionDate } = sortedWithDates[lastIndex];
        const { executionDate: firstExecutionDate } = sortedWithDates[firstIndex];
        if (moment(firstExecutionDate).add(windowLength).isBefore(executionDate)) {
            break;
        }
        lastIndex++;
    }

    for (; lastIndex < sortedWithDates.length; lastIndex++) {
        const { executionDate } = sortedWithDates[lastIndex];
        const minExecutionDate = moment(executionDate).subtract(windowLength);
        while (firstIndex < lastIndex && sortedWithDates[firstIndex].executionDate.isBefore(minExecutionDate)) {
            firstIndex++;
        }
        const merged = sortedWithDates
            .slice(firstIndex, lastIndex + 1)
            .map(({ counts }) => counts)
            .reduce(mergeCounts);
        dataPoints.push({ executionDate, counts: merged });
    }

    return dataPoints;
}
