import * as React from 'react';
import moment from 'moment-timezone';
import { ComponentProps } from 'react';
import { Line } from '@ant-design/charts';
import { nullthrows } from '../../../../../utils/nullthrows';
import { DataJobEntity } from './SharedContent';
import { extractDataJobFromEntity } from './data-conversion';

const DATE_DAILY_DISPLAY_FORMAT = 'YYYY-MM-DD';

type Counts = { readonly total: number; readonly teamWithBadDayCnt: number };

type Range = { lowerTarget: number | null; upperTarget: number | null };

type Props = {
    targetRange: Range;
    dataJobOwnerGrouping: { [key: string]: DataJobEntity[] };
};

/**
 * Calculate the good day metric per team. A team has a good day if all DataJob runs for that day
 * have succeeded within SLA. Note if a DataJob doesn't set SLA, it's excluded from the measurement.
 * @param dataJobEntities list of DataJob Entities for each team
 * @return a map of executionDate => 1 if the team has a good day, 0 if it has a bad day
 */
function getTeamGoodDayMeasure(dataJobEntities: readonly any[]) {
    const byExecutionDate: Map<string, number> = new Map();
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
            // Merge hourly runs into daily measures, ie. strip hours from executionDate
            const execDate = moment.utc(run.executionDate).format(DATE_DAILY_DISPLAY_FORMAT);
            const existing = byExecutionDate.get(execDate);
            if (!run.isWithinSla) {
                byExecutionDate.set(execDate, 0);
            } else if (run.isWithinSla && existing === undefined) {
                byExecutionDate.set(execDate, 1);
            }
        });
    });

    return byExecutionDate;
}

/**
 * Calculate the good day metric in aggregate of a given time range
 * @param windowLength the time range for the aggregate metric
 * @param sortedAllDaysArr sorted list of {executionDate, isGoodDay} in ascending order
 * @return a list of {executionDate, count of good days for the given windowLength}
 */
function calculateGoodDaysAggregate(windowLength: moment.Duration, sortedAllDaysArr: readonly any[]) {
    const dataPoints: Array<{ readonly executionDate: string; readonly goodDaysCnt: number }> = [];

    let firstIndex = 0;
    let lastIndex = 0;

    // Skip data points until we have a full {windowLength} of data
    while (lastIndex < sortedAllDaysArr.length) {
        const lastExecDate = moment.utc(sortedAllDaysArr[lastIndex].executionDate);
        const firstExecDate = moment.utc(sortedAllDaysArr[firstIndex].executionDate);
        if (firstExecDate.add(windowLength).isSameOrBefore(lastExecDate)) {
            break;
        }
        lastIndex++;
    }

    if (lastIndex !== 0 && lastIndex !== sortedAllDaysArr.length) {
        lastIndex -= 1;
    }

    for (; lastIndex < sortedAllDaysArr.length; lastIndex++) {
        const { executionDate } = sortedAllDaysArr[lastIndex];
        const minExecutionDate = moment.utc(executionDate).subtract(windowLength).format(DATE_DAILY_DISPLAY_FORMAT);
        while (firstIndex < lastIndex && sortedAllDaysArr[firstIndex].executionDate <= minExecutionDate) {
            firstIndex++;
        }
        const sum: number = sortedAllDaysArr
            .slice(firstIndex, lastIndex + 1)
            .map(({ isGoodDay }) => isGoodDay)
            .reduce((a, b) => {
                return a + b;
            });
        dataPoints.push({ executionDate, goodDaysCnt: sum });
    }

    return dataPoints;
}

function addCounts(a: Counts, b: Counts): Counts {
    return { total: a.total + b.total, teamWithBadDayCnt: a.teamWithBadDayCnt + b.teamWithBadDayCnt };
}

/**
 * Get the good day metric data points to render the summary chart on Historical Timeliness content page
 * @param dataJobOwnerGrouping map of team name to list of its DataJob Entities
 */
