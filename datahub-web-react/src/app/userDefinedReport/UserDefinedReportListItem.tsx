import React from 'react';
import styled from 'styled-components';
import { List, Tag, Tooltip, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { IconStyleType } from '../entity/Entity';
import { UserDefinedReport, EntityType } from '../../types.generated';
import { useEntityRegistry } from '../useEntityRegistry';
import AvatarsGroup from '../shared/avatar/AvatarsGroup';

const UserDefinedReportItemContainer = styled.div`
    display: flex;
    justify-content: space-between;
    padding-left: 8px;
    padding-right: 8px;
    width: 100%;
`;

const UserDefinedReportHeaderContainer = styled.div`
    display: flex;
    justify-content: left;
    align-items: center;
`;

const UserDefinedReportNameContainer = styled.div`
    margin-left: 16px;
    margin-right: 16px;
`;

type Props = {
    userDefinedReport: UserDefinedReport;
};

export default function UserDefinedReportListItem({ userDefinedReport }: Props) {
    const entityRegistry = useEntityRegistry();
    const displayName = entityRegistry.getDisplayName(EntityType.UserDefinedReport, userDefinedReport);
    const type = userDefinedReport.properties?.type;
    const logoIcon = entityRegistry.getIcon(EntityType.UserDefinedReport, 12, IconStyleType.ACCENT);
    const owners = userDefinedReport.ownership?.owners;
    const totalEntities = userDefinedReport.entities?.total;

    return (
        <List.Item>
            <UserDefinedReportItemContainer>
                <Link to={entityRegistry.getEntityUrl(EntityType.UserDefinedReport, userDefinedReport.urn)}>
                    <UserDefinedReportHeaderContainer>
                        {logoIcon}
                        <UserDefinedReportNameContainer>
                            <Typography.Text>{displayName}</Typography.Text>
                        </UserDefinedReportNameContainer>
                        <Tag>{type}</Tag>
                        <Tooltip title={`There are ${totalEntities} entities in this user defined report.`}>
                            <Tag>{totalEntities || 0} entities</Tag>
                        </Tooltip>
                    </UserDefinedReportHeaderContainer>
                </Link>
                {owners && owners.length > 0 && (
                    <AvatarsGroup size={24} owners={owners} entityRegistry={entityRegistry} maxCount={4} />
                )}
            </UserDefinedReportItemContainer>
        </List.Item>
    );
}
