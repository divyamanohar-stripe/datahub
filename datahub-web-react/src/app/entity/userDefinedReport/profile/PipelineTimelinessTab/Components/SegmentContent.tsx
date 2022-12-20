import React from 'react';
import moment from 'moment-timezone';
import { Layout, Table } from 'antd';
import {
    getAirflowLinkFromRun,
    getSLAString,
    getSLAMissTag,
    getStateTag,
    getCurrentRunLandingTimeToolTip,
} from '../functions';
import { convertSecsToHumanReadable } from '../../../../shared/stripe-utils';
import { ANTD_GRAY } from '../../../../shared/constants';
import { DataRunEntity, FormattedDataJob, FormattedSegment, SimilarRunsRowData } from '../interfaces';
import { CompactEntityNameList } from '../../../../../recommendations/renderer/component/CompactEntityNameList';

const { Content } = Layout;

// function to add previous same day of week and previous EOM run to similar runs data table for SegmentContent component
function addPreviousRunsToExpandedRows(
    run: DataRunEntity | null,
    reportDate: moment.Moment,
    similarRunName: string,
    dataJobEntity,
    averageDuration: number | null,
    averageLandingTime: number | null,
): SimilarRunsRowData[] {
    return [
        {
            similarRunName,
            sla: 'SLA',
            missedSLA: 'Missed SLA?',
            executionDate: 'Execution Date',
            landingTime: 'Landing Time',
            duration: 'Duration',
            airflowLink: 'Airflow Link',
        },
        {
            similarRunName: getStateTag(run),
            sla: getSLAString(run),
            missedSLA: getSLAMissTag(run),
            executionDate: run ? moment.utc(run.execution.logicalDate).format('YYYY-MM-DDTHH:mm:ss') : '-',
            landingTime: getCurrentRunLandingTimeToolTip(run, averageDuration, averageLandingTime, reportDate),
            duration: run?.execution?.endDate
                ? convertSecsToHumanReadable((run.execution.endDate - run.execution.startDate) / 1000)
                : '-',
            airflowLink: getAirflowLinkFromRun(run, dataJobEntity?.jobId),
        },
    ];
}