function getDataPoints(dataJobOwnerGrouping: { [key: string]: DataJobEntity[] }, targetTeamsPercentage: number) {
    const allDaysByDate: Map<string, number> = new Map();
    const allTeamsCounts: Map<string, Counts> = new Map();
    Object.entries(dataJobOwnerGrouping).forEach(([, dataJobEntitiesList]) => {
        const goodDaysPerTeam = getTeamGoodDayMeasure(dataJobEntitiesList);
        // Count teams that had a bad day and total teams for each day.
        // Get good/bad day metric across teams for each day - overall it's a good day if at least
        // {targetTeamsPercentage} of teams had a good day, otherwise it's a bad day.
        goodDaysPerTeam.forEach((isGoodDay, execDate) => {
            let counts: Counts;

            if (isGoodDay === 0) {
                counts = { total: 1, teamWithBadDayCnt: 1 };
            } else {
                counts = { total: 1, teamWithBadDayCnt: 0 };
            }

            const oldCounts = allTeamsCounts.get(execDate);
            const newCounts = oldCounts ? addCounts(counts, oldCounts) : counts;
            allTeamsCounts.set(execDate, newCounts);
            const isGoodDaySoFar = 1 - newCounts.teamWithBadDayCnt / newCounts.total >= targetTeamsPercentage ? 1 : 0;
            allDaysByDate.set(execDate, isGoodDaySoFar);
        });
    });

    const sortedAllDaysArr: Array<{ readonly executionDate: string; readonly isGoodDay: number }> = Array.from(
        allDaysByDate,
        ([key, value]) => ({ executionDate: key, isGoodDay: value }),
    );
    sortedAllDaysArr.sort((a, b) => (a.executionDate < b.executionDate ? -1 : 1));

    // Calculate good days counts in aggregate for the given interval days
    const intervalDays: readonly number[] = [7, 30, 90];
    const aggregateData = intervalDays.flatMap((days) => {
        const dataPoints = calculateGoodDaysAggregate(moment.duration(days, 'days'), sortedAllDaysArr);
        return dataPoints.map((dataPoint) => ({
            numGoodDays: dataPoint.goodDaysCnt,
            totalDays: days,
            days: `last ${days} days`,
            dayCount: days,
            executionDate: dataPoint.executionDate,
            goodDaysPercent: dataPoint.goodDaysCnt / days,
        }));
    });

    // Merge daily data with aggregate data
    const sortedCountsByDate: Array<{ readonly executionDate: string; readonly teamCount: Counts }> = Array.from(
        allTeamsCounts,
        ([key, value]) => ({ executionDate: key, teamCount: value }),
    );
    sortedCountsByDate.sort((a, b) => (a.executionDate < b.executionDate ? -1 : 1));

    const dailyData = sortedCountsByDate.map((dataPoint) => ({
        numTeams: dataPoint.teamCount.total - dataPoint.teamCount.teamWithBadDayCnt,
        totalTeams: dataPoint.teamCount.total,
        days: `current 1 day`,
        dayCount: 1,
        executionDate: dataPoint.executionDate,
        teamsHavingGoodDayPercent: 1 - dataPoint.teamCount.teamWithBadDayCnt / dataPoint.teamCount.total,
    }));

    return { aggregateData, dailyData };
}

function setAndReturnConfig(
    data,
    xFieldName: string,
    yFieldName: string,
    seriesFieldName: string,
    colorArr,
    targetRange: Range,
    customContentFn,
) {
    const lineDashForPoint = (point: Record<string, any>) => {
        const days = +nullthrows(/\d+/.exec(point[seriesFieldName]))[0];
        switch (days) {
            case 1:
                return [1, 5];
            case 7:
                return [5, 6];
            case 30:
                return [10, 12];
            case 90:
                return undefined;
            default:
                // eslint-disable-next-line
                console.warn(`while determining what lineDash for a point, didn't know what to do with ${days} days`);
                return undefined;
        }
    };

    const annotations: ComponentProps<typeof Line>['annotations'] = [];
    if (targetRange.lowerTarget !== null && targetRange.upperTarget !== null) {
        annotations.push(
            {
                type: 'region',
                start: ['start', targetRange.lowerTarget],
                end: ['end', 'start'],
                style: {
                    fill: '#fa4e23',
                    fillOpacity: 0.15,
                },
            },
            {
                type: 'region',
                start: ['start', targetRange.upperTarget],
                end: ['end', targetRange.lowerTarget],
                style: {
                    fill: '#faa423',
                    fillOpacity: 0.15,
                },
            },
            {
                type: 'text',
                content: `upper target ${(100 * +targetRange.upperTarget).toFixed(0)}% \u25BC`,
                position: ['start', targetRange.upperTarget],
                offsetX: 5,
                offsetY: -11,
                style: {
                    opacity: 0.3,
                },
            },
            {
                type: 'text',
                content: `lower target ${(100 * +targetRange.lowerTarget).toFixed(0)}% \u25b2`,
                position: ['start', targetRange.lowerTarget],
                offsetX: 5,
                offsetY: 11,
                style: {
                    opacity: 0.3,
                },
            },
        );
    } else if (targetRange.lowerTarget !== null || targetRange.upperTarget !== null) {
        let targetThreshold = 0;
        if (targetRange.lowerTarget !== null) {
            targetThreshold = targetRange.lowerTarget;
        } else if (targetRange.upperTarget !== null) {
            targetThreshold = targetRange.upperTarget;
        }
        annotations.push(
            {
                type: 'region',
                start: ['start', targetThreshold],
                end: ['end', 'start'],
                style: {
                    fill: '#faa423',
                    fillOpacity: 0.15,
                },
            },
            {
                type: 'text',
                content: `below target ${(100 * +targetThreshold).toFixed(0)}% \u25BC`,
                position: ['start', targetThreshold],
                offsetX: 5,
                offsetY: -11,
                style: {
                    opacity: 0.3,
                },
            },
        );
    }

    const config: ComponentProps<typeof Line> = {
        data,
        padding: 'auto' as const,
        xField: xFieldName,
        yField: yFieldName,
        seriesField: seriesFieldName,
        smooth: true,
        point: {
            size: 0,
        },
        color: colorArr,
        lineStyle: (point) => ({
            lineDash: lineDashForPoint(point),
            lineWidth: 2,
            opacity: 0.7,
        }),
        annotations,
        yAxis: {
            min: 0,
            max: 1,
            label: {
                formatter: (x) => `${(100 * +x).toFixed(0)}%`,
            },
        },
        tooltip: {
            customContent: customContentFn,
        },
        legend: {
            position: 'left',
        },
    };

    return config;
}

