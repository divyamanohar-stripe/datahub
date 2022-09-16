/**
 * [STRIPE_CONTRIBUTION]
 */
import { Typography, Button, Modal, message } from 'antd';
import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { EMPTY_MESSAGES } from '../../../../constants';
import { useEntityData, useRefetch } from '../../../../EntityContext';
import { SidebarHeader } from '../SidebarHeader';
import { AddUserDefinedReportModal } from './AddUserDefinedReportModal';
import { useEntityRegistry } from '../../../../../../useEntityRegistry';
import { EntityType } from '../../../../../../../types.generated';
import { useRemoveUserDefinedReportMutation } from '../../../../../../../graphql/mutations.generated';
import { UserDefinedReportLink } from '../../../../../../shared/tags/UserDefinedReportLink';

export const SidebarUserDefinedReportSection = () => {
    const { urn, entityData } = useEntityData();
    const entityRegistry = useEntityRegistry();
    const refetch = useRefetch();
    const [removeUserDefinedReportMutation] = useRemoveUserDefinedReportMutation();
    const [showModal, setShowModal] = useState(false);
    const userDefinedReports = entityData?.userDefinedReports;

    const removeUserDefinedReport = (userDefinedReportUrn: string) => {
        removeUserDefinedReportMutation({ variables: { entityUrn: urn, userDefinedReportUrn } })
            .then(() => {
                message.success({ content: 'Removed user defined report.', duration: 2 });
                refetch?.();
            })
            .catch((e: unknown) => {
                message.destroy();
                if (e instanceof Error) {
                    message.error({
                        content: `Failed to remove user defined report: \n ${e.message || ''}`,
                        duration: 3,
                    });
                }
            });
    };

    const onRemoveUserDefinedReport = (userDefinedReportUrn: string) => {
        Modal.confirm({
            title: `Confirm User Defined Report Removal`,
            content: `Are you sure you want to remove this user defined report?`,
            onOk() {
                removeUserDefinedReport(userDefinedReportUrn);
            },
            onCancel() {},
            okText: 'Yes',
            maskClosable: true,
            closable: true,
        });
    };

    let userDefinedReportLinks;
    if (userDefinedReports !== undefined && userDefinedReports !== null && userDefinedReports.length >= 0) {
        userDefinedReportLinks = userDefinedReports?.map((r) => (
            <UserDefinedReportLink
                urn={r.urn}
                name={entityRegistry.getDisplayName(EntityType.UserDefinedReport, r)}
                closable
                onClose={(e) => {
                    e.preventDefault();
                    onRemoveUserDefinedReport(r.urn);
                }}
            />
        ));
    } else {
        userDefinedReportLinks = (
            <>
                <Typography.Paragraph type="secondary">
                    {EMPTY_MESSAGES.userDefinedReport.title}. {EMPTY_MESSAGES.userDefinedReport.description}
                </Typography.Paragraph>
            </>
        );
    }

    return (
        <div>
            <SidebarHeader title="User Defined Reports" />
            <div>{userDefinedReportLinks}</div>
            <Button type="default" onClick={() => setShowModal(true)}>
                <PlusOutlined /> Add
            </Button>
            <AddUserDefinedReportModal
                visible={showModal}
                refetch={refetch}
                onClose={() => {
                    setShowModal(false);
                }}
            />
        </div>
    );
};
