import { Button, Form, message, Modal, Select, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useGetSearchResultsLazyQuery } from '../../../../../../../graphql/search.generated';
import { EntityType, SearchResult } from '../../../../../../../types.generated';
import { useAddUserDefinedReportMutation } from '../../../../../../../graphql/mutations.generated';
import { useEntityRegistry } from '../../../../../../useEntityRegistry';
import { useEntityData } from '../../../../EntityContext';
import { useEnterKeyListener } from '../../../../../../shared/useEnterKeyListener';

type Props = {
    visible: boolean;
    onClose: () => void;
    refetch?: () => Promise<any>;
};

const SearchResultContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
`;

const SearchResultContent = styled.div`
    display: flex;
    justify-content: start;
    align-items: center;
`;

const SearchResultDisplayName = styled.div`
    margin-left: 12px;
`;

type SelectedUserDefinedReport = {
    displayName: string;
    type: EntityType;
    urn: string;
};

export const AddUserDefinedReportModal = ({ visible, onClose, refetch }: Props) => {
    const entityRegistry = useEntityRegistry();
    const { urn } = useEntityData();
    const [selectedUserDefinedReport, setSelectedUserDefinedReport] = useState<SelectedUserDefinedReport | undefined>(
        undefined,
    );
    const [userDefinedReportSearch, { data: userDefinedReportSearchData }] = useGetSearchResultsLazyQuery();
    const userDefinedReportSearchResults = userDefinedReportSearchData?.search?.searchResults || [];
    const [addUserDefinedReportMutation] = useAddUserDefinedReportMutation();

    const inputEl = useRef(null);

    const onOk = async () => {
        if (!selectedUserDefinedReport) {
            return;
        }
        try {
            await addUserDefinedReportMutation({
                variables: {
                    entityUrn: urn,
                    userDefinedReportUrn: selectedUserDefinedReport.urn,
                },
            });
            message.success({ content: 'Updated user defined report!', duration: 2 });
        } catch (e: unknown) {
            message.destroy();
            if (e instanceof Error) {
                message.error({ content: `Failed to set user defined report: \n ${e.message || ''}`, duration: 3 });
            }
        }
        setSelectedUserDefinedReport(undefined);
        refetch?.();
        onClose();
    };

    const onSelectUserDefinedReport = (newUrn: string) => {
        if (inputEl && inputEl.current) {
            (inputEl.current as any).blur();
        }
        const filteredUserDefinedReports =
            userDefinedReportSearchResults
                ?.filter((result) => result.entity.urn === newUrn)
                .map((result) => result.entity) || [];
        if (filteredUserDefinedReports.length) {
            const userDefinedReport = filteredUserDefinedReports[0];
            setSelectedUserDefinedReport({
                displayName: entityRegistry.getDisplayName(EntityType.UserDefinedReport, userDefinedReport),
                type: EntityType.UserDefinedReport,
                urn: newUrn,
            });
        }
    };

    const handleSearch = (text: string) => {
        if (text.length > 2) {
            userDefinedReportSearch({
                variables: {
                    input: {
                        type: EntityType.UserDefinedReport,
                        query: text,
                        start: 0,
                        count: 5,
                    },
                },
            });
        }
    };

    // Handle the Enter press
    useEnterKeyListener({
        querySelectorToExecuteClick: '#addUserDefinedReportButton',
    });

    const renderSearchResult = (result: SearchResult) => {
        const displayName = entityRegistry.getDisplayName(result.entity.type, result.entity);
        return (
            <SearchResultContainer>
                <SearchResultContent>
                    <SearchResultDisplayName>
                        <div>{displayName}</div>
                    </SearchResultDisplayName>
                </SearchResultContent>
                <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to={() => `/${entityRegistry.getPathName(result.entity.type)}/${result.entity.urn}`}
                >
                    View
                </Link>{' '}
            </SearchResultContainer>
        );
    };

    const selectValue = (selectedUserDefinedReport && [selectedUserDefinedReport?.displayName]) || [];

    return (
        <Modal
            title="Add User Defined Report"
            visible={visible}
            onCancel={onClose}
            footer={
                <>
                    <Button onClick={onClose} type="text">
                        Cancel
                    </Button>
                    <Button
                        id="addUserDefinedReportButton"
                        disabled={selectedUserDefinedReport === undefined}
                        onClick={onOk}
                    >
                        Add
                    </Button>
                </>
            }
        >
            <Form component={false}>
                <Form.Item>
                    <Select
                        autoFocus
                        value={selectValue}
                        mode="multiple"
                        ref={inputEl}
                        placeholder="Search for user defined reports..."
                        onSelect={(userDefinedReportUrn: any) => onSelectUserDefinedReport(userDefinedReportUrn)}
                        onDeselect={() => setSelectedUserDefinedReport(undefined)}
                        onSearch={handleSearch}
                        filterOption={false}
                        tagRender={(tagProps) => <Tag>{tagProps.value}</Tag>}
                    >
                        {userDefinedReportSearchResults.map((result) => {
                            return (
                                <Select.Option value={result.entity.urn}>{renderSearchResult(result)}</Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};