function renderOverallPlot(data: readonly any[], targetRange: Range) {
    if (!data.length) {
        return <></>;
    }

    const color = ['#005AB5', '#5D3A9B', '#4B0092'];
    const customContentFn = (executionDate, items) => {
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
                                                ${(100 * item.data.goodDaysPercent).toFixed(1)}%
                                            </td>
                                            <td style="padding-top: 8px; padding-left: 5px; opacity: 0.7">
                                                (${item.data.numGoodDays} of ${item.data.totalDays} days)
                                            </td>
                                        </tr>
                                  `,
                                )
                                .join('')}
                            </tbody>
                        </table>
                    </div>
                `;
    };

    const config = setAndReturnConfig(
        data,
        'executionDate',
        'goodDaysPercent',
        'days',
        color,
        targetRange,
        customContentFn,
    );
    return (
        <>
            <div style={{ fontSize: '115%', marginTop: '20px', marginBottom: '5px', fontWeight: 'bold' }}>
                Overall good days percentage
            </div>
            <div style={{ fontSize: '100%', marginTop: '5px', marginBottom: '20px' }}>
                Overall it&apos;s a good day if at least 80% of the teams have a good day. See below plot for details.
            </div>
            <Line {...config} height={175} />
        </>
    );
}

function renderTeamsPlot(data: readonly any[], targetRange: Range) {
    if (!data.length) {
        return <></>;
    }

    const color = ['#006C18'];
    const customContentFn = (executionDate, items) => {
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
                                                ${(100 * item.data.teamsHavingGoodDayPercent).toFixed(1)}%
                                            </td>
                                            <td style="padding-top: 8px; padding-left: 5px; opacity: 0.7">
                                                (${item.data.numTeams} of ${item.data.totalTeams} teams)
                                            </td>
                                        </tr>
                                  `,
                                )
                                .join('')}
                            </tbody>
                        </table>
                    </div>
                `;
    };

    const config = setAndReturnConfig(
        data,
        'executionDate',
        'teamsHavingGoodDayPercent',
        'days',
        color,
        targetRange,
        customContentFn,
    );
    return (
        <>
            <div style={{ fontSize: '110%', marginTop: '20px', marginBottom: '5px', fontWeight: 'bold' }}>
                Percentage of teams having a good day
            </div>
            <div style={{ fontSize: '100%', marginTop: '5px', marginBottom: '20px' }}>
                A team has a good day if all its data jobs land within SLA on a given day, otherwise a bad day.
            </div>
            <Line {...config} height={175} />
        </>
    );
}

export function HistoricalTimelinessGoodDayMetric({ targetRange, dataJobOwnerGrouping }: Props) {
    const targetTeamsPercentage = { lowerTarget: null, upperTarget: 0.8 };
    const data = getDataPoints(dataJobOwnerGrouping, targetTeamsPercentage.upperTarget);

    return (
        <div style={{ marginLeft: '15px', marginBottom: '20px' }}>
            {renderOverallPlot(data.aggregateData, targetRange)}
            {renderTeamsPlot(data.dailyData, targetTeamsPercentage)}
        </div>
    );
}
