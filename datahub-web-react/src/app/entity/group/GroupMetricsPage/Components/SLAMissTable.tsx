import React from 'react';
import { DeliveredProcedureOutlined } from '@ant-design/icons';
import { Table, Tag } from 'antd';
import { grey, red, green, orange } from '@ant-design/colors';
import { SLAMissData, RunState } from '../interfaces';
import { CompactEntityNameList } from '../../../../recommendations/renderer/component/CompactEntityNameList';
import { ExternalUrlLink } from '../../../userDefinedReport/profile/SharedContent';

const StateTag = ({ state }: { state: string }) => {
    switch (state) {
        case RunState.RUNNING:
            return <Tag color={grey.primary}>{state.toLowerCase()}</Tag>;
        case RunState.SUCCESS:
            return <Tag color={green.primary}>{state.toLowerCase()}</Tag>;
        case RunState.SKIPPED:
            return <Tag color={grey[grey.length - 1]}>{state.toLowerCase()}</Tag>;
        case RunState.FAILURE:
            return <Tag color={red.primary}>{state.toLowerCase()}</Tag>;
        case RunState.UP_FOR_RETRY:
            return <Tag color={orange.primary}>{state.toLowerCase()}</Tag>;
        default:
            return <Tag color="default">{state.toLowerCase()}</Tag>;
    }
};

export const SLAMissTable = ({ data, useDatasetType }: { data: SLAMissData[]; useDatasetType: boolean }) => {
    const dataTitle = useDatasetType ? 'Dataset' : 'Data Job';
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
            render: (state) => <StateTag state={state} />,
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
};
