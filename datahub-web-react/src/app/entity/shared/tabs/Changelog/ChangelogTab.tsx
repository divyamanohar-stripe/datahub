import React, { useState } from 'react';
import { Switch, Typography, Descriptions, Tooltip, Table } from 'antd';
import styled from 'styled-components';
import { InfoCircleTwoTone } from '@ant-design/icons';
import { EntityType, LineageDirection } from '../../../../../types.generated';
import TabToolbar from '../../components/styled/TabToolbar';
import { ANTD_GRAY } from '../../constants';
import { useEntityData } from '../../EntityContext';
import { useGetUpstreamVersionsQuery, useGetDataJobVersionQuery } from '../../../../../graphql/getVersions.generated';
import { DataJobEntityWithVersions } from '../../types';
import { getCustomProperty } from '../../utils';
import { loadingPage } from '../../stripe-utils';
/* eslint eqeqeq: 0 */

const ValueText = styled(Typography.Text)`
    font-family: 'Roboto Mono', monospace;
    font-weight: 400;
    font-size: 12px;
    color: ${ANTD_GRAY[8]};
`;

type VersionEntity = {
    version: string;
    versionType: string;
    externalUrl?: string;
    customProperties?: {
        key: string;
        value: string;
    }[];
    datajobEntities: { jobId: string; urn: string; isCurrent: boolean }[];
    includeCurrentTask: boolean;
};

function DataJobEntityWithRelationMapper(entity: DataJobEntityWithVersions, isCurrent: boolean) {
    const obj = {
        entity,
        isCurrent,
    };
    return obj;
}

function convertEpochToISO(epoch?: string) {
    if (epoch == null) return undefined;
    const toInt = parseInt(epoch, 10) * 1000;
    const date = new Date(toInt);
    return date.toISOString();
}

function renderTaskIdWithExternalURL(dataJob: { jobId?: string; urn?: string; isCurrent: boolean }) {
    if (dataJob.jobId == null) return undefined;
    if (dataJob.urn == null) return dataJob.jobId;
    const url = `/tasks/${dataJob.urn}/Changelog?is_lineage_mode=false`;
    return dataJob.isCurrent ? (
        <div>
            {dataJob.jobId}
            <br />
        </div>
    ) : (
        <div>
            <a href={url} target="_blank" rel="noopener noreferrer">
                {dataJob.jobId}
            </a>
            <br />
        </div>
    );
}

function renderTaskIds(dataJobList: { jobId?: string; urn?: string; isCurrent: boolean }[]) {
    const taskIds = dataJobList.map(renderTaskIdWithExternalURL);
    return taskIds;
}

function renderTitleWithExternalURL(customProperties, externalUrl?) {
    if (getCustomProperty(customProperties, 'name') == null) {
        return undefined;
    }
    if (externalUrl == null) {
        return getCustomProperty(customProperties, 'name');
    }
    return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            {getCustomProperty(customProperties, 'name')}
        </a>
    );
}

function isValidNumber(num?: number) {
    return !(num == null || num === 0);
}

function renderNumJobsChanged(numJobsChanged?: number, numDownstreamUniqueProjects?: number): string {
    if (!isValidNumber(numJobsChanged)) return '';
    if (!isValidNumber(numDownstreamUniqueProjects)) {
        return `Affects ${numJobsChanged} tasks.`;
    }
    return `Affects ${numJobsChanged} tasks across ${numDownstreamUniqueProjects} teams.`;
}

function renderNumJobsDefinitionChanged(numJobsDefinitionChanged?: number): string {
    if (!isValidNumber(numJobsDefinitionChanged)) return '';
    return `${numJobsDefinitionChanged} airflow definitions were affected.`;
}

function renderNumJobsLogicChanged(numJobsLogicChanged?: number): string {
    if (!isValidNumber(numJobsLogicChanged)) return '';
    return `${numJobsLogicChanged} tasks had a changed Spark job.`;
}
function renderAddedTask(numAddedJobs?: number): string {
    if (!isValidNumber(numAddedJobs)) return '';
    return `${numAddedJobs} tasks were added.`;
}

