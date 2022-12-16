import React, { FC, useState } from 'react';
import moment from 'moment-timezone';
import { Switch } from 'antd';
import { grey, blue } from '@ant-design/colors';
import { TopDownstreamTeams } from './Components/TopDownstreamTeams';
import { GroupRunMetrics } from './Components/GroupRunMetrics';
import { ErrorBoundary } from '../../shared/stripe-utils';
import { TeamIncidents } from './Components/IncidentsTable';

interface GroupMetricsPageProps {
    urn: string;
}

export const GroupMetricsPage: FC<GroupMetricsPageProps> = ({ urn }) => {
    const [useDatasetType, setDataType] = useState(false);
    const onSwitchChange = (checked: boolean) => {
        setDataType(checked);
    };
    const initialEndDate = moment.utc().startOf('day').toDate().getTime();
    const initialBeginningDate = moment.utc().startOf('day').subtract(7, 'day').toDate().getTime();
    const [logicalEndDate, setLogicalEndDate] = useState(initialEndDate);
    const [logicalBeginningDate, setLogicalBeginningDate] = useState(initialBeginningDate);

    return (
        <>
            <ErrorBoundary>
                <span
                    style={{
                        marginLeft: '20px',
                        marginTop: '20px',
                        color: useDatasetType ? grey.primary : blue.primary,
                        display: 'inline-block',
                    }}
                >
                    Data Job View
                </span>
                <Switch onChange={onSwitchChange} style={{ marginLeft: '20px', backgroundColor: blue.primary }} />
                <span
                    style={{
                        marginLeft: '20px',
                        marginTop: '20px',
                        color: useDatasetType ? blue.primary : grey.primary,
                        display: 'inline-block',
                    }}
                >
                    Dataset View
                </span>
                <GroupRunMetrics
                    urn={urn}
                    useDatasetType={useDatasetType}
                    logicalBeginningDate={logicalBeginningDate}
                    logicalEndDate={logicalEndDate}
                    setLogicalBeginningDate={setLogicalBeginningDate}
                    setLogicalEndDate={setLogicalEndDate}
                />
            </ErrorBoundary>
            <ErrorBoundary>
                <TeamIncidents urn={urn} logicalBeginningDate={logicalBeginningDate} logicalEndDate={logicalEndDate} />
            </ErrorBoundary>
            <ErrorBoundary>
                <TopDownstreamTeams urn={urn} useDatasetType={useDatasetType} />
            </ErrorBoundary>
        </>
    );
};
