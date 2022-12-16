import React, { FC } from 'react';
import { PageHeader } from 'antd';
import { DataProcessInstanceFilterInputType, EntityType } from '../../../../../types.generated';
import { useGetGroupRunMetricsQuery } from '../../../../../graphql/groupMetrics.generated';
import { loadingPage } from '../../../userDefinedReport/profile/SharedContent';
import { SLALineChart } from './SLALineChart';
import { GroupMetricsPageHeader } from './GroupMetricsPageHeader';
import { getRunMetrics } from '../functions';
import { DataEntity } from '../interfaces';
import { SLAMissTable } from './SLAMissTable';

interface GroupRunMetricsProps {
    urn: string;
    useDatasetType: boolean;
    logicalBeginningDate: number;
    logicalEndDate: number;
    setLogicalBeginningDate;
    setLogicalEndDate;
}
export const GroupRunMetrics: FC<GroupRunMetricsProps> = ({
    urn,
    useDatasetType,
    logicalBeginningDate,
    logicalEndDate,
    setLogicalBeginningDate,
    setLogicalEndDate,
}) => {
    const maxEntityCount = 1000;
    const maxRunCount = 1000;

    const setReportDates = (dates) => {
        setLogicalBeginningDate(dates[0].toDate().getTime());
        setLogicalEndDate(dates[1].toDate().getTime());
    };
    const types = useDatasetType ? [EntityType.Dataset] : [EntityType.DataJob];

    const { data, loading } = useGetGroupRunMetricsQuery({
        variables: {
            input: {
                query: '*',
                filters: [
                    { field: 'owners', value: urn },
                    { field: 'slaDefined', value: 'true' },
                ],
                types,
                start: 0,
                count: maxEntityCount,
            },
            runInput: {
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
                count: maxRunCount,
            },
        },
    });

    if (loading) {
        return loadingPage;
    }

    const dataEntities = data?.searchAcrossEntities?.searchResults?.map((e) => e.entity) as DataEntity[];

    const runSLAData = getRunMetrics(dataEntities);

    const chartData = runSLAData[0];
    const teamSLAPercent: number = runSLAData[1];
    const missedSLADataEnts = runSLAData[2];

    return (
        <>
            <GroupMetricsPageHeader
                teamSLAPercent={teamSLAPercent}
                logicalBeginningDate={logicalBeginningDate}
                logicalEndDate={logicalEndDate}
                setReportDates={setReportDates}
                useDatasetType={useDatasetType}
            />
            <SLALineChart data={chartData} />
            <PageHeader title="Recent SLA Misses" />
            <SLAMissTable data={missedSLADataEnts} useDatasetType={useDatasetType} />
        </>
    );
};