function renderRemovedTask(numRemovedJobs?: number): string {
    if (!isValidNumber(numRemovedJobs)) return '';
    return `${numRemovedJobs} tasks were removed.`;
}

function parseSummary(summary?: string): string | undefined {
    if (summary == null) return undefined;
    const parsedSummary = JSON.parse(summary);
    const summaryItems = [
        renderNumJobsChanged(parsedSummary?.numJobsChanged, parsedSummary?.numDownstreamUniqueProjects),
        renderNumJobsDefinitionChanged(parsedSummary?.numJobsDefinitionChanged),
        renderNumJobsLogicChanged(parsedSummary?.numJobsLogicChanged),
        renderAddedTask(parsedSummary?.numAddedJobs),
        renderRemovedTask(parsedSummary?.numRemovedJobs),
    ].filter((e) => e.length !== 0);
    return summaryItems.join('\r\n');
}

const columns = [
    {
        title: 'Task id',
        dataIndex: 'task_id',
        key: 'task_id',
        render: renderTaskIds,
    },
    {
        title: 'Author',
        dataIndex: 'author',
        key: 'author',
        render: (value: string) => <ValueText>{value}</ValueText>,
    },
    {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
    },
    {
        title: 'Timestamp',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: convertEpochToISO,
    },
    {
        title: 'Summary',
        dataIndex: 'summary',
        key: 'summary',
        render: parseSummary,
    },
    {
        title: 'Affects direct upstreams only',
        dataIndex: 'includeCurrent',
        key: 'includeCurrent',
        render: (includeCurrent: boolean) => (includeCurrent ? <div>No</div> : <div>Yes</div>),
    },
];

function returnDataSource(entity: VersionEntity) {
    const { externalUrl } = entity;
    const { customProperties } = entity;
    const title = renderTitleWithExternalURL(customProperties, externalUrl);
    if (customProperties == null || customProperties.length === 0) return {};
    const dataSource = {
        task_id: entity.datajobEntities,
        author: getCustomProperty(customProperties, 'author'),
        title,
        timestamp: getCustomProperty(customProperties, 'createdAt'),
        summary: getCustomProperty(customProperties, 'summary'),
        includeCurrent: entity.includeCurrentTask,
    };
    return dataSource;
}

