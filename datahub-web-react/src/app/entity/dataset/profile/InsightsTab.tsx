/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-nested-ternary */
import React, { useState } from 'react';
import { DatePicker, DatePickerProps, Descriptions, Divider, List, Tooltip, Table } from 'antd';
import styled from 'styled-components';

import moment from 'moment';
import { useEntityData } from '../../shared/EntityContext';
import { DataProcessRunEvent, DataProcessRunStatus, EntityType, LineageDirection } from '../../../../types.generated';
import { useEntityRegistry } from '../../../useEntityRegistry';
import { capitalizeFirstLetter } from '../../../shared/textUtil';
import { IconStyleType } from '../../Entity';
import InsightsPreviewCard from '../../../preview/InsightsPreviewCard';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';
import { TimePredictionComponent } from './PredictLandingTime';
import { useGetDelaysQuery } from '../../../../graphql/delays.generated';
import { useGetDataJobVersionQuery } from '../../../../graphql/getVersions.generated';
import { DataJobEntityWithVersions } from '../../shared/types';

const StyledList = styled(List)`
    margin-top: -1px;
    box-shadow: ${(props) => props.theme.styles['box-shadow']};
    .ant-list-items > .ant-list-item {
        padding-right: 0px;
        padding-left: 0px;
    }
    > .ant-list-header {
        padding-right: 0px;
        padding-left: 0px;
        font-size: 14px;
        font-weight: 600;
        margin-left: -20px;
        border-bottom: none;
        padding-bottom: 0px;
        padding-top: 15px;
    }
` as typeof List;

function isValidNumber(num?: number) {
    return !(num === undefined || num === null || num === 0);
}

function renderNumJobsChanged(numJobsChanged?: number, numDownstreamUniqueProjects?: number): string {
    if (!isValidNumber(numJobsChanged)) return '';
    if (!isValidNumber(numDownstreamUniqueProjects)) {
        return `Affects ${numJobsChanged} tasks.`;
    }
    return `Affects ${numJobsChanged} tasks across ${numDownstreamUniqueProjects} teams.`;
}

function convertEpochToISO(epoch?: string) {
    if (epoch === undefined || epoch === null) return undefined;
    const toInt = parseInt(epoch, 10) * 1000;
    const date = new Date(toInt);
    return date.toISOString();
}

const columns = [
    {
        title: 'Title',
        dataIndex: 'customProperties',
        key: 'customProperties',
        render: (customProperties: any, row) => {
            const title = customProperties?.filter((e) => e.key === 'name')[0]?.value;
            return (
                <a href={row.externalUrl} target="_blank" rel="noopener noreferrer">
                    {title}
                </a>
            );
        },
    },
    {
        title: 'Author',
        dataIndex: 'customProperties',
        key: 'customProperties',
        render: (customProperties) => {
            return customProperties?.filter((e) => e.key === 'author')[0]?.value;
        },
    },
    {
        title: 'Timestamp',
        dataIndex: 'customProperties',
        key: 'customProperties',
        render: (customProperties) => {
            const timestamp = customProperties?.filter((e) => e.key === 'createdAt')[0]?.value;
            return convertEpochToISO(timestamp);
        },
    },
    {
        title: 'Summary',
        dataIndex: 'customProperties',
        key: 'customProperties',
        render: (customProperties) => {
            const summary = customProperties?.filter((e) => e.key === 'summary')[0]?.value;
            if (summary === undefined || summary === null) {
                return '';
            }
            try {
                const parsedSummary = JSON.parse(summary);
                const numJobsChanged = parsedSummary?.numJobsChanged;
                const numDownstreamUniqueProjects = parsedSummary?.numDownstreamUniqueProjects;
                return renderNumJobsChanged(numJobsChanged, numDownstreamUniqueProjects);
            } catch (e) {
                return '';
            }
        },
    },
];

const ListItem = styled.div`
    padding-right: 40px;
    padding-left: 40px;
    padding-top: 16px;
    padding-bottom: 8px;
`;

const ThinDivider = styled(Divider)`
    padding: 0px;
    margin: 0px;
`;

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

const noDelayedJobsPage = (
    <LoadingContainer>
        <LoadingText>No Delayed Jobs to display!</LoadingText>
    </LoadingContainer>
);

const noPullRequestsPage = (
    <LoadingContainer>
        <LoadingText>No Pull Requests to display!</LoadingText>
    </LoadingContainer>
);

