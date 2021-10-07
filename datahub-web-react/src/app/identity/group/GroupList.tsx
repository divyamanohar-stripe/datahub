import React, { useState } from 'react';
import { Button, Empty, List, message, Pagination } from 'antd';
import styled from 'styled-components';
import { UsergroupAddOutlined } from '@ant-design/icons';
import { CorpGroup } from '../../../types.generated';
import { Message } from '../../shared/Message';
import { useListGroupsQuery } from '../../../graphql/group.generated';
import GroupListItem from './GroupListItem';
import TabToolbar from '../../entity/shared/components/styled/TabToolbar';
import CreateGroupModal from './CreateGroupModal';

const GroupContainer = styled.div``;

const GroupStyledList = styled(List)`
    &&& {
        width: 100%;
        border-color: ${(props) => props.theme.styles['border-color-base']};
    }
`;

const GroupPaginationContainer = styled.div`
    display: flex;
    justify-content: center;
`;

const DEFAULT_PAGE_SIZE = 25;

export const GroupList = () => {
    const [page, setPage] = useState(1);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [removedUrns, setRemovedUrns] = useState<string[]>([]);

    // Policy list paging.
    const pageSize = DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;

    const { loading, error, data, refetch } = useListGroupsQuery({
        variables: {
            input: {
                start,
                count: pageSize,
            },
        },
        fetchPolicy: 'no-cache',
    });

    const totalGroups = data?.listGroups?.total || 0;
    const groups = data?.listGroups?.groups || [];
    const filteredGroups = groups.filter((group) => !removedUrns.includes(group.urn));

    const onChangePage = (newPage: number) => {
        setPage(newPage);
    };

    const handleDelete = (urn: string) => {
        // Hack to deal with eventual consistency.
        const newRemovedUrns = [...removedUrns, urn];
        setRemovedUrns(newRemovedUrns);
        setTimeout(function () {
            refetch?.();
        }, 3000);
    };

    return (
        <>
            {!data && loading && <Message type="loading" content="Loading groups..." />}
            {error && message.error('Failed to load groups :(')}
            <GroupContainer>
                <TabToolbar>
                    <div>
                        <Button type="text" onClick={() => setIsCreatingGroup(true)}>
                            <UsergroupAddOutlined /> Create group
                        </Button>
                    </div>
                </TabToolbar>
                <GroupStyledList
                    bordered
                    locale={{
                        emptyText: <Empty description="No Groups!" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                    }}
                    dataSource={filteredGroups}
                    renderItem={(item: any) => (
                        <GroupListItem onDelete={() => handleDelete(item.urn)} group={item as CorpGroup} />
                    )}
                />
                <GroupPaginationContainer>
                    <Pagination
                        style={{ margin: 40 }}
                        current={page}
                        pageSize={pageSize}
                        total={totalGroups}
                        showLessItems
                        onChange={onChangePage}
                        showSizeChanger={false}
                    />
                </GroupPaginationContainer>
                <CreateGroupModal
                    visible={isCreatingGroup}
                    onClose={() => setIsCreatingGroup(false)}
                    onCreate={() => {
                        // Hack to deal with eventual consistency.
                        setTimeout(function () {
                            refetch?.();
                        }, 2000);
                    }}
                />
            </GroupContainer>
        </>
    );
};
