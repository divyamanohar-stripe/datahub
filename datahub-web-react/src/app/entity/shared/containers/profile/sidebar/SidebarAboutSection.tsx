import React from 'react';
import styled from 'styled-components';
import { Button, Typography } from 'antd';
import { LinkOutlined, EditOutlined } from '@ant-design/icons';
import StripMarkdownText from '../../../components/styled/StripMarkdownText';

import { EMPTY_MESSAGES } from '../../../constants';
import { useEntityData, useRefetch, useRouteToTab } from '../../../EntityContext';
import { SidebarHeader } from './SidebarHeader';
import { AddLinkModal } from '../../../components/styled/AddLinkModal';

const DescriptionTypography = styled(Typography.Paragraph)`
    max-width: 65ch;
`;

const SidebarLinkList = styled.div`
    margin-left: -15px;
    min-width: 0;
`;

const SpacedButton = styled(Button)`
    margin-right: 8px;
`;

const LinkButton = styled(Button)`
    display: flex;
    align-items: center;
    min-width: 0;
    > span:not(.anticon) {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        line-height: 1;
    }
`;

function getIcebergLink(entityData): string | undefined {
    if (entityData?.platform?.name !== 'iceberg') {
        return undefined;
    }

    const icebergName = entityData?.name;
    const schemaName = icebergName?.split('.').at(0);
    const tableName = icebergName?.split('.').at(1);
    if (schemaName === undefined || tableName === undefined) {
        return undefined;
    }

    return `https://hubble.corp.stripe.com/viz/dashboards/27644--iceberg-table-information?schema_name=${schemaName}&table_name=${tableName}`;
}

export const SidebarAboutSection = () => {
    const { entityData } = useEntityData();
    const refetch = useRefetch();
    const routeToTab = useRouteToTab();

    const description = entityData?.editableProperties?.description || entityData?.properties?.description;
    const links = entityData?.institutionalMemory?.elements || [];
    const icebergURL = getIcebergLink(entityData);

    const isUntouched = !icebergURL && !description && !(links?.length > 0);

    return (
        <div>
            <SidebarHeader
                title="About"
                actions={
                    !isUntouched && (
                        <Button
                            onClick={() => routeToTab({ tabName: 'Documentation', tabParams: { editing: true } })}
                            type="text"
                            shape="circle"
                        >
                            <EditOutlined />
                        </Button>
                    )
                }
            />
            {isUntouched && (
                <>
                    <Typography.Paragraph type="secondary">
                        {EMPTY_MESSAGES.documentation.title}. {EMPTY_MESSAGES.documentation.description}
                    </Typography.Paragraph>
                    <SpacedButton
                        onClick={() => routeToTab({ tabName: 'Documentation', tabParams: { editing: true } })}
                    >
                        <EditOutlined /> Add Documentation
                    </SpacedButton>
                    <AddLinkModal refetch={refetch} />
                </>
            )}
            {description && (
                <DescriptionTypography>
                    <StripMarkdownText
                        limit={205}
                        readMore={
                            <Typography.Link onClick={() => routeToTab({ tabName: 'Documentation' })}>
                                Read More
                            </Typography.Link>
                        }
                    >
                        {description}
                    </StripMarkdownText>
                </DescriptionTypography>
            )}
            {icebergURL && (
                <DescriptionTypography>
                    <a href={icebergURL} target="_blank" rel="noopener noreferrer">
                        View Iceberg Table Information
                    </a>
                </DescriptionTypography>
            )}
            {links?.length > 0 ? (
                <SidebarLinkList>
                    {(links || []).map((link) => (
                        <LinkButton
                            type="link"
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            key={`${link.label}-${link.url}-${link.author}`}
                        >
                            <LinkOutlined />
                            {link.description || link.label}
                        </LinkButton>
                    ))}
                    <AddLinkModal buttonProps={{ type: 'text' }} refetch={refetch} />
                </SidebarLinkList>
            ) : (
                <SidebarLinkList>
                    {!isUntouched && <AddLinkModal buttonProps={{ type: 'text' }} refetch={refetch} />}
                </SidebarLinkList>
            )}
        </div>
    );
};