// Types
type RunEntity = {
    urn: string;
    name: string;
    externalUrl: string;
    properties: {
        customProperties: {
            key: string;
            value: string;
        }[];
    };
    state: DataProcessRunEvent[];
};

type DataJobEntity = {
    jobId: string;
    type: EntityType.DataJob;
    urn: string;
    globalTags?: {
        tags: {
            tag: { name: string };
        }[];
    };
    properties?: {
        customProperties: {
            key: string;
            value: string;
        }[];
        description?: string;
        name?: string;
    };
    runs?: {
        count: number;
        runs: RunEntity[];
    };
    runtime?: number;
};

function addRuntimeToDataJob(dataJob: DataJobEntity) {
    if (dataJob.runs?.runs?.length === 0) return { ...dataJob, runtime: undefined };
    const firstRun = dataJob?.runs?.runs[0];
    const startTimestamp =
        firstRun?.state.filter((s) => {
            return s?.status === DataProcessRunStatus.Started;
        })[0]?.timestampMillis || 10;
    const finalRun = dataJob.runs?.runs[dataJob.runs?.runs?.length - 1];
    const endTimestamp =
        finalRun?.state.filter((s) => {
            return s?.status === DataProcessRunStatus.Complete;
        })[0]?.timestampMillis || 0;
    const runtime = endTimestamp - startTimestamp;
    return { ...dataJob, runtime: runtime / 1000 };
}

function calculateDelay(runtime?: number, slo?: number) {
    // eslint-disable-next-line eqeqeq
    if (runtime == undefined || slo == undefined) return undefined;
    return runtime - slo;
}

function isEntityDelayed(entity?: DataJobEntity) {
    if (entity === undefined || entity === null) return false;
    const slo = entity.properties?.customProperties?.filter((e) => e.key === 'runtime_slo')[0]?.value || undefined;
    const runtime = entity.runtime || addRuntimeToDataJob(entity).runtime;
    // eslint-disable-next-line eqeqeq
    if (slo == undefined || runtime == undefined) return false;
    return runtime > parseInt(slo, 10);
}

function useGetJobs(urn, entityType) {
    const maxVersionCount = 3;
    const currentDataJob = useGetDataJobVersionQuery({
        variables: {
            urn,
            versionInfosInput: {
                start: 0,
                count: maxVersionCount,
            },
        },
        skip: entityType !== EntityType.DataJob,
    });
    if (currentDataJob?.data?.dataJob === undefined) {
        return [];
    }
    const currentDataJobInfo: DataJobEntityWithVersions = currentDataJob.data.dataJob! as DataJobEntityWithVersions;
    if (currentDataJobInfo?.versionInfo?.versionInfos === undefined) {
        return [];
    }
    return currentDataJobInfo.versionInfo?.versionInfos;
}

