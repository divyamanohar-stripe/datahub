import React, { useState } from 'react';
import moment from 'moment-timezone';
import { Layout } from 'antd';
import { DataJobEntity, FormattedDataJob, FormattedSegment } from './interfaces';
import { getFormattedDataJobs, getFormattedSegments, useSearchParams } from './functions';
import { DATE_SEARCH_PARAM_FORMAT } from './constants';
import { PipelineTimelinessHeader } from './Components/PipelineTimelinessHeader';
import { SegmentContent } from './Components/SegmentContent';
import { SegmentTimeline } from './Components/SegmentTimeline';
import { useGetPipelineTimelinessTabDataQuery } from '../../../../../graphql/userDefinedReport.generated';
import { DataProcessInstanceFilterInputType } from '../../../../../types.generated';
import { ErrorBoundary, loadingPage } from '../../../shared/stripe-utils';

// main component for PipelineTimeliness Tab, shows status of jobs in pipeline on the UserDefinedReport entity
export const PipelineTimelinessTab = ({ urn }: { urn: string }) => {
    const initialEndDate = moment.utc().startOf('day').toDate().getTime();
    const [logicalDate, setLogicalDate] = useState(initialEndDate);
    const [segmentId, setSegmentId] = useState(0);
    const { getSearchParam, setSearchParam } = useSearchParams();
    const currentTime = moment.utc();

    const { data, loading } = useGetPipelineTimelinessTabDataQuery({
        variables: {
            urn,
            input: {
                start: 0,
                count: 50,
                filters: [
                    { type: DataProcessInstanceFilterInputType.BeforeLogicalDate, value: logicalDate.toString(10) },
                ],
            },
        },
    });

    if (loading) {
        return loadingPage;
    }

    const getReportDate = (): moment.Moment => {
        const reportParam = getSearchParam('reportDate');
        if (reportParam === null || !moment(reportParam, DATE_SEARCH_PARAM_FORMAT, true).isValid()) {
            const newReportParam = moment.utc().startOf('day').format(DATE_SEARCH_PARAM_FORMAT);
            setSearchParam('reportDate', newReportParam);
            setLogicalDate(moment(newReportParam).toDate().getTime());
            return moment(newReportParam);
        }
        return moment.utc(reportParam);
    };
    const reportDate = getReportDate();
    const setReportDate = (newReportDate: moment.Moment) => {
        setSearchParam('reportDate', newReportDate.format(DATE_SEARCH_PARAM_FORMAT));
        setLogicalDate(newReportDate.toDate().getTime());
    };

    const dataJobs = data?.userDefinedReport?.entities?.searchResults?.map((ent) => ent.entity) as DataJobEntity[];
    const reportName = data?.userDefinedReport?.properties?.name ?? '';

    const formattedDataJobs: FormattedDataJob[] = getFormattedDataJobs(dataJobs, reportName, reportDate);
    const formattedSegments: FormattedSegment[] = getFormattedSegments(formattedDataJobs, reportDate);

    return (
        <ErrorBoundary>
            <Layout>
                <PipelineTimelinessHeader
                    reportDate={reportDate}
                    setReportDate={setReportDate}
                    reportName={reportName}
                    formattedSegments={formattedSegments}
                    currentTime={currentTime}
                />
                <Layout>
                    <SegmentTimeline segments={formattedSegments} setSegmentId={setSegmentId} />
                    <SegmentContent reportDate={reportDate} segments={formattedSegments} segmentId={segmentId} />
                </Layout>
            </Layout>
        </ErrorBoundary>
    );
};
