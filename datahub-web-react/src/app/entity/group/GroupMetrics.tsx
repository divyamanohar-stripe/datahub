import React, { ErrorInfo, FC, ReactNode, useState } from 'react';
import moment from 'moment-timezone';
import { Line } from '@ant-design/plots';
import { DatePicker, PageHeader, Radio, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { orderBy } from 'lodash';
import { DeliveredProcedureOutlined, InfoCircleTwoTone, AlertOutlined } from '@ant-design/icons';
import { CompactEntityNameList } from '../../recommendations/renderer/component/CompactEntityNameList';
import { convertSecsToHumanReadable } from '../shared/stripe-utils';
import { ExternalUrlLink, loadingPage } from '../userDefinedReport/profile/SharedContent';
import {
    useGetDownstreamTeamsQuery,
    useGetGroupIncidentsQuery,
    useGetGroupRunMetricsQuery,
} from '../../../graphql/groupMetrics.generated';
import { CorpGroup, DataProcessInstanceFilterInputType, EntityType } from '../../../types.generated';
import { EntityPreviewTag } from '../../recommendations/renderer/component/EntityPreviewTag';
import { urlEncodeUrn } from '../shared/utils';

const { RangePicker } = DatePicker;
const { Title } = Typography;

interface SLAMissData {
    executionDate: string;
    missType: SLAMissTypes;
    sla: number;
    missedBy: number;
    externalUrl: string;
    dataEnt: DataEntity;
}

enum SLAMissTypes {
    warnStartedBy = '[warn] started by',
    warnFinishedBy = '[warn] finished by',
    startedBy = '[error] started by',
    finishedBy = '[error] finished by',
}

type DataCustomPropertiesWithSla = {
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

type DataRunEntity = {
    properties: {
        customProperties: {
            key: string;
            value: string;
        }[];
    };
    externalUrl: string;
};

type DataEntity = {
    type: string;
    urn: string;
    name?: string;
    jobId?: string;
    properties?: {
        customProperties: {
            key: string;
            value: string;
        }[];
        name?: string;
    };
    runs?: {
        count: number;
        total: number;
        runs: DataRunEntity[];
    };
    totalRuns?: RunCustomProperties[];
    slaProps?: DataCustomPropertiesWithSla;
};

type DownstreamTeamEntity = {
    downstream: { relationships: any[] };
};

type IncidentEntity = {
    id: string;
    urn: string;
    ownership?: any[];
    properties?: {
        name?: string;
        description?: string;
        summary?: string;
        severity?: string;
        state?: string;
        openedAt?: number;
    };
    name?: string;
    description?: string;
    summary?: string;
    severity?: string;
    state?: string;
    openedAt?: number;
};

interface DownstreamTeam {
    teamName: string;
    slack?: string;
    email?: string;
    homePage?: string;
    entities: any[];
    count?: number;
    ownerEntity?: CorpGroup;
}

/**
 * Check if current run has missed any of its SLAs
 * @param run the current run to examine
 * @param slaInfo SLA info set on the data entity
 * @return a list of information about whether we missed SLA, 1=did not miss, -1=missed
 */
function checkMetSLA(run: RunCustomProperties, slaInfo?: DataCustomPropertiesWithSla) {
    // if no SLA is set, return 1 (meaning not missed)
    if (slaInfo === undefined) {
        return [1];
    }
    const startDate = moment.utc(run.startDate);
    const execDate = moment.utc(run.executionDate);
    // prioritize error SLA misses
    if (slaInfo.startedBySla !== undefined) {
        const target = moment(execDate).add(+slaInfo.startedBySla, 's');
        if (startDate > target) {
            return [-1, SLAMissTypes.startedBy, +slaInfo.startedBySla, moment(startDate).diff(target, 's')];
        }
    }
    if (slaInfo.warnStartedBySla !== undefined) {
        const target = moment(execDate).add(+slaInfo.warnStartedBySla, 's');
        if (startDate > target) {
            return [-1, SLAMissTypes.warnStartedBy, +slaInfo.warnStartedBySla, moment(startDate).diff(target, 's')];
        }
    }

    // get end date, if no end date is set, use current UTC time
    let endDate;
    if (run?.endDate !== undefined && run?.endDate !== 'None') {
        endDate = moment.utc(run.endDate);
    } else {
        endDate = moment.utc();
    }
    // prioritize error SLA misses
    if (slaInfo.finishedBySla !== undefined) {
        const target = moment(execDate).add(+slaInfo.finishedBySla, 's');
        if (endDate > target) {
            return [-1, SLAMissTypes.finishedBy, +slaInfo.finishedBySla, moment(endDate).diff(target, 's')];
        }
    }
    if (slaInfo.warnFinishedBySla !== undefined) {
        const target = moment(execDate).add(+slaInfo.warnFinishedBySla, 's');
        if (endDate > target) {
            return [-1, SLAMissTypes.warnFinishedBy, +slaInfo.warnFinishedBySla, moment(endDate).diff(target, 's')];
        }
    }

    return [1];
}

/**
 * format runs to remove all but last try per execution date and sort in order
 * @param runs the list of runs to format
 */
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

/**
 * Gather run and SLA metrics to create chart and table
 * @param dataEntities
 * @return list of [percent met SLA per day (execution date truncated to day), total percent met over all runs, list of SLAMissData objects to generate SLA miss table]
 */
function getRunMetrics(dataEntities: DataEntity[]): [any, number, any] {
    const metSLAMetrics = new Map();
    let missedSLADataEnts: any[] = [];
    for (let d = 0; d < dataEntities.length; d++) {
        const currDataEnt = dataEntities[d];
        let runs = currDataEnt?.totalRuns;
        const slaInfo = currDataEnt?.slaProps;
        if (runs !== undefined) {
            runs = formatRuns(runs);
            for (let r = 0; r < runs.length; r++) {
                const currRun = runs[r];
                const execDateTruncated = moment.utc(currRun.executionDate).startOf('day').format('YYYY-MM-DD');
                const metSLAInfo = checkMetSLA(currRun, slaInfo);
                // at idx 0: 1 = met SLA, -1 = missed SLA
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
                    // if we missed SLA, create SLAMissData object for SLA miss table
                    const missedSLAData = {
                        executionDate: moment.utc(currRun.executionDate).format('YYYY-MM-DD HH:mm:ss'),
                        missType: metSLAInfo[1],
                        sla: convertSecsToHumanReadable(+metSLAInfo[2]),
                        missedBy: convertSecsToHumanReadable(+metSLAInfo[3]),
                        externalUrl: currRun.externalUrl,
                        dataEnt: currDataEnt,
                        state: currRun.state,
                    };
                    missedSLADataEnts.push(missedSLAData);
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
    // get total percentage of met SLA runs over all runs
    const percentMetVal = +((metSLANumber / (metSLANumber + missedSLANumber)) * 100.0).toFixed(2);
    missedSLADataEnts = orderBy(missedSLADataEnts, 'executionDate', 'desc');
    return [percentMetData, percentMetVal, missedSLADataEnts];
}

/**
 * create SLA miss line chart that displays percent of SLA misses over all runs per day
 * @param data
 */
function renderSLAChart(data) {
    // setting SLA target as 95%
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
        annotations: getAnnotations(),
        point: {
            size: 2.5,
            shape: 'circle',
            style: {
                fill: 'CornflowerBlue',
                stroke: 'CornflowerBlue',
                lineWidth: 2,
            },
        },
    };
    return <Line style={{ marginLeft: '20px', marginRight: '30px' }} {...config} />;
}

function renderSLAMissTable(data: SLAMissData[], useDatasetType: boolean) {
    const dataTitle = useDatasetType ? 'Dataset' : 'Data Job';
    console.log(dataTitle);
    const columns = [
        {
            title: 'Execution Date',
            dataIndex: 'executionDate',
        },
        {
            title: `${dataTitle}`,
            dataIndex: 'dataEnt',
            render: (dataEnt) => <CompactEntityNameList entities={[dataEnt]} />,
        },
        {
            title: 'State',
            dataIndex: 'state',
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

function getOwnerName(ownership) {
    let teamName;
    let ownerEntity;
    let ownerUrn;
    let idx = 0;
    if (ownership !== undefined && ownership !== null && ownership.owners.length > 0) {
        for (idx = 0; idx < ownership.owners.length; idx++) {
            teamName = ownership?.owners[idx]?.owner?.properties?.displayName;
            ownerEntity = ownership?.owners[idx]?.owner;
            ownerUrn = ownership?.owners[idx]?.owner?.urn;
            if (teamName === undefined) {
                teamName = ownership?.owners[idx]?.owner?.name;
            }
            if (teamName !== undefined) {
                break;
            }
        }
    }
    if (teamName !== undefined) {
        return [teamName, ownerEntity, idx, ownerUrn];
    }
    return ['No Team Defined', undefined, idx, undefined];
}

function getDownstreamTeams(dataEntities: DownstreamTeamEntity[], urn) {
    let teamMap: DownstreamTeam[] = [];
    for (let i = 0; i < dataEntities.length; i++) {
        const downstreams = dataEntities[i].downstream.relationships;
        for (let d = 0; d < downstreams.length; d++) {
            const currDownstream = downstreams[d].entity;
            const teamInfo = getOwnerName(currDownstream.ownership);
            const teamName = teamInfo[0];
            const ownerEntity = teamInfo[1];
            const ownerIdx = teamInfo[2];
            const ownerUrn = teamInfo[3];
            const email = currDownstream.ownership?.owners[ownerIdx]?.owner?.properties?.email;
            const homePage = currDownstream.ownership?.owners[ownerIdx]?.owner?.editableProperties?.description;
            const slack = currDownstream.ownership?.owners[ownerIdx]?.owner?.editableProperties?.slack;
            const idx = teamMap.findIndex((t) => t.teamName === teamName);
            if (ownerUrn !== urn) {
                if (idx > -1) {
                    const { entities } = teamMap[idx];
                    entities.push(currDownstream);
                } else {
                    const newDownstreamTeam = {
                        teamName,
                        slack,
                        email,
                        homePage,
                        entities: [currDownstream],
                        ownerEntity,
                    } as DownstreamTeam;
                    teamMap.push(newDownstreamTeam);
                }
            }
        }
    }
    teamMap.map((team) => {
        const t = team;
        t.count = t.entities.length;
        return t;
    });
    teamMap = orderBy(teamMap, 'count', 'desc');
    return teamMap;
}

function renderDownstreamTeamsTable(downstreamTeams: DownstreamTeam[]) {
    function renderExpandableRows(downstreamEntities) {
        const columnss = [
            {
                title: 'Entity',
                render: (ownerEntity) => {
                    if (ownerEntity?.urn !== undefined) {
                        return <CompactEntityNameList entities={[ownerEntity]} />;
                    }
                    return 'No Team Defined';
                },
            },
        ];
        return <Table columns={columnss} dataSource={downstreamEntities.entities} size="small" />;
    }
    const columns = [
        {
            title: 'Team',
            dataIndex: 'ownerEntity',
            render: (ownerEntity) => {
                if (ownerEntity?.urn !== undefined) {
                    return <CompactEntityNameList entities={[ownerEntity]} />;
                }
                return 'No Team Defined';
            },
        },
        {
            title: 'Home Page',
            dataIndex: 'homePage',
        },
        {
            title: 'Slack',
            dataIndex: 'slack',
        },
        {
            title: 'Email',
            dataIndex: 'email',
        },
        {
            title: 'Downstream Entities Owned',
            dataIndex: 'count',
        },
    ];
    return (
        <Table
            style={{ marginLeft: '20px', marginRight: '30px' }}
            rowKey="teamName"
            columns={columns}
            expandable={{
                expandedRowRender: renderExpandableRows,
            }}
            dataSource={downstreamTeams}
            size="small"
        />
    );
}

function renderHeader(
    teamSLAPercent: number,
    logicalBeginningDate,
    logicalEndDate,
    setReportDates,
    useDatasetType: boolean,
) {
    const color = teamSLAPercent < 95 ? 'red' : 'green';
    const tag = <Tag color={color}>{teamSLAPercent.toString(10)} %</Tag>;
    const subtitle = <>{tag} over the selected time range</>;
    const dataType = useDatasetType ? 'Datasets' : 'Data Jobs';
    const toolTip = (
        <>
            {`How often did my team's ${dataType} meet SLA? `}
            <Tooltip title={`This metric only uses ${dataType} with SLAs defined`}>
                <InfoCircleTwoTone />
            </Tooltip>
        </>
    );
    return (
        <PageHeader title={toolTip} subTitle={subtitle}>
            <RangePicker
                format="YYYY-MM-DD HH:mm"
                showTime={{
                    format: 'HH:mm',
                }}
                defaultValue={[moment.utc(logicalBeginningDate), moment.utc(logicalEndDate)]}
                onChange={setReportDates}
            />
            <Radio.Button
                onClick={() =>
                    setReportDates([moment.utc().startOf('day').subtract(7, 'day'), moment.utc().startOf('day')])
                }
            >
                View Past Week
            </Radio.Button>
            <Radio.Button
                onClick={() =>
                    setReportDates([moment.utc().startOf('day').subtract(30, 'day'), moment.utc().startOf('day')])
                }
            >
                View Past 30 Days
            </Radio.Button>
        </PageHeader>
    );
}

class ErrorBoundary extends React.Component<{ children: ReactNode }, { errorInfo: ErrorInfo } | { errorInfo: null }> {
    constructor(props) {
        super(props);
        this.state = { errorInfo: null };
    }

    componentDidCatch(error, errorInfo) {
        console.warn('Uncaught error in ErrorBoundary', { error, errorInfo });
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.errorInfo) {
            return (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        padding: '20px',
                    }}
                >
                    <Title level={3} type="danger">
                        Error: Data could not be loaded
                    </Title>
                </div>
            );
        }
        return this.props.children;
    }
}

function renderIncidentTable(incidents: IncidentEntity[]) {
    const columns = [
        {
            title: 'Date Opened',
            dataIndex: 'openedAt',
            render: (openedAt) => {
                return openedAt !== undefined && openedAt !== null && openedAt !== 0
                    ? moment.utc(new Date(openedAt)).format('MMMM Do YYYY')
                    : '';
            },
        },
        {
            title: 'Name',
            render: (incidentEntity) => {
                return (
                    <EntityPreviewTag
                        displayName={incidentEntity?.name}
                        url={`/incident/${urlEncodeUrn(incidentEntity.urn)}`}
                        platformLogoUrl={undefined}
                        logoComponent={<AlertOutlined />}
                    />
                );
            },
        },
        {
            title: 'Summary',
            dataIndex: 'summary',
        },
        {
            title: 'Description',
            dataIndex: 'description',
        },
        {
            title: 'State',
            dataIndex: 'state',
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
        },
    ];
    return (
        <Table
            style={{ marginLeft: '20px', marginRight: '30px' }}
            rowKey="teamName"
            columns={columns}
            dataSource={incidents}
            size="small"
        />
    );
}

interface IncidentProps {
    urn: string;
    logicalBeginningDate: number;
    logicalEndDate: number;
}

const TeamIncidents: FC<IncidentProps> = ({ urn, logicalBeginningDate, logicalEndDate }) => {
    const maxEntityCount = 50;
    const { data, loading } = useGetGroupIncidentsQuery({
        variables: {
            input: {
                query: '*',
                filters: [{ field: 'owners', value: urn }],
                types: [EntityType.Incident],
                start: 0,
                count: maxEntityCount,
            },
        },
    });

    if (loading) {
        return loadingPage;
    }
    let incidentEntities = data?.searchAcrossEntities?.searchResults?.map((e) => e.entity) as IncidentEntity[];
    incidentEntities.map((incident) => {
        const currIncident = incident;
        currIncident.name = currIncident?.properties?.name;
        const description = currIncident?.properties?.description;
        if (description === undefined || description === null || description === 'nan') {
            currIncident.description = '';
        } else {
            currIncident.description = description;
        }
        currIncident.state = currIncident?.properties?.state;
        currIncident.openedAt = currIncident?.properties?.openedAt;
        currIncident.summary = currIncident?.properties?.summary;
        currIncident.severity = currIncident?.properties?.severity;
        return currIncident;
    });
    incidentEntities = incidentEntities.filter(
        (incident) => (incident.openedAt ?? 0) > logicalBeginningDate && (incident.openedAt ?? 0) < logicalEndDate,
    );
    incidentEntities = orderBy(incidentEntities, 'openedAt', 'desc');
    console.log('incidents', incidentEntities);

    return (
        <>
            <PageHeader title="Recent Incidents" />
            {renderIncidentTable(incidentEntities)}
        </>
    );
};

interface TopDownstreamTeamsProps {
    urn: string;
    useDatasetType: boolean;
}

const TopDownstreamTeams: FC<TopDownstreamTeamsProps> = ({ urn, useDatasetType }) => {
    const maxEntityCount = 1000;
    const types = useDatasetType ? [EntityType.Dataset] : [EntityType.DataJob];
    const { data, loading } = useGetDownstreamTeamsQuery({
        variables: {
            input: {
                query: '*',
                filters: [
                    { field: 'owners', value: urn },
                    { field: 'slaDefined', value: 'true' },
                ],
                types,
                start: 0,
                count: maxEntityCount,
            },
        },
    });

    if (loading) {
        return loadingPage;
    }
    const dataEntities = data?.searchAcrossEntities?.searchResults?.map((e) => e.entity) as DownstreamTeamEntity[];
    const downstreamTeams = getDownstreamTeams(dataEntities, urn);
    console.log('downstream teams', downstreamTeams);

    const dataType = useDatasetType ? 'Datasets' : 'Data Jobs';
    return (
        <>
            <PageHeader title={`Top Downstream Teams for ${dataType} with SLAs Defined`} />
            {renderDownstreamTeamsTable(downstreamTeams)}
        </>
    );
};

interface GroupRunMetricsProps {
    urn: string;
    useDatasetType: boolean;
    logicalBeginningDate: number;
    logicalEndDate: number;
    setLogicalBeginningDate;
    setLogicalEndDate;
}

const GroupRunMetrics: FC<GroupRunMetricsProps> = ({
    urn,
    useDatasetType,
    logicalBeginningDate,
    logicalEndDate,
    setLogicalBeginningDate,
    setLogicalEndDate,
}) => {
    const maxEntityCount = 1000;
    const maxRunCount = 1000;

    const setReportDates = (dates) => {
        setLogicalBeginningDate(dates[0].toDate().getTime());
        setLogicalEndDate(dates[1].toDate().getTime());
    };
    const types = useDatasetType ? [EntityType.Dataset] : [EntityType.DataJob];

    const { data, loading } = useGetGroupRunMetricsQuery({
        variables: {
            input: {
                query: '*',
                filters: [
                    { field: 'owners', value: urn },
                    { field: 'slaDefined', value: 'true' },
                ],
                types,
                start: 0,
                count: maxEntityCount,
            },
            runInput: {
                filters: [
                    {
                        type: DataProcessInstanceFilterInputType.AfterLogicalDate,
                        value: logicalBeginningDate.toString(10),
                    },
                    {
                        type: DataProcessInstanceFilterInputType.BeforeLogicalDate,
                        value: logicalEndDate.toString(10),
                    },
                ],
                start: 0,
                count: maxRunCount,
            },
        },
    });

    if (loading) {
        return loadingPage;
    }

    const dataEntities = data?.searchAcrossEntities?.searchResults?.map((e) => e.entity) as DataEntity[];

    dataEntities.map((dataEnt) => {
        const customProps = dataEnt.properties?.customProperties?.reduce(
            (acc, e) => ({ ...acc, [e.key]: e.value }),
            {},
        ) as DataCustomPropertiesWithSla;
        const currDataEnt = dataEnt;
        currDataEnt.slaProps = customProps;
        return currDataEnt;
    });

    dataEntities.map((dataEnt) => {
        const runInfo = dataEnt.runs?.runs.map((dataRunEntity) => {
            const currRun = dataRunEntity.properties?.customProperties?.reduce(
                (acc, e) => ({ ...acc, [e.key]: e.value }),
                {},
            ) as RunCustomProperties;
            currRun.externalUrl = dataRunEntity.externalUrl;
            return currRun;
        });
        const currDataEnt = dataEnt;
        currDataEnt.totalRuns = runInfo;
        return currDataEnt;
    });

    console.log('DATA', urn, dataEntities);
    const metSLAData = getRunMetrics(dataEntities);
    const chartData = metSLAData[0];
    const teamSLAPercent = metSLAData[1];
    const missedSLADataEnts = metSLAData[2];
    console.log(missedSLADataEnts);

    return (
        <>
            {renderHeader(teamSLAPercent, logicalBeginningDate, logicalEndDate, setReportDates, useDatasetType)}
            {renderSLAChart(chartData)}
            <PageHeader title="Recent SLA Misses" />
            {renderSLAMissTable(missedSLADataEnts, useDatasetType)}
        </>
    );
};

interface GroupMetricsPageProps {
    urn: string;
}

export const GroupMetricsPage: FC<GroupMetricsPageProps> = ({ urn }) => {
    // const [logicalEndDate, setLogicalEndDate] = useState(initialEndDate);
    const [useDatasetType, setDataType] = useState(false);
    const onSwitchChange = (checked: boolean) => {
        setDataType(checked);
    };
    const initialEndDate = moment.utc().startOf('day').toDate().getTime();
    const initialBeginningDate = moment.utc().startOf('day').subtract(7, 'day').toDate().getTime();
    const [logicalEndDate, setLogicalEndDate] = useState(initialEndDate);
    const [logicalBeginningDate, setLogicalBeginningDate] = useState(initialBeginningDate);

    return (
        <>
            <ErrorBoundary>
                <span
                    style={{
                        marginLeft: '20px',
                        marginTop: '20px',
                        color: useDatasetType ? 'gray' : 'cornflowerblue',
                        display: 'inline-block',
                    }}
                >
                    Data Job View
                </span>
                <Switch onChange={onSwitchChange} style={{ marginLeft: '20px', backgroundColor: 'cornflowerblue' }} />
                <span
                    style={{
                        marginLeft: '20px',
                        marginTop: '20px',
                        color: useDatasetType ? 'cornflowerblue' : 'gray',
                        display: 'inline-block',
                    }}
                >
                    Dataset View
                </span>
                <GroupRunMetrics
                    urn={urn}
                    useDatasetType={useDatasetType}
                    logicalBeginningDate={logicalBeginningDate}
                    logicalEndDate={logicalEndDate}
                    setLogicalBeginningDate={setLogicalBeginningDate}
                    setLogicalEndDate={setLogicalEndDate}
                />
            </ErrorBoundary>
            <ErrorBoundary>
                <TeamIncidents urn={urn} logicalBeginningDate={logicalBeginningDate} logicalEndDate={logicalEndDate} />
            </ErrorBoundary>
            <ErrorBoundary>
                <TopDownstreamTeams urn={urn} useDatasetType={useDatasetType} />
            </ErrorBoundary>
        </>
    );
};
