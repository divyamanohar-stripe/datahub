/*
 * [STRIPE_CONTRIBUTION]
 */
import { Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { SearchablePage } from '../search/SearchablePage';
import { UserDefinedReportsList } from './UserDefinedReportsList';

const PageContainer = styled.div`
    padding-top: 20px;
`;

const PageHeaderContainer = styled.div`
    && {
        padding-left: 24px;
    }
`;

const PageTitle = styled(Typography.Title)`
    && {
        margin-bottom: 12px;
    }
`;

const ListContainer = styled.div``;

export const ManageUserDefinedReportsPage = () => {
    return (
        <SearchablePage>
            <PageContainer>
                <PageHeaderContainer>
                    <PageTitle level={3}>User Defined Reports</PageTitle>
                    <Typography.Paragraph type="secondary">
                        View your DataHub user defined reports. Take administrative actions.
                    </Typography.Paragraph>
                </PageHeaderContainer>
                <ListContainer>
                    <UserDefinedReportsList />
                </ListContainer>
            </PageContainer>
        </SearchablePage>
    );
};
