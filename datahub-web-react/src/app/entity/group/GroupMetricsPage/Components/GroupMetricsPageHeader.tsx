import React from 'react';
import { PageHeader, Radio, Tag, Tooltip, DatePicker, Space } from 'antd';
import { InfoCircleTwoTone } from '@ant-design/icons';
import moment from 'moment-timezone';
import { red, green } from '@ant-design/colors';

const { RangePicker } = DatePicker;

export const GroupMetricsPageHeader = ({
    teamSLAPercent,
    logicalBeginningDate,
    logicalEndDate,
    setReportDates,
    useDatasetType,
}: {
    teamSLAPercent: number;
    logicalBeginningDate;
    logicalEndDate;
    setReportDates;
    useDatasetType: boolean;
}) => {
    const color = teamSLAPercent < 95 ? red.primary : green.primary;
    const tag = <Tag color={color}>{teamSLAPercent.toString(10)} %</Tag>;
    const subtitle = <>{tag} over the selected time range</>;
    const dataType = useDatasetType ? 'Datasets' : 'Data Jobs';
    const toolTip = (
        <>
            {`How often did my team's ${dataType} meet SLA? `}
            <Tooltip title={`This metric only uses ${dataType} with SLAs defined`}>
                <InfoCircleTwoTone />
            </Tooltip>
        </>
    );
    return (
        <PageHeader title={toolTip} subTitle={subtitle}>
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
            </Space>
        </PageHeader>
    );
};
