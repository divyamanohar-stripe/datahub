import React, { ComponentProps } from 'react';
import { blue, red } from '@ant-design/colors';
import { Column } from '@ant-design/plots';
import moment from 'moment-timezone';
import { convertSecsToHumanReadable, formatDateString, getRunState } from '../functions';
import { DATE_DAILY_DISPLAY_FORMAT, DATE_SEARCH_PARAM_FORMAT, plotColorLegendMapping } from '../constants';
import { ExtractedRun } from '../interfaces';

/**
 * Create columm chart displaying hours until SLA is missed
 * @param runs list of DataJob run results
 * @param allExecDates list of unique execution dates to line up x-axis across charts
 */
export const TimelinessPlot = ({ runs, allExecDates }: { runs: readonly ExtractedRun[]; allExecDates: string[] }) => {
    // create mapping of execution date to color of column based whether missed SLA or not
    let runsPlotData = runs.map((r) => {
        return {
            ...r,
            execDate: formatDateString(r.executionDate),
            values: r.errorTimeLeftToEnd ?? 0,
            runColor: r?.missedSLA ? red.primary : blue.primary,
        };
    });

    // get missing dates from current plot, add them in with null run values, and sort by exec date
    const currPlotDataExecDates = runsPlotData.map((r) => r.execDate);
    const missingDates = allExecDates.filter((x) => !currPlotDataExecDates.includes(x));
    missingDates.forEach((date) => {
        const nullRun = {
            runColor: undefined,
            execDate: date,
            values: 0,
            externalUrl: '',
            executionDate: 0,
            startDate: 0,
            state: '',
            finishedBySLA: null,
            runDuration: 0,
            landingTime: 0,
        };

        runsPlotData.push(nullRun);
    });
    runsPlotData = runsPlotData.sort((a, b) => (a.execDate > b.execDate ? 1 : -1));
    const maxValue = Math.max(...runsPlotData.map((r) => r.values));
    const minValue = Math.min(...runsPlotData.map((r) => r.values));

    const config: ComponentProps<typeof Column> = {
        data: runsPlotData,
        padding: 'auto' as const,
        xField: 'execDate',
        yField: 'values',
        isRange: true,
        xAxis: {
            title: {
                text: 'Execution Date',
            },
            label: {
                formatter: (strDate) => {
                    const date = moment.utc(strDate);
                    // if UTC midnight run, remove hours/minutes from exec date label
                    if (date.hour() === 0 && date.minute() === 0) {
                        return date.format(DATE_DAILY_DISPLAY_FORMAT);
                    }
                    return date.format(DATE_SEARCH_PARAM_FORMAT);
                },
            },
        },
        yAxis: {
            title: {
                text: 'Time Remaining Until SLA',
            },
            label: {
                formatter: (val) =>
                    // display y-axis in decimal hours
                    `${(+val / 3600).toFixed(2)}h`,
            },
            minLimit: Math.abs(minValue) > Math.abs(maxValue) ? Math.abs(minValue) * -1.25 : Math.abs(maxValue) * -1.25,
            maxLimit: Math.abs(maxValue) > Math.abs(minValue) ? Math.abs(maxValue) * 1.25 : Math.abs(minValue) * 1.25,
        },
        legend: {
            position: 'top',
            itemName: {
                formatter: (val) => {
                    return plotColorLegendMapping[val];
                },
            },
        },
        seriesField: 'runColor',
        color: (data) => {
            return data.runColor;
        },
        onEvent: (chart, event) => {
            if (event.type === 'plot:click') {
                const url = event.data?.data?.externalUrl;
                if (url) window.open(url, '_blank');
            }
        },
        tooltip: {
            showMarkers: false,
            enterable: true,
            domStyles: {
                'g2-tooltip': {
                    width: '275px',
                    padding: 0,
                },
            },
            customContent: (title, items) => {
                const run = items[0]?.data;
                if (run?.executionDate) {
                    const status =
                        run?.values > 0
                            ? `<div>${run.state} with ${convertSecsToHumanReadable(
                                  run.values,
                                  true,
                              )} left to spare</div>`
                            : `<div>${getRunState(run)}, but ${convertSecsToHumanReadable(
                                  run.values * -1,
                                  true,
                              )} late</div>`;
                    const execDate = `<div>Execution date: ${formatDateString(run.executionDate)}</div>`;
                    const startDate = `<div>Start date: ${formatDateString(run.startDate)}</div>`;
                    const endDate = run?.endDate ? `<div>End Date: ${formatDateString(run.endDate)}</div>` : '';
                    const landingTime = run?.endDate
                        ? `<div>Landing Time: T+${convertSecsToHumanReadable(
                              (run.endDate - run.executionDate) / 1000.0,
                              true,
                          )}</div>`
                        : '';
                    const runSLA = run?.finishedBySLA
                        ? `<div> Error Level End SLA: ${convertSecsToHumanReadable(run.finishedBySLA, false)} </div>`
                        : '';
                    const airflowLinkText = `<div>Click now to view in Airflow</div>`;
                    return `<div>${status}${execDate}${startDate}${endDate}${landingTime}${runSLA}${airflowLinkText}</div>`;
                }
                return '';
            },
        },
    };

    return (
        <>
            <Column {...config} style={{ marginLeft: '20px', height: '175px' }} />
        </>
    );
};
