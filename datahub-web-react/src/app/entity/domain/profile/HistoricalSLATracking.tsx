import React, { ComponentProps } from 'react';
import styled from 'styled-components';
import moment from 'moment-timezone';
import { Column } from '@ant-design/plots';
import { Descriptions, Layout, Tag } from 'antd';
import { useGetDataJobQuery, useGetDataJobRunsQuery } from '../../../../graphql/dataJob.generated';
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
    runDuration: number;
    landingTime: number;
    color: string | null;
};

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

function formatDateString(date: string | undefined) {
    if (date === undefined) {
        return date;
    }
    return moment.utc(date).format(DATE_DISPLAY_TOOLTIP_FORMAT);
}

const quantile = (arr, q) => {
    const sorted = arr.sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base];
};

function renderPlotHeader(taskId: string, finishedBySla: string) {
    const finishedBySlaHours = moment.duration(finishedBySla, 'seconds').asHours();
    return (
        <Descriptions
            title={`Did ${taskId} succeed in ${finishedBySlaHours} hours?`}
            bordered
            style={{ marginTop: '15px' }}
        />
    );
}

function renderSlaMissSummary(runs: Run[], project) {
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
        <Descriptions title="" bordered size="small" column={{ md: 1 }} style={{ marginLeft: '20px' }}>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="Met Deadline">
                <Tag color={tagColor}>{`${metDeadlinePercentage}%`}</Tag>
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="p90 Delivery">
                {`${p90Landing}`}
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="Task Owner">
                {`${project}`}
            </Descriptions.Item>
        </Descriptions>
    );
}

function renderTimelinessPlot(runs: Run[], domainName) {
    const slaMissData = new Map();
    const runsPlotData = runs.map((r) => {
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
            label: { formatter: (val) => `${(+val / 3600).toFixed(2)}h` },
        },
        color: (execDate) => {
            return slaMissData.get(execDate.execDate);
        },
        onEvent: (chart, event) => {
            if (event.type === 'plot:click') {
                if (domainName === 'UAR') {
                    const anchor = document.createElement('a');
                    const currExecDate = event.data?.data?.executionDate;
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
                    width: '315px',
                    padding: 0,
                },
            },
            customContent: (title, items) => {
                const run = items[0]?.data as Run;
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
                const duration = `<div>Duration: ${convertSecsToHumanReadable(run?.runDuration, true)}</div>`;
                return `<div>${status}${execDate}${startDate}${endDate}${duration}</div>`;
            },
        },
    };

    return (
        <>
            <Column {...config} style={{ marginLeft: '20px', height: '200px' }} />
        </>
    );
}

function formatDataAndRenderPlots(dataJob, dataJobRuns, domainName) {
    const now = moment.utc();
    const dataJobProperties = dataJob?.dataJob?.properties?.customProperties?.reduce(
        (acc, e) => ({ ...acc, [e.key]: e.value }),
        {},
    ) as DataJobProperties;
    dataJobProperties.taskId = dataJob?.dataJob?.properties?.name;

    const errorSlaDuration = moment.duration(dataJobProperties?.finishedBySla, 'seconds');

    const runs = dataJobRuns?.dataJob?.runs?.runs
        ?.map(
            (run) =>
                ({
                    ...run?.properties?.customProperties?.reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {}),
                    externalUrl: run?.externalUrl,
                } as RunCustomPropertiesWithExternalUrl),
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

    // TODO: get domain urn from query
    // const domainUrn = 'urn:li:domain:uar';

    return (
        <>
            <Layout>
                <Header>{renderPlotHeader(dataJobProperties.taskId, dataJobProperties.finishedBySla)}</Header>
                <Layout>
                    <Sider>{renderSlaMissSummary(latestRuns, dataJobProperties.project)}</Sider>
                    <Content>{renderTimelinessPlot(latestRuns, domainName)}</Content>
                </Layout>
            </Layout>
        </>
    );
}

export const HistoricalSLATracking = () => {
    const runsCount = 30;
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
    ];

    const loading: boolean[] = [];
    const { loading: loadingJobUAR, data: dataJobUAR } = useGetDataJobQuery({ variables: { urn: urn[0] } });
    const { loading: loadingRunsUAR, data: dataJobRunsUAR } = useGetDataJobRunsQuery({
        variables: { urn: urn[0], start: 0, count: runsCount },
    });
    loading.push(loadingJobUAR, loadingRunsUAR);

    const { loading: loadingJobRecon, data: dataJobRecon } = useGetDataJobQuery({ variables: { urn: urn[1] } });
    const { loading: loadingRunsRecon, data: dataJobRunsRecon } = useGetDataJobRunsQuery({
        variables: { urn: urn[1], start: 0, count: runsCount },
    });
    loading.push(loadingJobRecon, loadingRunsRecon);

    const { loading: loadingJobGTM, data: dataJobGTM } = useGetDataJobQuery({ variables: { urn: urn[2] } });
    const { loading: loadingRunsGTM, data: dataJobRunsGTM } = useGetDataJobRunsQuery({
        variables: { urn: urn[2], start: 0, count: runsCount },
    });
    loading.push(loadingJobGTM, loadingRunsGTM);

    const { loading: loadingJobBook, data: dataJobBook } = useGetDataJobQuery({ variables: { urn: urn[3] } });
    const { loading: loadingRunsBook, data: dataJobRunsBook } = useGetDataJobRunsQuery({
        variables: { urn: urn[3], start: 0, count: runsCount },
    });
    loading.push(loadingJobBook, loadingRunsBook);

    const { loading: loadingJob1Cost, data: dataJobCost } = useGetDataJobQuery({ variables: { urn: urn[4] } });
    const { loading: loadingRunsCost, data: dataJobRunsCost } = useGetDataJobRunsQuery({
        variables: { urn: urn[4], start: 0, count: runsCount },
    });
    loading.push(loadingJob1Cost, loadingRunsCost);

    if (loading.some((b) => b)) {
        return loadingPage;
    }

    const uarDomain = 'UAR';
    const otherDomain = null;

    return (
        <>
            {formatDataAndRenderPlots(dataJobUAR, dataJobRunsUAR, uarDomain)}
            {formatDataAndRenderPlots(dataJobRecon, dataJobRunsRecon, uarDomain)}
            {formatDataAndRenderPlots(dataJobCost, dataJobRunsCost, uarDomain)}
            {formatDataAndRenderPlots(dataJobBook, dataJobRunsBook, otherDomain)}
            {formatDataAndRenderPlots(dataJobGTM, dataJobRunsGTM, otherDomain)}
        </>
    );
};
