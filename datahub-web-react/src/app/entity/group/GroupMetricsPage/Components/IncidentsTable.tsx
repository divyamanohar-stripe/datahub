import React, { FC } from 'react';
import moment from 'moment-timezone';
import { AlertOutlined } from '@ant-design/icons';
import { PageHeader, Table } from 'antd';
import { IncidentEntity } from '../interfaces';
import { EntityPreviewTag } from '../../../../recommendations/renderer/component/EntityPreviewTag';
import { urlEncodeUrn } from '../../../shared/utils';
import { useGetGroupIncidentsQuery } from '../../../../../graphql/groupMetrics.generated';
import { EntityType } from '../../../../../types.generated';
import { loadingPage } from '../../../userDefinedReport/profile/SharedContent';
import { getValidField } from '../../../incident/profile/IncidentContentTab';

// component for incidents table
const IncidentsTable = ({ incidents }: { incidents: IncidentEntity[] }) => {
    const columns = [
        {
            title: 'Date Opened',
            render: (incidentEntity) => {
                return incidentEntity?.properties?.openedAt && incidentEntity?.properties.openedAt !== 0
                    ? moment.utc(new Date(incidentEntity.properties.openedAt)).format('MMMM Do YYYY')
                    : '';
            },
        },
        {
            title: 'Name',
            render: (incidentEntity) => {
                return (
                    <EntityPreviewTag
                        displayName={incidentEntity?.properties?.name}
                        url={`/incident/${urlEncodeUrn(incidentEntity.urn)}`}
                        platformLogoUrl={undefined}
                        logoComponent={<AlertOutlined />}
                    />
                );
            },
        },
        {
            title: 'Summary',
            render: (incidentEntity) => {
                return getValidField(incidentEntity?.properties?.summary);
            },
        },
        {
            title: 'Description',
            render: (incidentEntity) => {
                return getValidField(incidentEntity?.properties?.description);
            },
        },
        {
            title: 'State',
            render: (incidentEntity) => {
                return getValidField(incidentEntity?.properties?.state);
            },
        },
        {
            title: 'Severity',
            render: (incidentEntity) => {
                return getValidField(incidentEntity?.properties?.severity);
            },
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
};

interface IncidentProps {
    urn: string;
    logicalBeginningDate: number;
    logicalEndDate: number;
}

// main entry component for incidents table, queries for all incidents owned by a team
export const TeamIncidents: FC<IncidentProps> = ({ urn, logicalBeginningDate, logicalEndDate }) => {
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

    incidentEntities = incidentEntities.filter(
        (incident) =>
            (incident?.properties?.openedAt ?? 0) > logicalBeginningDate &&
            (incident?.properties?.openedAt ?? 0) < logicalEndDate,
    );
    incidentEntities.sort((a, b) => (b.properties?.openedAt ?? 0) - (a.properties?.openedAt ?? 0));

    return (
        <>
            <PageHeader title="Recent Incidents" />
            <IncidentsTable incidents={incidentEntities} />
        </>
    );
};
