import React, { useState } from 'react';
import { Switch, Typography } from 'antd';
import styled from 'styled-components';
import { EntityType, LineageDirection } from '../../../../../types.generated';

import { ANTD_GRAY } from '../../constants';
import { CurrentStyledTable, UpstreamStyledTable } from '../../components/styled/StyledTable';
import { useEntityData } from '../../EntityContext';
import { useGetUpstreamVersionsQuery, useGetDataJobVersionQuery } from '../../../../../graphql/getVersions.generated';

const NameText = styled(Typography.Text)`
    font-family: 'Roboto Mono', monospace;
    font-weight: 600;
    font-size: 12px;
    color: ${ANTD_GRAY[9]};
`;

const ValueText = styled(Typography.Text)`
    font-family: 'Roboto Mono', monospace;
    font-weight: 400;
    font-size: 12px;
    color: ${ANTD_GRAY[8]};
`;

type DataJobEntity = {
    type: EntityType.DataJob;
    urn: string;
    jobId: string;
    versionInfo?: {
        customProperties?: {
            key: string;
            value: string;
        }[];
        version: string;
        versionType: string;
        externalUrl?: string;
    };
};

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

function DataJobEntityWithRelationMapper(entity: DataJobEntity, isUpstream: boolean) {
    const obj = {
        entity,
        isUpstream,
    };
    return obj;
}

function getCustomProperty(customProperties, fieldName) {
    if (customProperties === undefined || customProperties === null) return undefined;
    const field = customProperties?.filter((e) => e.key === fieldName)[0]?.value;
    return field;
}

const propertyTableColumns = [
    {
        width: 210,
        title: 'Name',
        dataIndex: 'key',
        render: (name: string) => <NameText>{name}</NameText>,
    },
    {
        title: 'Value',
        dataIndex: 'value',
        render: (value: string) => <ValueText>{value}</ValueText>,
    },
];

function convertEpochToISO(epoch?: string) {
    if (epoch === undefined || epoch === null) return undefined;
    const toInt = parseInt(epoch, 10) * 1000;
    const date = new Date(toInt);
    console.log('date');
    console.log(toInt);
    console.log(date);
    return date.toISOString();
}

function renderTaskIdWithExternalURL(dataJob: { jobId?: string; urn?: string; isCurrent: boolean }) {
    if (dataJob.jobId === undefined || dataJob.jobId === null) return undefined;
    if (dataJob.urn === undefined || dataJob.urn === null) return dataJob.jobId;
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
    if (
        getCustomProperty(customProperties, 'name') === undefined ||
        getCustomProperty(customProperties, 'name') === null
    ) {
        return undefined;
    }
    if (externalUrl === undefined || externalUrl === null) {
        return getCustomProperty(customProperties, 'name');
    }
    return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            {getCustomProperty(customProperties, 'name')}
        </a>
    );
}

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
    if (summary === undefined || summary === null) return undefined;
    const parsedSummary = JSON.parse(summary);
    const summaryItems = [
        renderNumJobsChanged(parsedSummary?.numJobsChanged, parsedSummary?.numDownstreamUniqueProjects),
        renderNumJobsDefinitionChanged(parsedSummary?.numJobsDefinitionChanged),
        renderNumJobsLogicChanged(parsedSummary?.numJobsLogicChanged),
        renderAddedTask(parsedSummary?.numAddedJobs),
        renderRemovedTask(parsedSummary?.numRemovedJobs),
    ].filter((e) => e.length !== 0);
    console.log('summaryItems');
    console.log(parsedSummary);
    console.log(summaryItems);
    return summaryItems.join('\r\n');
}

