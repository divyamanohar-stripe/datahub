import React from 'react';
import { Layout } from 'antd';
import { DataJobEntity } from '../interfaces';
import { DataJobPlotHeader } from './DataJobPlotHeader';
import { SLAMissSummary } from './SLAMissSummary';
import { TimelinessPlot } from './TimelinessPlot';
import { extractDataJobFromEntity } from '../data-conversion';

const { Header, Content, Sider } = Layout;

/**
 * Create DataJobProperties & RunProperties from dataJob query result and render layout
 * @param dataJobEntity DataJob query result
 * @param allExecDates list of unique execution dates to line up timeliness x-axis across charts
 */
export const FormattedDataJobTimelinessPlot = ({
    dataJobEntity,
    allExecDates,
}: {
    dataJobEntity: DataJobEntity;
    allExecDates: any[];
}) => {
    const { latestRuns } = extractDataJobFromEntity(dataJobEntity);

    return (
        <>
            <Layout>
                <Header>
                    <DataJobPlotHeader dataJobEntity={dataJobEntity} />
                </Header>
                <Layout>
                    <Sider>
                        <SLAMissSummary runs={latestRuns} />
                    </Sider>
                    <Content>
                        <TimelinessPlot runs={latestRuns} allExecDates={allExecDates} />
                    </Content>
                </Layout>
            </Layout>
        </>
    );
};
