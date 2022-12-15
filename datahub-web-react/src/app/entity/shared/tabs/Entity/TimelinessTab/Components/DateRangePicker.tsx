import React from 'react';
import { PageHeader, Radio, DatePicker, Tooltip, Space } from 'antd';
import moment from 'moment-timezone';
import { InfoCircleTwoTone } from '@ant-design/icons';

const { RangePicker } = DatePicker;

export const DateRangePicker = ({
    logicalBeginningDate,
    logicalEndDate,
    setReportDates,
}: {
    logicalBeginningDate: number;
    logicalEndDate: number;
    setReportDates;
}) => {
    return (
        <PageHeader title="" subTitle="">
            <Space>
                <RangePicker
                    format="YYYY-MM-DD HH:mm"
                    showTime={{
                        format: 'HH:mm',
                    }}
                    defaultValue={[moment.utc(logicalBeginningDate), moment.utc(logicalEndDate)]}
                    onChange={setReportDates}
                />
                <Radio.Button
                    onClick={() =>
                        setReportDates([moment.utc().startOf('day').subtract(7, 'day'), moment.utc().startOf('day')])
                    }
                >
                    View Past Week
                </Radio.Button>
                <Radio.Button
                    onClick={() =>
                        setReportDates([moment.utc().startOf('day').subtract(30, 'day'), moment.utc().startOf('day')])
                    }
                >
                    View Past 30 Days
                </Radio.Button>
                <Tooltip
                    overlayStyle={{ whiteSpace: 'pre-line' }}
                    title="This page only has data as recent as 12-07-2022"
                >
                    <InfoCircleTwoTone />
                </Tooltip>
            </Space>
        </PageHeader>
    );
};
