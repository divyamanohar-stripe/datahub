import { PlusOutlined } from '@ant-design/icons';
import { Button, Empty, List, message, Pagination, Typography } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useListUserDefinedReportsQuery } from '../../graphql/userDefinedReport.generated';
import { UserDefinedReport } from '../../types.generated';
import TabToolbar from '../entity/shared/components/styled/TabToolbar';
import { Message } from '../shared/Message';
import CreateUserDefinedReportModal from './CreateUserDefinedReportModal';
import UserDefinedReportListItem from './UserDefinedReportListItem';

const UserDefinedReportsContainer = styled.div``;

const UserDefinedReportsStyledList = styled(List)`
    &&& {
        width: 100%;
        border-color: ${(props) => props.theme.styles['border-color-base']};
    }
`;

const UserDefinedReportsPaginationContainer = styled.div`
    display: flex;
    justify-content: center;
    padding: 12px;
    padding-left: 16px;
    border-bottom: 1px solid;
    border-color: ${(props) => props.theme.styles['border-color-base']};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const PaginationInfo = styled(Typography.Text)`
    padding: 0px;
`;

const DEFAULT_PAGE_SIZE = 25;

export const UserDefinedReportsList = () => {
    const [page, setPage] = useState(1);
    const [isCreatingUserDefinedReport, setIsCreatingUserDefinedReport] = useState(false);

    const pageSize = DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;

    const { loading, error, data, refetch } = useListUserDefinedReportsQuery({
        variables: {
            input: {
                start,
                count: pageSize,
            },
        },
        fetchPolicy: 'no-cache',
    });

    const totalUserDefinedReports = data?.listUserDefinedReports?.total || 0;
    const lastResultIndex = start + pageSize > totalUserDefinedReports ? totalUserDefinedReports : start + pageSize;
    const userDefinedReports = (data?.listUserDefinedReports?.userDefinedReports || []).sort(
        (a, b) => (b.entities?.total || 0) - (a.entities?.total || 0),
    );

    const onChangePage = (newPage: number) => {
        setPage(newPage);
    };

    // TODO: Handle robust deleting of user defined reports.

    return (
        <>
            {!data && loading && <Message type="loading" content="Loading user defined reports..." />}
            {error &&
                message.error({
                    content: `Failed to load user defined reports: \n ${error.message || ''}`,
                    duration: 3,
                })}
            <UserDefinedReportsContainer>
                <TabToolbar>
                    <div>
                        <Button type="text" onClick={() => setIsCreatingUserDefinedReport(true)}>
                            <PlusOutlined /> New User Defined Report
                        </Button>
                    </div>
                </TabToolbar>
                <UserDefinedReportsStyledList
                    bordered
                    locale={{
                        emptyText: (
                            <Empty description="No User Defined Reports!" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ),
                    }}
                    dataSource={userDefinedReports}
                    renderItem={(item: any) => (
                        <UserDefinedReportListItem userDefinedReport={item as UserDefinedReport} />
                    )}
                />
                <UserDefinedReportsPaginationContainer>
                    <PaginationInfo>
                        <b>
                            {lastResultIndex > 0 ? (page - 1) * pageSize + 1 : 0} - {lastResultIndex}
                        </b>{' '}
                        of <b>{totalUserDefinedReports}</b>
                    </PaginationInfo>
                    <Pagination
                        current={page}
                        pageSize={pageSize}
                        total={totalUserDefinedReports}
                        showLessItems
                        onChange={onChangePage}
                        showSizeChanger={false}
                    />
                    <span />
                </UserDefinedReportsPaginationContainer>
                <CreateUserDefinedReportModal
                    visible={isCreatingUserDefinedReport}
                    onClose={() => setIsCreatingUserDefinedReport(false)}
                    onCreate={() => {
                        // Hack to deal with eventual consistency.
                        setTimeout(function f() {
                            refetch?.();
                        }, 2000);
                    }}
                />
            </UserDefinedReportsContainer>
        </>
    );
};
