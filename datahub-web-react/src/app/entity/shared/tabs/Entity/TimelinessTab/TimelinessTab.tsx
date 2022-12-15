import React, { useState } from 'react';
import moment from 'moment-timezone';
import { DateRangePicker } from './Components/DateRangePicker';
import { SLADataTable } from './Components/SLADataTable';
import { formatRuns } from './functions';
import { DataRunEntity } from './interfaces';
import { useGetDataRunsTimelinessQuery } from '../../../../../../graphql/timeliness.generated';
import { DataProcessInstanceFilterInputType, EntityType, SlaInfo } from '../../../../../../types.generated';
import { ErrorBoundary, loadingPage } from '../../../stripe-utils';
import { TimelinessPlot } from './Components/TimelinessPlot';
import { useEntityData } from '../../../EntityContext';

export const TimelinessTab = () => {
    const { urn, entityType } = useEntityData();
    const initialEndDate = moment.utc().startOf('day').toDate().getTime();
    const initialBeginningDate = moment.utc().startOf('day').subtract(7, 'day').toDate().getTime();
    const [logicalEndDate, setLogicalEndDate] = useState(initialEndDate);
    const [logicalBeginningDate, setLogicalBeginningDate] = useState(initialBeginningDate);

    const setReportDates = (dates) => {
        setLogicalBeginningDate(dates[0].toDate().getTime());
        setLogicalEndDate(dates[1].toDate().getTime());
    };

    const { data, loading } = useGetDataRunsTimelinessQuery({
        variables: {
            urn,
            input: {
                filters: [
                    {
                        type: DataProcessInstanceFilterInputType.AfterLogicalDate,
                        value: logicalBeginningDate.toString(10),
                    },
                    {
                        type: DataProcessInstanceFilterInputType.BeforeLogicalDate,
                        value: logicalEndDate.toString(10),
                    },
                ],
                start: 0,
                count: 1000,
            },
        },
    });

    if (loading) {
        return loadingPage;
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // Do not want to change rendering behavior at current time, would need rewrite.
    const dataIdx = entityType === EntityType.Dataset ? 'dataset' : 'dataJob';
    if (!data || !data[dataIdx] || !data[dataIdx]?.runs?.runs) {
        return <>No data to display!</>;
    }
    const runs = formatRuns(data[dataIdx]!.runs?.runs?.map((r) => r) as DataRunEntity[]);
    const latestSLAInfo: SlaInfo | undefined = data[dataIdx]?.slaInfo ?? undefined;

    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (runs.length === 0) {
        return <>No runs to display!</>;
    }

    return (
        <ErrorBoundary>
            <DateRangePicker
                logicalBeginningDate={logicalBeginningDate}
                logicalEndDate={logicalEndDate}
                setReportDates={setReportDates}
            />
            <SLADataTable runs={runs} latestSLAInfo={latestSLAInfo} />
            <TimelinessPlot runs={runs} />
        </ErrorBoundary>
    );
};
