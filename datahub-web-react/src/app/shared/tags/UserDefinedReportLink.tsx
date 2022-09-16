import { Tag } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { EntityType } from '../../../types.generated';
import { IconStyleType } from '../../entity/Entity';
import { useEntityRegistry } from '../../useEntityRegistry';

const UserDefinedReportLinkContainer = styled(Link)`
    display: inline-block;
    margin-bottom: 8px;
`;

export type Props = {
    urn: string;
    name: string;
    closable?: boolean;
    onClose?: (e: any) => void;
    tagStyle?: any | undefined;
};

export const UserDefinedReportLink = ({ urn, name, closable, onClose, tagStyle }: Props): JSX.Element => {
    const entityRegistry = useEntityRegistry();
    return (
        <UserDefinedReportLinkContainer to={entityRegistry.getEntityUrl(EntityType.UserDefinedReport, urn)}>
            <Tag style={tagStyle} closable={closable} onClose={onClose}>
                <span style={{ paddingRight: '4px' }}>
                    {entityRegistry.getIcon(EntityType.UserDefinedReport, 10, IconStyleType.ACCENT)}
                </span>
                {name}
            </Tag>
        </UserDefinedReportLinkContainer>
    );
};
