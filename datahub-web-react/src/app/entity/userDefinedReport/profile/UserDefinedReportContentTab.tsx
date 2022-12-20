import React from 'react';
import { useGetUserDefinedReportContentTypeQuery } from '../../../../graphql/userDefinedReport.generated';
import { useEntityData } from '../../shared/EntityContext';
import { HistoricalTimelinessComponent } from './HistoricalTimelinessUserDefinedReportContent';
import { PipelineTimelinessTab } from './PipelineTimelinessTab/PipelineTimelinessTab';
import { loadingPage } from './SharedContent';

export const UserDefinedReportContentTab = () => {
    const { urn } = useEntityData();

    const { loading: isLoadingUserDefinedReport, data: userDefinedReportContentQueryResponse } =
        useGetUserDefinedReportContentTypeQuery({ variables: { urn } });

    if (isLoadingUserDefinedReport) return loadingPage;

    const userDefinedReportType = userDefinedReportContentQueryResponse?.userDefinedReport?.properties?.type;

    if (userDefinedReportType === 'PIPELINE_TIMELINESS') return <PipelineTimelinessTab urn={urn} />;
    if (userDefinedReportType === 'HISTORICAL_TIMELINESS') return <HistoricalTimelinessComponent urn={urn} />;
    return <>Unsupported user defined report type: {userDefinedReportType}</>;
};
