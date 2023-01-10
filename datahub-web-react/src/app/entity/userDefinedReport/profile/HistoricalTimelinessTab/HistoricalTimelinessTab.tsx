import React, { FC, useState } from 'react';
import moment from 'moment-timezone';
import { Descriptions, Layout, DatePicker, Tooltip } from 'antd';
import { HistoricalTimelinessSlaTargetSummary } from './Components/HistoricalTimelinessSlaTargetSummary';
import { useGetHistoricalTimelinessTabDataQuery } from '../../../../../graphql/userDefinedReport.generated';
import { DataProcessInstanceFilterInputType } from '../../../../../types.generated';
import { HistoricalTimelinessGoodDayMetric } from './Components/HistoricalTimelinessGoodDayMetric';
import { getAllExecDates, getDataJobOwnerGroup } from './functions';
import { loadingPage } from '../../../shared/stripe-utils';
import { DataJobEntity } from './interfaces';
import { FormattedDataJobTimelinessPlot } from './Components/FormattedDataJobTimelinessPlot';
import { CompactEntityNameList } from '../../../../recommendations/renderer/component/CompactEntityNameList';
import { useExperiment } from '../../../../experiments/useExperiment';
import { HistoricalTimelinessTabOldVersion } from '../HistoricalTimelinessTabOldVersion/HistoricalTimelinessUserDefinedReportContent';

const { Header } = Layout;
const { RangePicker } = DatePicker;

interface HistoricalTimelinessProps {
    urn: string;
}

const HistoricalTimelinessTab: FC<HistoricalTimelinessProps> = ({ urn }) => {
    const maxRunCount = 1000;
    const maxEntityCount = 50;
    const initialEndDate = moment.utc().startOf('day').toDate().getTime();
    const initialBeginningDate = moment.utc().startOf('day').subtract(100, 'day').toDate().getTime();
    const [logicalEndDate, setLogicalEndDate] = useState(initialEndDate);
    const [logicalBeginningDate, setLogicalBeginningDate] = useState(initialBeginningDate);

    const { loading, data } = useGetHistoricalTimelinessTabDataQuery({
        variables: {
            urn,
            entityStart: 0,
            entityCount: maxEntityCount,
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
                count: maxRunCount,
            },
        },
    });

    if (loading) {
        return loadingPage;
    }

    const dataJobEntities = data?.userDefinedReport?.entities?.searchResults?.map((e) => e.entity) as DataJobEntity[];
    const uniqueExecDates = getAllExecDates(dataJobEntities);
    const dataJobOwnerGrouping = getDataJobOwnerGroup(dataJobEntities);
    const setReportDates = (dates) => {
        setLogicalBeginningDate(dates[0].toDate().getTime());
        setLogicalEndDate(dates[1].toDate().getTime());
    };

    return (
        <>
            <Header style={{ marginBottom: '10px', marginTop: '20px' }}>
                <Descriptions bordered size="small">
                    <Descriptions.Item style={{ fontWeight: 'bold' }} label="Date Range">
                        <Tooltip title="time range of runs to view">
                            <RangePicker
                                format="YYYY-MM-DD HH:mm"
                                showTime={{
                                    format: 'HH:mm',
                                }}
                                defaultValue={[moment.utc(logicalBeginningDate), moment.utc(logicalEndDate)]}
                                onChange={setReportDates}
                            />
                        </Tooltip>
                    </Descriptions.Item>
                </Descriptions>
            </Header>
            <HistoricalTimelinessGoodDayMetric
                dataJobOwnerGrouping={dataJobOwnerGrouping}
                targetRange={{ lowerTarget: 0.7, upperTarget: 0.8 }}
            />
            {Array.from(dataJobOwnerGrouping).map(([owner, dataJobEntitiesList]) => {
                return (
                    <div style={{ marginBottom: '10px', marginTop: '10px' }}>
                        <Descriptions
                            title={owner ? <CompactEntityNameList entities={[owner]} /> : 'Other'}
                            bordered
                            style={{ marginTop: '15px', marginLeft: '15px' }}
                        />
                        <HistoricalTimelinessSlaTargetSummary
                            dataJobEntitiesList={dataJobEntitiesList}
                            targetSlaPercentage={0.9}
                        />
                        <div style={{ paddingLeft: '50px' }}>
                            {dataJobEntitiesList.map((dataJobEntity) => (
                                <FormattedDataJobTimelinessPlot
                                    dataJobEntity={dataJobEntity}
                                    allExecDates={uniqueExecDates}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export const HistoricalTimelinessTabExperiments = ({ urn }: { urn: string }) => {
    const historicalTimelinessTabExperiment = useExperiment('Historical Timeliness Tab V2');
    return historicalTimelinessTabExperiment ? (
        <HistoricalTimelinessTab urn={urn} />
    ) : (
        <HistoricalTimelinessTabOldVersion urn={urn} />
    );
};
