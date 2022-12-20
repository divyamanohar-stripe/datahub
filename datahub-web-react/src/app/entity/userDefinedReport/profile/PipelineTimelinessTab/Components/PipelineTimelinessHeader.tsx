import React from 'react';
import moment from 'moment-timezone';
import { DatePicker, Descriptions, Tooltip } from 'antd';
import { Header } from 'antd/lib/layout/layout';
import { FormattedSegment } from '../interfaces';
import { convertSecsToHumanReadable } from '../../../../shared/stripe-utils';
import { PipelineHeaderStatus } from './PipelineHeaderStatus';
import { DATE_DISPLAY_FORMAT, CLIENT_TZ } from '../constants';

// component for pipeline timeliness page header, includes date picker, pipeline status, current time...etc
export const PipelineTimelinessHeader = ({
    reportDate,
    setReportDate,
    reportName,
    formattedSegments,
    currentTime,
}: {
    reportDate: moment.Moment;
    setReportDate;
    reportName: string;
    formattedSegments: FormattedSegment[];
    currentTime: moment.Moment;
}) => {
    const currentRelativeMoment = `T+${convertSecsToHumanReadable(currentTime.diff(reportDate, 'seconds'))}`;
    let currentRelativeMomentToolTip = `UTC: ${currentTime.format(DATE_DISPLAY_FORMAT)}\n`;
    currentRelativeMomentToolTip += `Local: ${moment.tz(currentTime, CLIENT_TZ).format(DATE_DISPLAY_FORMAT)}`;

    // use last segment to get actual/estimated pipeline landing time
    const lastSegment = formattedSegments[formattedSegments.length - 1];

    return (
        <Header>
            <Descriptions title="" bordered size="small" column={{ md: 4 }}>
                <Descriptions.Item style={{ fontWeight: 'bold' }} label={`${reportName} Execution Date`}>
                    <Tooltip title={`UTC scheduled run of tasks in ${reportName}`}>
                        <DatePicker
                            format="YYYY-MM-DD HH:mm"
                            showTime={{
                                format: 'HH:mm',
                            }}
                            onChange={setReportDate}
                            defaultValue={reportDate}
                        />
                    </Tooltip>
                </Descriptions.Item>
                <Descriptions.Item style={{ fontWeight: 'bold' }} label={`${reportName} Status`}>
                    <PipelineHeaderStatus formattedSegments={formattedSegments} />
                </Descriptions.Item>
                <Descriptions.Item style={{ fontWeight: 'bold' }} label={`${reportName} Landing Time`}>
                    {lastSegment.lastDataJobLandingTime ?? 'Unknown'}
                </Descriptions.Item>
                <Descriptions.Item style={{ fontWeight: 'bold' }} label="Current Time">
                    <Tooltip overlayStyle={{ whiteSpace: 'pre-line' }} title={`${currentRelativeMomentToolTip}`}>
                        {currentRelativeMoment}
                    </Tooltip>
                </Descriptions.Item>
            </Descriptions>
        </Header>
    );
};
