import React, { ComponentProps } from 'react';
import styled from 'styled-components';
import moment from 'moment-timezone';
import { Column } from '@ant-design/plots';
import { Descriptions, Layout, Tag } from 'antd';
import { useGetDataJobHistoricalSlaTrackingQuery } from '../../../../graphql/dataJob.generated';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';

const { Header, Content, Sider } = Layout;
const DATE_DAILY_DISPLAY_FORMAT = 'YYYY-MM-DD';
const DATE_SEARCH_PARAM_FORMAT = 'YYYY-MM-DD HH:mm';
const DATE_DISPLAY_TOOLTIP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

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

type DataJobProperties = {
    taskId: string;
    finishedBySla: string;
    project: string;
    domainName: string;
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
 * @param dataJobQueryResults list of DataJob query results
 */
function getAllExecDates(dataJobQueryResults) {
    const allExecDates = new Set();
    dataJobQueryResults.forEach((dataJob) => {
        const runs = dataJob?.dataJob?.runs?.runs?.map((run) => ({
            ...run?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
        }));
        runs.map((r) => allExecDates.add(formatDateString(r?.executionDate)));
    });
    return Array.from(allExecDates).sort();
}

/**
 * render header of chart with title: "Team: did task succees in SLA?"
 * @param taskId taskId of DataJob
 * @param finishedBySla error end SLA
 * @param project team owner of DataJob
 */
function renderPlotHeader(taskId: string, finishedBySla: string, project: string) {
    const finishedBySlaHours = moment.duration(finishedBySla, 'seconds').asHours();
    return (
        <Descriptions
            title={`${project}: Did ${taskId} succeed in ${finishedBySlaHours} hours?`}
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
    const tagColor = getTagColor(parseInt(metDeadlinePercentage, 10));

    return (
        <Descriptions title="" bordered size="small" column={{ md: 1 }} style={{ marginLeft: '20px', height: '2px' }}>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="Met Deadline">
                <Tag color={tagColor}>{`${metDeadlinePercentage}%`}</Tag>
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="p90 Delivery">
                {`${p90Landing}`}
            </Descriptions.Item>
        </Descriptions>
    );
}

/**
 * Create columm chart displaying hours until SLA is missed
 * @param runs list of DataJob run results
 * @param domainName name of domain on DataJob for linking to domain timeliness page
 * @param allExecDates list of unique execution dates to line up x-axis across charts
 */
function renderTimelinessPlot(runs: Run[], domainName, allExecDates: string[]) {
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
        },
        color: (execDate) => {
            return slaMissData.get(execDate.execDate);
        },
        onEvent: (chart, event) => {
            if (event.type === 'plot:click') {
                const currExecDate = event.data?.data?.executionDate;
                if (domainName === 'UAR' && currExecDate !== undefined) {
                    // link to domain timeliness page based on domain name and execution date
                    const anchor = document.createElement('a');
                    const currMoment = moment.utc(currExecDate).format(DATE_SEARCH_PARAM_FORMAT);
                    anchor.href = `Domain Timeliness?is_lineage_mode=false&domainDate=${currMoment}`;
                    anchor.target = '_blank';
                    anchor.click();
                    anchor.remove();
                }
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
            <Column {...config} style={{ marginLeft: '20px', height: '130px' }} />
        </>
    );
}

/**
 * Create DataJobProperties & RunProperties from dataJob query result and render layout
 * @param dataJob DataJob query result
 * @param allExecDates list of unique execution dates to line up timeliness x-axis across charts
 */
function formatDataAndRenderPlots(dataJob, allExecDates) {
    const now = moment.utc();
    const dataJobProperties = dataJob?.dataJob?.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as DataJobProperties;
    dataJobProperties.taskId = dataJob?.dataJob?.properties?.name;
    dataJobProperties.domainName = dataJob?.dataJob?.domain?.properties?.name;

    const errorSlaDuration = moment.duration(dataJobProperties?.finishedBySla, 'seconds');

    const runs = dataJob?.dataJob?.runs?.runs
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
                <Header>
                    {renderPlotHeader(
                        dataJobProperties.taskId,
                        dataJobProperties.finishedBySla,
                        dataJobProperties.project,
                    )}
                </Header>
                <Layout>
                    <Sider>{renderSlaMissSummary(latestRuns)}</Sider>
                    <Content>{renderTimelinessPlot(latestRuns, dataJobProperties.domainName, allExecDates)}</Content>
                </Layout>
            </Layout>
        </>
    );
}

export const HistoricalSLATracking = () => {
    /** critical tasks
     *  icplus.DailyIcPlusFees
     *  cost_platform.ledger.network_cost_actual_alltime_bookkeep
     *  HyperToTableau.RUN_GTM_DSE.agg_sales_fys_onr -> communia_sales.AggSalesFysOnr
     *  finfra__alerting.AcquiringReconDownstreamSLA
     *  financialreporting.PublishDataAvailableUpdates.cohort_activity_lineitems-datasphere_finrep
     */
    const urn = [
        'urn:li:dataJob:(urn:li:dataFlow:(airflow,financial_reporting,PROD),financialreporting.PublishDataAvailableUpdates.cohort_activity_lineitems-datasphere_finrep)',
        'urn:li:dataJob:(urn:li:dataFlow:(airflow,finfra,PROD),finfra__alerting.AcquiringReconDownstreamSLA)',
        'urn:li:dataJob:(urn:li:dataFlow:(airflow,dailycron,PROD),communia_sales.AggSalesFysOnr)',
        'urn:li:dataJob:(urn:li:dataFlow:(airflow,finfra,PROD),cost_platform.ledger.network_cost_actual_alltime_bookkeep)',
        'urn:li:dataJob:(urn:li:dataFlow:(airflow,dailycron,PROD),icplus.DailyIcPlusFees)',
        'urn:li:dataJob:(urn:li:dataFlow:(airflow,finfra,PROD),ops_reporting.OtlDailyWithTransfers)',
    ];

    const loading: boolean[] = [];
    const { loading: loadingJobUAR, data: dataJobUAR } = useGetDataJobHistoricalSlaTrackingQuery({
        variables: { urn: urn[0] },
    });

    loading.push(loadingJobUAR);

    const { loading: loadingJobRecon, data: dataJobRecon } = useGetDataJobHistoricalSlaTrackingQuery({
        variables: { urn: urn[1] },
    });
    loading.push(loadingJobRecon);

    const { loading: loadingJobGTM, data: dataJobGTM } = useGetDataJobHistoricalSlaTrackingQuery({
        variables: { urn: urn[2] },
    });
    loading.push(loadingJobGTM);

    const { loading: loadingJobBook, data: dataJobBook } = useGetDataJobHistoricalSlaTrackingQuery({
        variables: { urn: urn[3] },
    });
    loading.push(loadingJobBook);

    const { loading: loadingJobCost, data: dataJobCost } = useGetDataJobHistoricalSlaTrackingQuery({
        variables: { urn: urn[4] },
    });
    loading.push(loadingJobCost);

    const { loading: loadingJobRRE, data: dataJobRRE } = useGetDataJobHistoricalSlaTrackingQuery({
        variables: { urn: urn[5] },
    });
    loading.push(loadingJobRRE);

    if (loading.some((b) => b)) {
        return loadingPage;
    }

    const uniqueExecDates = getAllExecDates([
        dataJobUAR,
        dataJobRecon,
        dataJobCost,
        dataJobBook,
        dataJobGTM,
        dataJobRRE,
    ]);

    return (
        <>
            {formatDataAndRenderPlots(dataJobUAR, uniqueExecDates)}
            {formatDataAndRenderPlots(dataJobRecon, uniqueExecDates)}
            {formatDataAndRenderPlots(dataJobCost, uniqueExecDates)}
            {formatDataAndRenderPlots(dataJobBook, uniqueExecDates)}
            {formatDataAndRenderPlots(dataJobGTM, uniqueExecDates)}
            {formatDataAndRenderPlots(dataJobRRE, uniqueExecDates)}
        </>
    );
};
