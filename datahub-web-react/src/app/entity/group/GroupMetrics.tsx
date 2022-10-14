import React, { FC } from 'react';
import moment from 'moment-timezone';
import { Line } from '@ant-design/plots';
import { PageHeader, Table, Tag } from 'antd';
import { orderBy } from 'lodash';
import { DeliveredProcedureOutlined } from '@ant-design/icons';
import { CompactEntityNameList } from '../../recommendations/renderer/component/CompactEntityNameList';
import { convertSecsToHumanReadable } from '../shared/stripe-utils';
import { ExternalUrlLink, loadingPage } from '../userDefinedReport/profile/SharedContent';
import { useGetGroupMetricsQuery } from '../../../graphql/group.generated';
import { EntityType } from '../../../types.generated';

interface SLAMissData {
    executionDate: string;
    missType: SLAMissTypes;
    sla: number;
    missedBy: number;
    externalUrl: string;
    dataset: DatasetEntity;
}

enum SLAMissTypes {
    warnStartedBy = '[warn] started by',
    warnFinishedBy = '[warn] finished by',
    startedBy = '[error] started by',
    finishedBy = '[error] finished by',
}

type DatasetCustomPropertiesWithSla = {
    finishedBySla?: string;
    startedBySla?: string;
    warnFinishedBySla?: string;
    warnStartedBySla?: string;
};

type RunCustomProperties = {
    executionDate: string;
    state: string;
    startDate: string;
    endDate?: string;
    externalUrl: string;
};

type DatasetRunEntity = {
    properties: {
        customProperties: {
            key: string;
            value: string;
        }[];
    };
    externalUrl: string;
};

type DatasetEntity = {
    type: 'DATASET';
    urn: string;
    name: string;
    properties?: {
        customProperties: {
            key: string;
            value: string;
        }[];
        name?: string;
    };
    runs?: {
        count: number;
        start: number;
        total: number;
        runs: DatasetRunEntity[];
    };
    totalRuns?: RunCustomProperties[];
    slaProps?: DatasetCustomPropertiesWithSla;
};

function checkMetSLA(run: RunCustomProperties, slaInfo?: DatasetCustomPropertiesWithSla) {
    if (slaInfo === undefined) {
        return [1];
    }
    const startDate = moment(run.startDate);
    const execDate = moment(run.executionDate);
    if (slaInfo.warnStartedBySla !== undefined) {
        const target = moment(execDate).add(+slaInfo.warnStartedBySla, 's');
        if (startDate > target) {
            return [-1, SLAMissTypes.warnStartedBy, +slaInfo.warnStartedBySla, moment(startDate).diff(target, 's')];
        }
    }
    if (slaInfo.startedBySla !== undefined) {
        const target = moment(execDate).add(+slaInfo.startedBySla, 's');
        if (startDate > target) {
            return [-1, SLAMissTypes.startedBy, +slaInfo.startedBySla, moment(startDate).diff(target, 's')];
        }
    }

    if (run?.endDate !== undefined) {
        const endDate = moment(run.endDate);
        if (slaInfo.warnFinishedBySla !== undefined) {
            const target = moment(execDate).add(+slaInfo.warnFinishedBySla, 's');
            if (endDate > target) {
                return [-1, SLAMissTypes.warnFinishedBy, +slaInfo.warnFinishedBySla, moment(endDate).diff(target, 's')];
            }
        }
        if (slaInfo.finishedBySla !== undefined) {
            const target = moment(execDate).add(+slaInfo.finishedBySla, 's');
            if (endDate > target) {
                return [-1, SLAMissTypes.finishedBy, +slaInfo.finishedBySla, moment(endDate).diff(target, 's')];
            }
        }
    }
    return [1];
}

function formatRuns(runs: RunCustomProperties[]) {
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
    return latestRuns;
}

function getRunMetrics(datasetEntities: DatasetEntity[]): [any, number, any] {
    const metSLAMetrics = new Map();
    let missedSLADatasets: any[] = [];
    for (let d = 0; d < datasetEntities.length; d++) {
        const currDataset = datasetEntities[d];
        let runs = currDataset?.totalRuns;
        const slaInfo = currDataset?.slaProps;
        if (runs !== undefined) {
            runs = formatRuns(runs);
            for (let r = 0; r < runs.length; r++) {
                const currRun = runs[r];
                const execDateTruncated = moment(currRun.executionDate).startOf('day').format('YYYY-MM-DD');
                const metSLAInfo = checkMetSLA(currRun, slaInfo);
                // console.log(metSLAInfo);
                const metSLA = metSLAInfo[0];
                if (metSLA < 0) {
                    if (metSLAMetrics.has(execDateTruncated)) {
                        metSLAMetrics.set(execDateTruncated, [
                            metSLAMetrics.get(execDateTruncated)[0],
                            metSLAMetrics.get(execDateTruncated)[1] + 1,
                        ]);
                    } else {
                        metSLAMetrics.set(execDateTruncated, [0, 1]);
                    }
                    const missedSLAData = {
                        executionDate: moment(currRun.executionDate).format('YYYY-MM-DD HH:mm:ss'),
                        missType: metSLAInfo[1],
                        sla: convertSecsToHumanReadable(+metSLAInfo[2]),
                        missedBy: convertSecsToHumanReadable(+metSLAInfo[3]),
                        externalUrl: currRun.externalUrl,
                        dataset: currDataset,
                    };
                    missedSLADatasets.push(missedSLAData);
                } else if (metSLA > 0) {
                    if (metSLAMetrics.has(execDateTruncated)) {
                        metSLAMetrics.set(execDateTruncated, [
                            metSLAMetrics.get(execDateTruncated)[0] + 1,
                            metSLAMetrics.get(execDateTruncated)[1],
                        ]);
                    } else {
                        metSLAMetrics.set(execDateTruncated, [1, 0]);
                    }
                }
            }
        }
    }

    let metSLANumber = 0;
    let missedSLANumber = 0;
    let percentMetData: { date: string; value: number }[] = [];
    metSLAMetrics.forEach((value, key) => {
        percentMetData.push({ date: key, value: +(((value[0] * 1.0) / (value[0] + value[1])) * 100.0).toFixed(2) });
        metSLANumber += value[0];
        missedSLANumber += value[1];
    });
    percentMetData = orderBy(percentMetData, 'date');
    const percentMetVal = +((metSLANumber / (metSLANumber + missedSLANumber)) * 100.0).toFixed(2);
    missedSLADatasets = orderBy(missedSLADatasets, 'executionDate', 'desc');
    return [percentMetData, percentMetVal, missedSLADatasets];
}

