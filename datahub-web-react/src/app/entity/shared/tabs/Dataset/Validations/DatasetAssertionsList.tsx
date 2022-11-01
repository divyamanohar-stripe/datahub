import { Button, Empty, Image, message, Modal, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';
import {
    AlertOutlined,
    DeleteOutlined,
    DownOutlined,
    IssuesCloseOutlined,
    LinkOutlined,
    RightCircleOutlined,
    RightOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { DatasetAssertionDescription } from './DatasetAssertionDescription';
import { StyledTable } from '../../../components/styled/StyledTable';
import { DatasetAssertionDetails } from './DatasetAssertionDetails';
import { Assertion, AssertionInfo, AssertionRunStatus } from '../../../../../../types.generated';
import { getResultColor, getResultIcon, getResultText } from './assertionUtils';
import { useDeleteAssertionMutation } from '../../../../../../graphql/assertion.generated';

const ResultContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: left;
`;

const ResultTypeText = styled(Typography.Text)`
    margin-left: 8px;
`;

const ActionButtonContainer = styled.div`
    display: flex;
    justify-content: right;
    align-items: center;
`;

const PlatformContainer = styled.div`
    margin-right: 8px;
`;

const HideContainer = styled.div`
    display: none;
`;

type Props = {
    assertions: Array<Assertion>;
    onDelete?: (urn: string) => void;
};

const consequencesFromValidationFailure = {
    raise: {
        icon: AlertOutlined,
        text: 'Fails task on failure',
    },
    none: {
        icon: RightCircleOutlined,
        text: 'No action on failure',
    },
    cancel_task: {
        icon: IssuesCloseOutlined,
        text: 'Cancels task on failure preventing retries',
    },
};

const Consequence = ({ assertionInfo }: { assertionInfo: AssertionInfo }) => {
    const maybeRaiseAction = assertionInfo?.customProperties?.find(({ key }) => key === 'raise_action')?.value;
    if (!maybeRaiseAction) {
        return <></>;
    }
    const consequence = consequencesFromValidationFailure[maybeRaiseAction];
    return (
        <Tooltip title={consequence.text}>
            <consequence.icon style={{ fontSize: '16px' }} />
        </Tooltip>
    );
};

/**
 * A list of assertions displaying their most recent run status, their human-readable
 * description, and platform.
 *
 * Currently this component supports rendering Dataset Assertions only.
 */
export const DatasetAssertionsList = ({ assertions, onDelete }: Props) => {
    const [deleteAssertionMutation] = useDeleteAssertionMutation();

    const deleteAssertion = async (urn: string) => {
        try {
            await deleteAssertionMutation({
                variables: { urn },
            });
            message.success({ content: 'Removed assertion.', duration: 2 });
        } catch (e: unknown) {
            message.destroy();
            if (e instanceof Error) {
                message.error({ content: `Failed to remove assertion: \n ${e.message || ''}`, duration: 3 });
            }
        }
        onDelete?.(urn);
    };

    const onDeleteAssertion = (urn: string) => {
        Modal.confirm({
            title: `Confirm Assertion Removal`,
            content: `Are you sure you want to remove this assertion from the dataset?`,
            onOk() {
                deleteAssertion(urn);
            },
            onCancel() {},
            okText: 'Yes',
            maskClosable: true,
            closable: true,
        });
    };

    const assertionsTableData = assertions.map((assertion) => ({
        urn: assertion.urn,
        type: assertion.info?.type,
        platform: assertion.platform,
        assertionInfo: assertion.info,
        datasetAssertionInfo: assertion.info?.datasetAssertion,
        lastExecTime: assertion.runEvents?.runEvents.length && assertion.runEvents.runEvents[0].timestampMillis,
        lastExecResult:
            assertion.runEvents?.runEvents.length &&
            assertion.runEvents.runEvents[0].status === AssertionRunStatus.Complete &&
            assertion.runEvents.runEvents[0].result?.type,
        lastExecResultLink:
            assertion.runEvents?.runEvents.length && assertion.runEvents.runEvents[0].result?.externalUrl,
    }));

    const assertionsTableCols = [
        {
            title: '',
            dataIndex: '',
            key: '',
            render: (_, record: any) => {
                const executionDate = record.lastExecTime && new Date(record.lastExecTime);
                const localTime = executionDate && `${executionDate.toLocaleDateString()}`;
                const resultColor = (record.lastExecResult && getResultColor(record.lastExecResult)) || 'default';
                const resultText = (record.lastExecResult && getResultText(record.lastExecResult)) || 'No Evaluations';
                const resultIcon = (record.lastExecResult && getResultIcon(record.lastExecResult)) || <StopOutlined />;
                return (
                    <ResultContainer>
                        <div>
                            <Tooltip title={(localTime && `Last evaluated on ${localTime}`) || 'No Evaluations'}>
                                <Tag style={{ borderColor: resultColor }}>
                                    {resultIcon}
                                    <ResultTypeText style={{ color: resultColor }}>{resultText}</ResultTypeText>
                                </Tag>
                            </Tooltip>
                        </div>
                        <DatasetAssertionDescription assertionInfo={record.datasetAssertionInfo} />
                    </ResultContainer>
                );
            },
        },
        {
            title: '',
            dataIndex: '',
            key: '',
            render: (_, record: any) => (
                <ActionButtonContainer>
                    <HideContainer>
                        <Tooltip title={record.platform.properties?.displayName}>
                            <PlatformContainer>
                                {(record.platform.properties?.logoUrl && (
                                    <Image
                                        preview={false}
                                        height={20}
                                        width={20}
                                        src={record.platform.properties?.logoUrl}
                                    />
                                )) || <Typography.Text>{record.platform.properties?.displayName}</Typography.Text>}
                            </PlatformContainer>
                        </Tooltip>
                        {/* Hide delete button since we use DataHub as a read-only Data Catalog */}
                        <Button onClick={() => onDeleteAssertion(record.urn)} type="text" shape="circle" danger>
                            <DeleteOutlined />
                        </Button>
                    </HideContainer>
                    <Consequence assertionInfo={record.assertionInfo} />
                    <Tooltip title="View logs">
                        <Button
                            href={record.lastExecResultLink}
                            disabled={!record.lastExecResultLink}
                            type="link"
                            shape="circle"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <LinkOutlined />
                        </Button>
                    </Tooltip>
                </ActionButtonContainer>
            ),
        },
    ];

    return (
        <>
            <StyledTable
                columns={assertionsTableCols}
                dataSource={assertionsTableData}
                rowKey="urn"
                locale={{
                    emptyText: <Empty description="No Assertions Found :(" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
                expandable={{
                    defaultExpandAllRows: false,
                    expandRowByClick: true,
                    expandedRowRender: (record) => {
                        return <DatasetAssertionDetails urn={record.urn} lastEvaluatedAtMillis={record.lastExecTime} />;
                    },
                    expandIcon: ({ expanded, onExpand, record }: any) =>
                        expanded ? (
                            <DownOutlined style={{ fontSize: 8 }} onClick={(e) => onExpand(record, e)} />
                        ) : (
                            <RightOutlined style={{ fontSize: 8 }} onClick={(e) => onExpand(record, e)} />
                        ),
                }}
                showHeader={false}
                pagination={false}
            />
        </>
    );
};
