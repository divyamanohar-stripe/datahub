import React, { ComponentProps } from 'react';
import moment from 'moment-timezone';
import { Column } from '@ant-design/plots';
import { Descriptions, Layout, Tag } from 'antd';
import { CompactEntityNameList } from '../../../recommendations/renderer/component/CompactEntityNameList';
import { DataJobEntity } from './Types';

const { Header, Content, Sider } = Layout;
const DATE_DAILY_DISPLAY_FORMAT = 'YYYY-MM-DD';
const DATE_SEARCH_PARAM_FORMAT = 'YYYY-MM-DD HH:mm';
const DATE_DISPLAY_TOOLTIP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

type DataJobProperties = {
    finishedBySla: string;
    [key: string]: string;
};

type RunProperties = {
    executionDate: string;
    externalUrl: string;
    state: string;
    startDate: string;
    endDate: string;
};

type Run = RunProperties & {
    errorTimeLeftToEnd: number;
    runDuration: number;
    landingTime: number;
    color: string | null;
};

/**
 * Convert seconds into human readable format
 * @param seconds number of seconds to format
 * @param showSeconds boolean to show seconds in display
 */
function convertSecsToHumanReadable(seconds: number, showSeconds: boolean) {
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

function formatDateString(date: string) {
    return moment.utc(date).format(DATE_DISPLAY_TOOLTIP_FORMAT);
}

/**
 * Calculate percentile from array of values
 * @param arr array of numeric values
 * @param q percentile (ex. 0.9 => p90)
 */
const quantile = (arr, q) => {
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
function getAllExecDates(dataJobEntities) {
    const allExecDates = new Set();
    dataJobEntities.forEach((dataJob) => {
        const runs = dataJob?.runs?.runs?.map((run) => ({
            ...run?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
        }));
        runs.map((r) => allExecDates.add(formatDateString(r?.executionDate)));
    });
    return Array.from(allExecDates).sort();
}

/**
 * Get display name of data job owner from ownership entity
 * @param dataJobEntity DataJob Entity
 */
function getDataJobOwner(dataJobEntity) {
    const { ownership } = dataJobEntity;
    if (ownership !== undefined && ownership !== null && ownership.owners.length > 0) {
        let teamName = ownership?.owners[0]?.owner?.properties?.displayName;
        if (teamName === undefined) {
            teamName = ownership?.owners[0]?.owner?.name;
        }
        return teamName;
    }
    return undefined;
}

/**
 * Get map of owner to list of datajob entities for grouping jobs by owner in UI
 * @param dataJobEntities list of DataJob Entities
 */
function getDataJobOwnerGroup(dataJobEntities) {
    const dataJobOwnerMap: { [key: string]: DataJobEntity[] } = {};
    for (let idx = 0; idx < dataJobEntities.length; idx++) {
        const currDataJob = dataJobEntities[idx];
        const currOwner = getDataJobOwner(currDataJob);
        if (currOwner in dataJobOwnerMap) {
            const currDataJobs = dataJobOwnerMap[currOwner];
            currDataJobs.push(currDataJob);
            dataJobOwnerMap[currOwner] = currDataJobs;
        } else {
            dataJobOwnerMap[currOwner] = [currDataJob];
        }
    }
    return dataJobOwnerMap;
}

/**
 * render header of chart with title: "Team: did task succees in SLA?"
 * @param taskId taskId of DataJob
 * @param finishedBySla error end SLA
 * @param dataJobEntity data job entity to render
 */
function renderPlotHeader(taskId: string, finishedBySla: string, dataJobEntity) {
    const finishedBySlaHours = moment
        .duration(finishedBySla, 'seconds')
        .asHours()
        .toFixed(2)
        .replace(/[.,]00$/, ''); // round to 2 decimal places if not whole number

    return (
        <Descriptions
            title={
                <span>
                    {`Did `}
                    <CompactEntityNameList entities={[dataJobEntity]} />
                    {` succeed in ${finishedBySlaHours} hours?`}
                </span>
            }
            bordered
            style={{ marginTop: '15px' }}
        />
    );
}

/**
 * Create side SLA miss summary with % met deadline and p90 landing time
 * @param runs list of DataJob run results
 */
function renderSlaMissSummary(runs: Run[]) {
    // return color of met deadline tag based on percentage of SLA meets
    function getTagColor(metDeadlinePercentage: number) {
        if (metDeadlinePercentage < 70) return 'red';
        if (metDeadlinePercentage < 100) return 'yellow';
        return 'blue';
    }

    const metDeadlinePercentage = (
        (runs.filter((r) => {
            return r.errorTimeLeftToEnd >= 0;
        }).length /
            runs.length) *
        100.0
    ).toFixed(2);

    const landingTimes = runs.map((r) => r.landingTime);
    const p90Landing = convertSecsToHumanReadable(quantile(landingTimes, 0.9), false);
    const p80Landing = convertSecsToHumanReadable(quantile(landingTimes, 0.8), false);
    const tagColor = getTagColor(parseInt(metDeadlinePercentage, 10));

    return (
        <Descriptions title="" bordered size="small" column={{ md: 1 }} style={{ marginLeft: '20px', height: '2px' }}>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="Met Deadline">
                <Tag color={tagColor}>{`${metDeadlinePercentage}%`}</Tag>
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="p90 Delivery">
                {`${p90Landing}`}
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="p80 Delivery">
                {`${p80Landing}`}
            </Descriptions.Item>
        </Descriptions>
    );
}

/**
 * Create columm chart displaying hours until SLA is missed
 * @param runs list of DataJob run results
 * @param allExecDates list of unique execution dates to line up x-axis across charts
 */
function renderTimelinessPlot(sla: moment.Duration, runs: Run[], allExecDates: string[]) {
    // create mapping of execution date to color of column based whether missed SLA or not
    const slaMissData = new Map();
    let runsPlotData = runs.map((r) => {
        if (r.errorTimeLeftToEnd > 0) {
            slaMissData.set(formatDateString(r.executionDate), 'CornflowerBlue');
        } else {
            slaMissData.set(formatDateString(r.executionDate), 'Crimson');
        }
        return {
            ...r,
            execDate: formatDateString(r.executionDate),
            values: r.errorTimeLeftToEnd,
        };
    });

    // get missing dates from current plot, add them in with null run values, and sort by exec date
    const currPlotDataExecDates = runsPlotData.map((r) => r.execDate);
    const missingDates = allExecDates.filter((x) => !currPlotDataExecDates.includes(x));
    missingDates.forEach((date) => {
        const nullRun = {
            errorTimeLeftToEnd: 0,
            runDuration: 0,
            landingTime: 0,
            color: null,
            executionDate: 'none',
            externalUrl: 'none',
            state: 'none',
            startDate: 'none',
            endDate: 'none',
            execDate: date,
            values: 0,
        };

        runsPlotData.push(nullRun);
    });
    runsPlotData = runsPlotData.sort(function (a, b) {
        if (a.execDate > b.execDate) return 1;
        return -1;
    });

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
                text: 'Time Until SLA',
            },
            label: {
                formatter: (val) =>
                    // display y-axis in decimal hours
                    `${(+val / 3600).toFixed(2)}h`,
            },
            ...(sla.asHours() > 1
                ? {
                      minLimit: -sla.asSeconds() * 1.25,
                      maxLimit: sla.asSeconds() * 1.25,
                  }
                : {}),
        },
        color: (execDate) => {
            return slaMissData.get(execDate.execDate);
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
                const run = items[0]?.data as Run;
                if (run?.executionDate !== 'none') {
                    const status =
                        run?.errorTimeLeftToEnd > 0
                            ? `<div>${run?.state} with ${convertSecsToHumanReadable(
                                  run?.errorTimeLeftToEnd,
                                  true,
                              )} left to spare</div>`
                            : `<div>${run?.state}, but ${convertSecsToHumanReadable(
                                  run?.errorTimeLeftToEnd * -1,
                                  true,
                              )} late</div>`;
                    const execDate = `<div>Execution date: ${formatDateString(run?.executionDate)}</div>`;
                    const startDate = `<div>Start date: ${formatDateString(run?.startDate)}</div>`;
                    const endDate = `<div>End Date: ${formatDateString(run?.endDate)}</div>`;
                    const landingTime = `<div>Landing Time: T+${convertSecsToHumanReadable(
                        run?.landingTime,
                        true,
                    )}</div>`;
                    return `<div>${status}${execDate}${startDate}${endDate}${landingTime}</div>`;
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
}

/**
 * Create DataJobProperties & RunProperties from dataJob query result and render layout
 * @param dataJobEntity DataJob query result
 * @param allExecDates list of unique execution dates to line up timeliness x-axis across charts
 */
function formatDataAndRenderPlots(dataJobEntity, allExecDates) {
    const now = moment.utc();
    const dataJobProperties = dataJobEntity?.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as DataJobProperties;

    const taskId = dataJobEntity?.jobId;

    if (dataJobProperties === undefined) return <>Task {taskId}: not correctly set up</>;

    const errorSlaDuration = moment.duration(dataJobProperties?.finishedBySla, 'seconds');

    const runs = dataJobEntity?.runs?.runs
        ?.map(
            (run) =>
                ({
                    ...run?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
                    externalUrl: run?.externalUrl,
                } as RunProperties),
        )
        .map((r) => {
            const endDate: moment.Moment = r.endDate === 'None' ? now : moment(r.endDate);
            const slaTarget: moment.Moment = moment(r.executionDate).add(errorSlaDuration);
            return {
                ...r,
                errorTimeLeftToEnd: slaTarget.diff(endDate, 'seconds'),
                runDuration: endDate.diff(r.startDate, 'seconds'),
                landingTime: endDate.diff(r.executionDate, 'seconds'),
            };
        }) as Run[];

    // sort by start date to remove all but last try per execution date
    runs.sort((a, b) => (new Date(a.startDate).getTime() < new Date(b.startDate).getTime() ? 1 : -1));
    const uniqueExecDates: string[] = [];
    const latestRuns = runs.filter((run) => {
        const isDuplicate = uniqueExecDates.includes(run.executionDate);
        if (!isDuplicate) {
            uniqueExecDates.push(run.executionDate);
            return true;
        }
        return false;
    });
    // sort by execution date
    latestRuns.sort((a, b) => (new Date(a.executionDate).getTime() > new Date(b.executionDate).getTime() ? 1 : -1));

    return (
        <>
            <Layout>
                <Header>{renderPlotHeader(taskId, dataJobProperties.finishedBySla, dataJobEntity)}</Header>
                <Layout>
                    <Sider>{renderSlaMissSummary(latestRuns)}</Sider>
                    <Content>{renderTimelinessPlot(errorSlaDuration, latestRuns, allExecDates)}</Content>
                </Layout>
            </Layout>
        </>
    );
}

export const HistoricalTimelinessUserDefinedReportContent = (dataJobEntities) => {
    const uniqueExecDates = getAllExecDates(dataJobEntities);
    const dataJobOwnerGrouping = getDataJobOwnerGroup(dataJobEntities);

    return (
        <>
            {Object.entries(dataJobOwnerGrouping).map(([teamName, dataJobEntitiesList]) => {
                return (
                    <>
                        <Descriptions title={teamName} bordered style={{ marginTop: '15px', marginLeft: '15px' }} />
                        {dataJobEntitiesList.map((dataJobEntity) =>
                            formatDataAndRenderPlots(dataJobEntity, uniqueExecDates),
                        )}
                    </>
                );
            })}
        </>
    );
};
