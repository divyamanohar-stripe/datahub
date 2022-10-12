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

function returnUIContent(entityWithRelation) {
    const { entity } = entityWithRelation;
    if (entity === undefined || entity === null) return <div />;
    const externalUrl = entity?.versionInfo?.externalUrl;
    const customProperties = entity?.versionInfo?.customProperties;

    if (customProperties === undefined || customProperties === null || customProperties.length === 0) return <div />;
    const taskMeta = [
        { key: 'task id', value: entity?.jobId, __typename: 'StringMapEntry' },
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
    if (entityWithRelation.isUpstream === true)
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
    const UIcomponent = concatDataJobsArr
        ?.filter((e) => {
            if (!displayUpstream && e.isUpstream) return false;
            return true;
        })
        ?.sort((a, b) => {
            const aCreatedAt = parseInt(getCustomProperty(a?.entity?.versionInfo?.customProperties, 'createdAt'), 10);
            const bCreatedAt = parseInt(getCustomProperty(b?.entity?.versionInfo?.customProperties, 'createdAt'), 10);
            return bCreatedAt - aCreatedAt;
        })
        ?.map(returnUIContent);
    return (
        <div>
            <div>show upstream?</div>
            <Switch checked={displayUpstream === true} onChange={() => setDisplayUpstream(!displayUpstream)} />
            {UIcomponent}
        </div>
    );
};