export const ChangelogTab = ({
    properties = { displayUpstream: true },
}: {
    properties?: { displayUpstream: boolean };
}) => {
    const { urn } = useEntityData();
    const direction = LineageDirection.Upstream;
    const types = [];
    const query = '';
    const start = 0;
    const count = 1000;
    const filters = [
        {
            field: 'degree',
            value: '1',
        },
        {
            field: 'degree',
            value: '2',
        },
    ];
    const [displayUpstream, setDisplayUpstream] = useState<boolean>(properties.displayUpstream);
    const currentDataJob = useGetDataJobVersionQuery({
        variables: {
            urn,
            versionInfosInput: {
                start: 0,
                count: 10,
            },
        },
    });
    const { data, loading } = useGetUpstreamVersionsQuery({
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
            versionInfosInput: {
                start: 0,
                count: 10,
            },
        },
    });
    if (loading || currentDataJob.loading) return loadingPage;
    const currentDataJobArr: DataJobEntityWithVersions[] =
        currentDataJob?.data?.dataJob == null ? [] : [currentDataJob?.data?.dataJob as DataJobEntityWithVersions];

    const upstreamDataJobs = data?.searchAcrossLineage?.searchResults
        ?.filter((e) => {
            return e.entity.type === EntityType.DataJob;
        })
        ?.map((e) => e.entity) as DataJobEntityWithVersions[];

    const upstreamDataJobsArr: DataJobEntityWithVersions[] = upstreamDataJobs == null ? [] : upstreamDataJobs;
    const concatDataJobsArr = [
        ...currentDataJobArr.map((e) => DataJobEntityWithRelationMapper(e, true)),
        ...upstreamDataJobsArr.map((e) => DataJobEntityWithRelationMapper(e, false)),
    ].filter((e) => !(e.entity.versionInfo == null));

    // return a list of datajobs attached to each version
    function groupVersionWithDataJob(items) {
        return items.reduce((acc, curr) => {
            const { entity, isCurrent } = curr;
            const entityUrn = entity.urn;
            const { jobId, versionInfo } = entity;
            const { versionInfos } = versionInfo;
            const versionWithDataJob = versionInfos.reduce((accVersions, currVersion) => {
                const { version } = currVersion;
                const currentItem = acc?.[version] || [];
                const updatedDataJobList = [...currentItem, { jobId, urn: entityUrn, isCurrent }];
                return {
                    ...accVersions,
                    [version]: updatedDataJobList,
                };
            }, acc);
            return {
                ...acc,
                ...versionWithDataJob,
            };
        }, {});
    }

    function groupVersion(items) {
        return items.reduce((acc, curr) => {
            const { entity } = curr;
            const { versionInfo } = entity;
            const { versionInfos } = versionInfo;
            const versionInfoDetails = versionInfos.reduce((accVersions, currVersion) => {
                const { version } = currVersion;
                return {
                    ...accVersions,
                    [version]: currVersion,
                };
            }, acc);
            return {
                ...acc,
                ...versionInfoDetails,
            };
        }, {});
    }

    const versionsWithDataJobArr = groupVersionWithDataJob(concatDataJobsArr);
    const versionsArr = groupVersion(concatDataJobsArr);

    function versionArrMapper(versionsWithDataJob, versions): VersionEntity[] {
        const ret = Object.keys(versionsWithDataJob)
            .filter((key) => versions[key])
            .map(
                (key) =>
                    ({
                        version: key,
                        versionType: versions[key].versionType,
                        externalUrl: versions[key].externalUrl, // this field might be undefined
                        customProperties: versions[key].customProperties, // this field might be undefined
                        datajobEntities: versionsWithDataJob[key].filter((item) => displayUpstream || item.isCurrent),
                        includeCurrentTask: versionsWithDataJob[key]
                            .filter((item) => displayUpstream || item.isCurrent)
                            .some((e) => e.isCurrent),
                    } as VersionEntity),
            );
        return ret;
    }

    const versionArr: VersionEntity[] = versionArrMapper(versionsWithDataJobArr, versionsArr);

    const dataSource = versionArr
        .filter((e) => {
            return displayUpstream || e.includeCurrentTask;
        })
        .sort((a, b) => {
            const aCreatedAt = getCustomProperty(a?.customProperties, 'createdAt')
                ? parseInt(getCustomProperty(a?.customProperties, 'createdAt'), 10)
                : 0;
            const bCreatedAt = getCustomProperty(b?.customProperties, 'createdAt')
                ? parseInt(getCustomProperty(b?.customProperties, 'createdAt'), 10)
                : 0;
            return bCreatedAt - aCreatedAt;
        })
        .map(returnDataSource)
        .filter((ele) => !(Object.keys(ele).length === 0));

    const UIcomponent = <Table dataSource={dataSource} columns={columns} />;

    const toolTip = (
        <>
            {'Recent Pull Requests That Affects Current Task  '}
            <Tooltip title="The PRs listed below include those that impact the current task and its upstreams, please use the toggle to hide changes to upstream tasks">
                <InfoCircleTwoTone />
            </Tooltip>
        </>
    );
    return (
        <div>
            <TabToolbar>
                <Descriptions
                    title={toolTip}
                    style={{
                        width: '50%',
                        marginTop: '5px',
                        marginLeft: '20px',
                        marginRight: '200px',
                        display: 'inline-block',
                    }}
                    size="small"
                    column={{ md: 10 }}
                />
                <div style={{ display: 'flex', zIndex: 1, width: '300px', padding: '7px 16px' }}>
                    <Descriptions
                        title="Show Upstream"
                        size="small"
                        column={{ md: 10 }}
                        style={{ width: '120px', display: 'inline-block' }}
                    />
                    <Switch
                        checkedChildren="On"
                        unCheckedChildren="Off"
                        checked={displayUpstream === true}
                        onChange={() => setDisplayUpstream(!displayUpstream)}
                        style={{ marginRight: '20px', display: 'inline-block' }}
                    />
                </div>
            </TabToolbar>
            {UIcomponent}
        </div>
    );
};
