/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-nested-ternary */
import React, { MouseEventHandler, ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { Button, DatePicker, DatePickerProps, Descriptions, Divider, List, Tooltip } from 'antd';
import styled from 'styled-components';

import moment from 'moment';
import { useEntityData, useLineageData } from '../../shared/EntityContext';
import TabToolbar from '../../shared/components/styled/TabToolbar';
import { DataProcessRunEvent, DataProcessRunStatus, EntityType, LineageDirection } from '../../../../types.generated';
import { useEntityRegistry } from '../../../useEntityRegistry';
import { getEntityPath } from '../../shared/containers/profile/utils';
import { LineageTable } from '../../shared/tabs/Lineage/LineageTable';
import { ImpactAnalysis } from '../../shared/tabs/Lineage/ImpactAnalysis';
import { useGetDelaysQuery } from '../../../../graphql/delays.generated';
import { capitalizeFirstLetter } from '../../../shared/textUtil';
import { Entity, IconStyleType } from '../../Entity';
import InsightsPreviewCard from '../../../preview/InsightsPreviewCard';

// copied from lineagetab.tsx
const StyledTabToolbar = styled(TabToolbar)`
    justify-content: space-between;
`;

const StyledButton = styled(Button)<{ isSelected: boolean }>`
    ${(props) =>
        props.isSelected &&
        `
        color: #1890ff;
        &:focus {
            color: #1890ff;
        }
    `}
`;

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
};

function calculateRuntime(dataJob: DataJobEntity) {
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
    return runtime;
}

function isEntityDelayed(entity: DataJobEntity) {
    const slo = entity.properties?.customProperties?.filter((e) => e.key === 'runtime_slo')[0]?.value || undefined;
    if (slo === undefined) return false;
    return calculateRuntime(entity!) > parseInt(slo, 10);
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
    const count = 10;
    const { urn, entityType } = useEntityData();
    const [execDate, setExecDate] = useState<number>(properties.defaultDate);
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

    const entityRegistry = useEntityRegistry();
    const additionalPropertiesList = data?.searchAcrossLineage?.searchResults?.map((searchResult) => ({
        degree: searchResult.degree,
    }));
    const dataJobEntities = data?.searchAcrossLineage?.searchResults
        ?.filter((e) => {
            return e.entity.type === EntityType.DataJob;
        })
        .map((e) => e.entity) as DataJobEntity[];

    const currentMoment = moment.utc();
    const handleDateChange: DatePickerProps['onChange'] = (date, dateString) => {
        setExecDate(moment.utc(dateString).valueOf() || currentMoment.valueOf());
    };

    return (
        <>
            <div>
                <Descriptions title="" bordered size="small" column={{ md: 4 }}>
                    <Descriptions.Item style={{ fontWeight: 'bold' }} label="Execution Date">
                        <Tooltip title="UTC scheduled run of tasks">
                            <DatePicker
                                format="YYYY-MM-DD HH:mm"
                                showTime={{
                                    format: 'HH:mm',
                                }}
                                onChange={handleDateChange}
                                defaultValue={currentMoment}
                            />
                        </Tooltip>
                    </Descriptions.Item>
                </Descriptions>
            </div>
            <StyledList
                bordered
                dataSource={dataJobEntities}
                renderItem={(entity, index) => {
                    const additionalProperties = additionalPropertiesList?.[index];
                    const genericProps = entityRegistry.getGenericEntityProperties(entity.type, entity);
                    const platformLogoUrl = genericProps?.platform?.properties?.logoUrl;
                    const dpiUrn = entity?.runs?.runs[entity.runs?.runs?.length - 1]?.urn || '';
                    const platformName =
                        genericProps?.platform?.properties?.displayName ||
                        capitalizeFirstLetter(genericProps?.platform?.name);
                    const entityTypeName = entityRegistry.getEntityName(entity.type);
                    const displayName = entityRegistry.getDisplayName(entity.type, entity);
                    const url = entityRegistry.getEntityUrl(entity.type, entity.urn);
                    const fallbackIcon = entityRegistry.getIcon(entity.type, 18, IconStyleType.ACCENT);
                    const subType = genericProps?.subTypes?.typeNames?.length && genericProps?.subTypes?.typeNames[0];
                    const entityCount = genericProps?.entityCount;
                    const slo =
                        genericProps?.customProperties?.filter((e) => e.key === 'runtime_slo')[0]?.value || 'undefined';
                    const runtime = calculateRuntime(entity);
                    const delay = runtime - parseFloat(slo);
                    return (
                        <>
                            <ListItem>
                                <InsightsPreviewCard
                                    name={displayName}
                                    logoUrl={platformLogoUrl || undefined}
                                    logoComponent={fallbackIcon}
                                    url={url}
                                    platform={platformName + dpiUrn || undefined}
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
                                />
                            </ListItem>
                            <ThinDivider />
                        </>
                    );
                }}
            />
        </>
    );
};
