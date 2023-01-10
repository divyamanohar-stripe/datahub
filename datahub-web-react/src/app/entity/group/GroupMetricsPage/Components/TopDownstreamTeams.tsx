import React, { FC } from 'react';
import { PageHeader, Table } from 'antd';
import { EntityType } from '../../../../../types.generated';
import { useGetDownstreamTeamsQuery } from '../../../../../graphql/groupMetrics.generated';
import { getDownstreamTeams } from '../functions';
import { DownstreamTeam, DownstreamTeamEntity } from '../interfaces';
import { CompactEntityNameList } from '../../../../recommendations/renderer/component/CompactEntityNameList';
import { loadingPage } from '../../../shared/stripe-utils';

const ExpandableRows = ({ downstreamEntities }: { downstreamEntities }) => {
    const columns = [
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
    return <Table columns={columns} dataSource={downstreamEntities.entities} size="small" />;
};

// component for top downstream teams table
const DownstreamTeamsTable = ({ downstreamTeams }: { downstreamTeams: DownstreamTeam[] }) => {
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
            expandedRowRender={(record) => <ExpandableRows downstreamEntities={record} />}
            dataSource={downstreamTeams}
            size="small"
        />
    );
};

interface TopDownstreamTeamsProps {
    urn: string;
    useDatasetType: boolean;
}

// main entry component for top downstream teams table, queries for downstream of data entities on page
export const TopDownstreamTeams: FC<TopDownstreamTeamsProps> = ({ urn, useDatasetType }) => {
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

    const dataType = useDatasetType ? 'Datasets' : 'Data Jobs';
    return (
        <>
            <PageHeader title={`Top Downstream Teams for ${dataType} with SLAs Defined`} />
            <DownstreamTeamsTable downstreamTeams={downstreamTeams} />
        </>
    );
};
