import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { useGetUserDefinedReportContentQuery } from '../../../../graphql/userDefinedReport.generated';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';
import { useEntityData } from '../../shared/EntityContext';
import { HistoricalTimelinessUserDefinedReportContent } from './HistoricalTimelinessUserDefinedReportContent';
import { PipelineTimelinessUserDefinedReportContent } from './PipelineTimelinessUserDefinedReportContent';
import { DataJobEntity } from './Types';

//  Styles
const LoadingText = styled.div`
    margin-top: 18px;
    font-size: 12px;
`;

const LoadingContainer = styled.div`
    padding-top: 40px;
    padding-bottom: 40px;
    width: 100%;
    text-align: center;
`;

const loadingPage = (
    <LoadingContainer>
        <LoadingSvg height={80} width={80} />
        <LoadingText>Fetching data...</LoadingText>
    </LoadingContainer>
);

const useSearchParams = () => {
    const history = useHistory();

    const setSearchParam = useCallback(
        (key: string, value: string | undefined, addToHistory = false) => {
            const newParams = new URLSearchParams(history.location.search);
            if (typeof value === 'string') newParams.set(key, value);
            if (value === undefined) newParams.delete(key);
            history[addToHistory ? 'push' : 'replace']({
                ...history.location,
                search: `?${newParams.toString()}`,
            });
        },
        [history],
    );

    const getSearchParam = useCallback(
        (key: string) => new URLSearchParams(history.location.search).get(key),
        [history],
    );

    return {
        setSearchParam,
        getSearchParam,
    };
};

export const UserDefinedReportContentTab = () => {
    const { urn } = useEntityData();
    const [segmentId, setSegmentId] = useState(0);
    const { getSearchParam, setSearchParam } = useSearchParams();

    const maxRunCount = 65;
    const maxEntityCount = 50;
    const { loading: isLoadingUserDefinedReport, data: userDefinedReportContentQueryResponse } =
        useGetUserDefinedReportContentQuery({
            variables: { urn, entityStart: 0, entityCount: maxEntityCount, runStart: 0, runCount: maxRunCount },
        });

    if (isLoadingUserDefinedReport) return loadingPage;

    const userDefinedReportType = userDefinedReportContentQueryResponse?.userDefinedReport?.properties?.type;
    const userDefinedReportName = userDefinedReportContentQueryResponse?.userDefinedReport?.properties?.name;
    const dataJobEntities = userDefinedReportContentQueryResponse?.userDefinedReport?.entities?.searchResults
        ?.filter((e) => {
            return e.entity.type === 'DATA_JOB';
        })
        .map((e) => e.entity) as DataJobEntity[];

    if (userDefinedReportType === 'PIPELINE_TIMELINESS')
        return PipelineTimelinessUserDefinedReportContent(
            userDefinedReportName,
            dataJobEntities,
            segmentId,
            setSegmentId,
            getSearchParam,
            setSearchParam,
        );
    if (userDefinedReportType === 'HISTORICAL_TIMELINESS')
        return HistoricalTimelinessUserDefinedReportContent(dataJobEntities);
    return <>Unsupported user defined report type: {userDefinedReportType}</>;
};