// component for the expanded rows with previous run data per data job
const ExpandedDataJobRows = ({ record, reportDate }: { record: FormattedDataJob; reportDate: moment.Moment }) => {
    const { dataJobEntity, previousSameWeekdayRun, previousEOMRun, previousRuns, averageDuration, averageLandingTime } =
        record;

    let similarTasksTableData = previousRuns.map((currentRun) => {
        return {
            similarRunName: getStateTag(currentRun),
            sla: getSLAString(currentRun),
            missedSLA: getSLAMissTag(currentRun),
            executionDate: moment.utc(currentRun.execution.logicalDate).format('YYYY-MM-DDTHH:mm:ss'),
            landingTime: getCurrentRunLandingTimeToolTip(currentRun, averageDuration, averageLandingTime, reportDate),
            duration: currentRun?.execution?.endDate
                ? convertSecsToHumanReadable((currentRun.execution.endDate - currentRun.execution.startDate) / 1000)
                : '-',
            airflowLink: getAirflowLinkFromRun(currentRun, dataJobEntity?.jobId),
        } as SimilarRunsRowData;
    });

    const previousSameWeekdayRunRowData = addPreviousRunsToExpandedRows(
        previousSameWeekdayRun,
        reportDate,
        `Previous ${reportDate.format('dddd')} Run`,
        dataJobEntity,
        averageDuration,
        averageLandingTime,
    );
    const previousEOMRunRowData = addPreviousRunsToExpandedRows(
        previousEOMRun,
        reportDate,
        `Previous EOM Run`,
        dataJobEntity,
        averageDuration,
        averageLandingTime,
    );

    if (previousSameWeekdayRun) similarTasksTableData = [...similarTasksTableData, ...previousSameWeekdayRunRowData];
    if (previousEOMRun) similarTasksTableData = [...similarTasksTableData, ...previousEOMRunRowData];

    const columns = [
        {
            title: 'Latest Runs',
            dataIndex: 'similarRunName',
            render(text) {
                return {
                    props: {
                        style: {
                            background:
                                typeof text === 'string' && (text === 'Latest Runs' || text.startsWith('Previous'))
                                    ? ANTD_GRAY[2]
                                    : null,
                        },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
        {
            title: 'SLA',
            dataIndex: 'sla',
            render(text) {
                return {
                    props: {
                        style: { background: text === 'SLA' ? ANTD_GRAY[2] : null },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
        {
            title: 'Missed SLA?',
            dataIndex: 'missedSLA',
            render(text) {
                return {
                    props: {
                        style: { background: text === 'Missed SLA?' ? ANTD_GRAY[2] : null },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
        {
            title: 'Execution Date',
            dataIndex: 'executionDate',
            render(text) {
                return {
                    props: {
                        style: {
                            background: text === 'Execution Date' ? ANTD_GRAY[2] : null,
                        },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
        {
            title: 'Landing Time',
            dataIndex: 'landingTime',
            render(text) {
                return {
                    props: {
                        style: {
                            background: text === 'Landing Time' ? ANTD_GRAY[2] : null,
                        },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            render(text) {
                return {
                    props: {
                        style: {
                            background: text === 'Duration' && text === 'Duration' ? ANTD_GRAY[2] : null,
                        },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
        {
            title: 'Airflow Link',
            dataIndex: 'airflowLink',
            render(text) {
                return {
                    props: {
                        style: {
                            background: text === 'Airflow Link' ? ANTD_GRAY[2] : null,
                        },
                    },
                    children: <div>{text}</div>,
                };
            },
        },
    ];

    return <Table columns={columns} dataSource={similarTasksTableData} pagination={false} />;
};

// component for the overall table data for each data job for the current run
const SegmentDataJobsContent = ({
    reportDate,
    segmentId,
    segments,
}: {
    reportDate: moment.Moment;
    segmentId: number;
    segments: FormattedSegment[];
}) => {
    const timelinessColumns = [
        {
            title: 'Task',
            dataIndex: 'dataJobEntity',
            render: (dataJobEntity) => <CompactEntityNameList entities={[dataJobEntity]} />,
        },
        {
            title: 'State',
            dataIndex: 'currentRun',
            render: (currentRun) => {
                return getStateTag(currentRun);
            },
        },
        {
            title: 'Contact',
            dataIndex: 'contact',
            render: (owners) => {
                if (owners.length > 0 && owners[0] && owners[0]?.urn) {
                    return <CompactEntityNameList entities={[owners[0]]} />;
                }
                return '';
            },
        },
        {
            title: 'SLA',
            dataIndex: 'currentRun',
            render: (currentRun) => {
                return getSLAString(currentRun);
            },
        },
        {
            title: 'Missed SLA?',
            dataIndex: 'currentRun',
            render: (currentRun) => {
                return getSLAMissTag(currentRun);
            },
        },
        {
            title: 'Average Landing Time',
            dataIndex: 'averageLandingTime',
            render: (averageLandingTime) => {
                if (!averageLandingTime) return <>N/A</>;
                return <>T+{convertSecsToHumanReadable(averageLandingTime)}</>;
            },
        },
        {
            title: 'Current Run Landing Time',
            render: (segmentDataJob) => {
                return getCurrentRunLandingTimeToolTip(
                    segmentDataJob?.currentRun,
                    segmentDataJob?.averageDuration,
                    segmentDataJob?.averageLandingTime,
                    reportDate,
                );
            },
        },
        {
            title: 'Airflow Link',
            render: (segmentDataJob) => {
                return getAirflowLinkFromRun(segmentDataJob?.currentRun, segmentDataJob?.dataJobEntity?.jobId);
            },
        },
    ];

    return (
        <Table
            rowKey={(record) => {
                return record?.dataJobEntity?.jobId ?? '';
            }}
            columns={timelinessColumns}
            expandedRowRender={(record) => <ExpandedDataJobRows record={record} reportDate={reportDate} />}
            dataSource={segments[segmentId].orderedDataJobs}
            size="small"
        />
    );
};

// component for runs on data jobs within each segment
export const SegmentContent = ({
    reportDate,
    segments,
    segmentId,
}: {
    reportDate: moment.Moment;
    segments: FormattedSegment[];
    segmentId: number;
}) => {
    return (
        <Layout
            style={{
                marginLeft: 290,
                marginRight: 20,
            }}
        >
            <Content>
                <SegmentDataJobsContent segmentId={segmentId} segments={segments} reportDate={reportDate} />
            </Content>
        </Layout>
    );
};