export const InsightsTab = ({
    properties = { defaultDirection: LineageDirection.Upstream, defaultDate: Date.now() },
}: {
    properties?: { defaultDirection: LineageDirection; defaultDate: number };
}) => {
    const direction = LineageDirection.Upstream;
    const filters = [
        {
            field: 'degree',
            value: '1',
        },
        {
            field: 'degree',
            value: '2',
        },
        {
            field: 'degree',
            value: '3+',
        },
    ];
    const start = 0;
    const types = [EntityType.DataJob];
    const query = '';
    const count = 1000;
    const { urn, entityType } = useEntityData();
    const currJobVersionsArr = useGetJobs(urn, entityType);
    const [execDate, setExecDate] = useState(moment.utc().startOf('day').valueOf());
    const { data, loading, error, refetch } = useGetDelaysQuery({
        variables: {
            input: {
                urn,
                direction,
                types,
                query,
                start,
                count,
                filters,
            },
            exec_date: String(execDate),
        },
    });

    const handleDateChange: DatePickerProps['onChange'] = (date, dateString) => {
        setExecDate(moment.utc(dateString).valueOf());
    };

    const entityRegistry = useEntityRegistry();
    if (loading) return loadingPage;

    const additionalPropertiesList = data?.searchAcrossLineage?.searchResults?.map((searchResult) => ({
        degree: searchResult.degree,
    }));
    const dataJobEntities = data?.searchAcrossLineage?.searchResults
        ?.filter((e) => {
            return e.entity.type === EntityType.DataJob;
        })
        .map((e) => e.entity) as DataJobEntity[];

    const dataJobEntitiesWithRuntime = dataJobEntities.map(addRuntimeToDataJob);
    const delayedEntities = dataJobEntitiesWithRuntime.filter(isEntityDelayed);
    const predictedLandingToolTip = (
        <Tooltip title="landing times are estimated from pending upstreams and historical p95 runtime durations">
            Predicted Landing Time
        </Tooltip>
    );

    return (
        <>
            <div>
                <Descriptions
                    title={<a href={`/tasks/${urn}/Changelog?is_lineage_mode=false`}>Recent Pull Requests</a>}
                    style={{ marginTop: '20px', marginLeft: '20px', marginRight: '20px' }}
                    bordered
                    size="small"
                    column={{ md: 10 }}
                />
            </div>
            {currJobVersionsArr.length === 0 && noPullRequestsPage}
            {currJobVersionsArr.length !== 0 && (
                <Table dataSource={currJobVersionsArr} columns={columns} pagination={false} />
            )}
            <div>
                <Descriptions
                    title="Delayed Upstream Jobs"
                    style={{ marginTop: '20px', marginLeft: '20px', marginRight: '20px' }}
                    bordered
                    size="small"
                    column={{ md: 10 }}
                >
                    <Descriptions.Item style={{ fontWeight: 'bold' }} label="Execution Date">
                        <Tooltip title="UTC scheduled run of tasks">
                            <DatePicker
                                format="YYYY-MM-DD HH:mm"
                                showTime={{
                                    format: 'HH:mm',
                                }}
                                onChange={handleDateChange}
                                defaultValue={moment.utc(execDate)}
                            />
                        </Tooltip>
                    </Descriptions.Item>
                    <Descriptions.Item style={{ fontWeight: 'bold' }} label={predictedLandingToolTip}>
                        <TimePredictionComponent urn={urn} executionDate={execDate} />
                    </Descriptions.Item>
                </Descriptions>
            </div>
            {delayedEntities.length === 0 && noDelayedJobsPage}
            {delayedEntities.length !== 0 && (
                <StyledList
                    bordered
                    dataSource={delayedEntities}
                    renderItem={(entity, index) => {
                        const additionalProperties = additionalPropertiesList?.[index];
                        const genericProps = entityRegistry.getGenericEntityProperties(entity.type, entity);
                        const platformLogoUrl = genericProps?.platform?.properties?.logoUrl;
                        const dpiUrn = entity?.runs?.runs[entity.runs?.runs?.length - 1]?.urn;
                        const platformName =
                            genericProps?.platform?.properties?.displayName ||
                            capitalizeFirstLetter(genericProps?.platform?.name);
                        const entityTypeName = entityRegistry.getEntityName(entity.type);
                        const displayName = entityRegistry.getDisplayName(entity.type, entity);
                        const url = entityRegistry.getEntityUrl(entity.type, entity.urn);
                        const fallbackIcon = entityRegistry.getIcon(entity.type, 18, IconStyleType.ACCENT);
                        const subType =
                            genericProps?.subTypes?.typeNames?.length && genericProps?.subTypes?.typeNames[0];
                        const entityCount = genericProps?.entityCount;
                        const slo =
                            genericProps?.customProperties?.filter((e) => e.key === 'runtime_slo')[0]?.value ||
                            'undefined';
                        const { runtime } = entity;
                        const delay = calculateDelay(entity.runtime, parseInt(slo, 10));
                        return (
                            <>
                                <ListItem>
                                    <InsightsPreviewCard
                                        name={displayName}
                                        logoUrl={platformLogoUrl || undefined}
                                        logoComponent={fallbackIcon}
                                        url={url}
                                        platform={platformName || undefined}
                                        type={subType || entityTypeName}
                                        titleSizePx={14}
                                        tags={genericProps?.globalTags || undefined}
                                        glossaryTerms={genericProps?.glossaryTerms || undefined}
                                        domain={genericProps?.domain}
                                        entityCount={entityCount}
                                        degree={additionalProperties?.degree}
                                        slo={slo}
                                        runtime={runtime}
                                        delay={delay}
                                        dpiUrn={dpiUrn}
                                    />
                                </ListItem>
                                <ThinDivider />
                            </>
                        );
                    }}
                />
            )}
        </>
    );
};
