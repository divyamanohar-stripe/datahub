import { Typography, Modal, Divider, Card, Statistic, Button } from 'antd';
import React from 'react';
import { DataProcessInsight, DataProcessInsightType } from '../../../../../types.generated';
import { CompactEntityNameList } from '../../../../recommendations/renderer/component/CompactEntityNameList';

type Props = {
    dataProcessInsight: DataProcessInsight;
};

type ModalProps = {
    airflowLogsLink: string;
    dataProcessInsight: DataProcessInsight;
    visible: boolean;
    onClose: () => void;
};

function DataProcessInsightDisplay({ dataProcessInsight }: Props) {
    const titleMessaging =
        dataProcessInsight.type === DataProcessInsightType.FailureInsight
            ? 'Data Process Failure Information'
            : 'Data Process SLA Miss Information';
    return (
        <>
            <Typography.Title level={3} type="danger">
                {titleMessaging}
            </Typography.Title>
            <Divider />
            <Card title="Responsible Team">
                {dataProcessInsight.owner && (
                    <Card type="inner">
                        <CompactEntityNameList entities={[dataProcessInsight.owner.owner]} />
                    </Card>
                )}
            </Card>
            <br />
            <Card>
                {dataProcessInsight.rootCause && <Statistic title="Root Cause" value={dataProcessInsight.rootCause} />}
            </Card>
            <br />
            <Card title="Error Message">
                <Card type="inner">{dataProcessInsight.message}</Card>
            </Card>
        </>
    );
}

export function DataProcessInsightModal({ airflowLogsLink, dataProcessInsight, visible, onClose }: ModalProps) {
    return (
        <Modal
            visible={visible}
            width={900}
            onCancel={onClose}
            footer={
                <>
                    <Button href={airflowLogsLink}>Airflow Logs</Button>
                    {dataProcessInsight.link && (
                        <Button href={dataProcessInsight.link}>Confluence Question Reference</Button>
                    )}
                </>
            }
        >
            <DataProcessInsightDisplay dataProcessInsight={dataProcessInsight} />
        </Modal>
    );
}