function returnUIContent(entity: VersionEntity) {
    const { externalUrl } = entity;
    const { customProperties } = entity;

    if (customProperties === undefined || customProperties === null || customProperties.length === 0) return <div />;
    const taskMeta = [
        {
            key: 'task id',
            value: renderTaskIds(entity.datajobEntities),
            __typename: 'StringMapEntry',
        },
        { key: 'author', value: getCustomProperty(customProperties, 'author'), __typename: 'StringMapEntry' },
        {
            key: 'title',
            value: renderTitleWithExternalURL(customProperties, externalUrl),
            __typename: 'StringMapEntry',
        },
        {
            key: 'timestamp',
            value: convertEpochToISO(getCustomProperty(customProperties, 'createdAt')),
            __typename: 'StringMapEntry',
        },
        {
            key: 'summary',
            value: parseSummary(getCustomProperty(customProperties, 'summary')),
            __typename: 'StringMapEntry',
        },
    ].filter((e) => !(e.value === undefined || e.value === null));
    if (entity.includeCurrentTask === false)
        return (
            <UpstreamStyledTable pagination={false} columns={propertyTableColumns} dataSource={taskMeta || undefined} />
        );
    return <CurrentStyledTable pagination={false} columns={propertyTableColumns} dataSource={taskMeta || undefined} />;
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
        },
    });
    console.log('currentDataJob?.data');
    console.log(currentDataJob?.data);
    const currentDataJobArr: DataJobEntity[] =
        currentDataJob?.data?.dataJob === undefined ? [] : [currentDataJob.data.dataJob as DataJobEntity];
    console.log('currentDataJobArr');
    console.log(currentDataJobArr);
    const { data } = useGetUpstreamVersionsQuery({
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
        },
    });
    const upstreamDataJobs = data?.searchAcrossLineage?.searchResults
        ?.filter((e) => {
            return e.entity.type === EntityType.DataJob;
        })
        ?.map((e) => e.entity) as DataJobEntity[];
    console.log('upstreamDataJobs');
    console.log(upstreamDataJobs);
    const upstreamDataJobsArr = upstreamDataJobs === undefined ? [] : upstreamDataJobs;
    console.log(upstreamDataJobsArr);
    const concatDataJobsArr = [
        ...currentDataJobArr.map((e) => DataJobEntityWithRelationMapper(e, false)),
        ...upstreamDataJobsArr.map((e) => DataJobEntityWithRelationMapper(e, true)),
    ].filter((e) => !(e.entity.versionInfo === undefined || e.entity.versionInfo === null));
    console.log('concatDataJobs');
    console.log(concatDataJobsArr);

    function groupVersionWithDataJob(items) {
        return items.reduce((acc, curr) => {
            const currVersionInfo = curr.entity.versionInfo; // must not be null
            const { version } = currVersionInfo;
            const currentItems = acc[version];
            const jobInfo = { jobId: curr.entity.jobId, urn: curr.entity.urn, isCurrent: !curr.isUpstream };
            return {
                ...acc,
                [version]: currentItems ? [...currentItems, jobInfo] : [jobInfo],
            };
        }, []);
    }

    function groupVersion(items) {
        return items.reduce((acc, curr) => {
            const currVersionInfo = curr.entity.versionInfo; // must not be null
            if (!currVersionInfo.customProperties || currVersionInfo.customProperties.length === 0) return acc; // do not display versions that have no customProperties (because there is nothing to display)
            const { version } = currVersionInfo;
            return {
                ...acc,
                [version]: currVersionInfo, // assume same version implies same customProperties
            };
        }, []);
    }

    const versionsWithDataJobArr = groupVersionWithDataJob(concatDataJobsArr); // concatDataJobsArr all have versionInfo
    const versionsArr = groupVersion(concatDataJobsArr); // versionsWithDataJobArr all have jobId, urn and isCurrent

    function versionArrMapper(versionsWithDataJob, versions): VersionEntity[] {
        const ret = Object.keys(versionsWithDataJob)
            .filter((key) => versions[key]) // make sure that the versions associated with the tasks all have customProperties
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
    console.log('test groupby');
    console.log(versionsWithDataJobArr);
    console.log(versionsArr);
    console.log('new testing groupby');
    console.log(versionArr);

    const UIcomponent = versionArr
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
        .map(returnUIContent);
    return (
        <div>
            <div>show upstream?</div>
            <Switch checked={displayUpstream === true} onChange={() => setDisplayUpstream(!displayUpstream)} />
            {UIcomponent}
        </div>
    );
};