function renderSLAChart(data) {
    function getAnnotations() {
        const annotations: any[] = [];
        annotations.push({
            type: 'regionFilter',
            start: ['min', 95],
            end: ['max', 0],
            color: 'red',
        });
        annotations.push({
            type: 'line',
            start: ['start', 95] as [string, number],
            end: ['end', 95] as [string, number],
            style: {
                stroke: 'red',
                lineDash: [2, 2],
            },
        });
        annotations.push({
            type: 'text',
            position: ['max', 95] as [string, number],
            content: 'Target',
            offsetX: -50,
            offsetY: 5,
            style: { textBaseline: 'top' as const },
        });
        return annotations;
    }
    const config = {
        data,
        xField: 'date',
        yField: 'value',
        xAxis: {
            title: {
                text: 'Date',
            },
            tickCount: 5,
        },
        yAxis: {
            title: {
                text: 'Percentage Met SLA',
            },
        },
        // slider: {
        //     start: 0,
        //     end: 1,
        // },
        annotations: getAnnotations(),
    };
    return <Line style={{ marginLeft: '20px', marginRight: '30px' }} {...config} />;
}

function renderSLAMissTable(data: SLAMissData[]) {
    // executionDate: string;
    // missType: SLAMissTypes;
    // sla: number;
    // missedBy: number;
    // externalUrl: string;
    // dataset: DatasetEntity;
    const columns = [
        {
            title: 'Execution Date',
            dataIndex: 'executionDate',
        },
        {
            title: 'Dataset',
            dataIndex: 'dataset',
            render: (dataset) => <CompactEntityNameList entities={[dataset]} />,
        },
        {
            title: 'SLA Miss Type',
            dataIndex: 'missType',
        },
        {
            title: 'SLA',
            dataIndex: 'sla',
        },
        {
            title: 'Missed By',
            dataIndex: 'missedBy',
        },
        {
            title: 'Airflow Link',
            dataIndex: 'externalUrl',
            render: (externalUrl) => (
                <ExternalUrlLink href={externalUrl} target="_blank">
                    <DeliveredProcedureOutlined />
                </ExternalUrlLink>
            ),
        },
    ];
    return (
        <Table
            style={{ marginLeft: '20px', marginRight: '30px' }}
            rowKey="jobId"
            columns={columns}
            dataSource={data}
            size="small"
        />
    );
}

function renderHeader(teamSLAPercent: number) {
    const color = teamSLAPercent < 95 ? 'red' : 'green';
    const tag = <Tag color={color}>{teamSLAPercent.toString(10)} %</Tag>;
    const subtitle = <>{tag} over the past 30 days</>;
    return <PageHeader title="How often did my team meet SLA?" subTitle={subtitle} />;
}

interface GroupMetricsProps {
    urn: string;
}

export const GroupMetrics: FC<GroupMetricsProps> = ({ urn }) => {
    const { data, loading } = useGetGroupMetricsQuery({
        variables: {
            input: {
                query: '*',
                filters: [{ field: 'owners', value: urn }],
                types: [EntityType.Dataset],
                start: 0,
                count: 1000,
            },
            runCount: 30,
        },
    });

    if (loading) {
        return loadingPage;
    }

    const datasetEntities = data?.searchAcrossEntities?.searchResults?.map((e) => e.entity) as DatasetEntity[];

    datasetEntities.map((dataset) => {
        const customProps = dataset.properties?.customProperties?.reduce(
            (acc, e) => ({ ...acc, [e.key]: e.value }),
            {},
        ) as DatasetCustomPropertiesWithSla;
        const currDataset = dataset;
        currDataset.slaProps = customProps;
        return currDataset;
    });

    datasetEntities.map((dataset) => {
        const runInfo = dataset.runs?.runs.map((datasetRunEntity) => {
            const currRun = datasetRunEntity.properties?.customProperties?.reduce(
                (acc, e) => ({ ...acc, [e.key]: e.value }),
                {},
            ) as RunCustomProperties;
            currRun.externalUrl = datasetRunEntity.externalUrl;
            return currRun;
        });
        const currDataset = dataset;
        currDataset.totalRuns = runInfo;
        return currDataset;
    });

    console.log('DATA', urn, datasetEntities);
    const metSLAData = getRunMetrics(datasetEntities);
    const chartData = metSLAData[0];
    const teamSLAPercent = metSLAData[1];
    const missedSLADatasets = metSLAData[2];
    console.log(missedSLADatasets);

    return (
        <>
            {renderHeader(teamSLAPercent)}
            {renderSLAChart(chartData)}
            <PageHeader title="Recent SLA Misses" />
            {renderSLAMissTable(missedSLADatasets)}
        </>
    );
};
