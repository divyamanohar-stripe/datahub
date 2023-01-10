import React from 'react';
import { Descriptions, Tag } from 'antd';
import { green, red, gold } from '@ant-design/colors';
import moment from 'moment-timezone';
import { convertSecsToHumanReadable, quantile } from '../functions';
import { ExtractedRun } from '../interfaces';

/**
 * Create side SLA miss summary with % met deadline and p90 landing time
 * @param runs list of DataJob run results
 */
export const SLAMissSummary = ({ runs }: { runs: readonly ExtractedRun[] }) => {
    // return color of met deadline tag based on percentage of SLA meets
    function getTagColor(metDeadlinePercentage: number) {
        if (metDeadlinePercentage < 70) return red.primary;
        if (metDeadlinePercentage < 100) return gold.primary;
        return green.primary;
    }

    const metDeadlinePercentage = (
        (runs.filter((r) => {
            if (r?.finishedBySLA) {
                const execDate = moment.utc(r.executionDate);
                const target = moment.utc(execDate).add(r.finishedBySLA, 'seconds');
                // get end date, if no end date is set, use current time
                let endDate = moment.utc();
                if (r?.endDate) {
                    endDate = moment.utc(r.endDate);
                }
                return endDate < target;
            }
            return false;
        }).length /
            runs.length) *
        100.0
    ).toFixed(2);

    const landingTimes = runs.map((r) =>
        r?.endDate ? r.endDate - r.executionDate : new Date().getTime() - r.executionDate,
    );
    const p90Landing = convertSecsToHumanReadable(quantile(landingTimes, 0.9) / 1000.0, false);
    const p80Landing = convertSecsToHumanReadable(quantile(landingTimes, 0.8) / 1000.0, false);

    return (
        <Descriptions title="" bordered size="small" column={{ md: 1 }} style={{ marginLeft: '20px', height: '2px' }}>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="Met Deadline">
                <Tag color={getTagColor(parseFloat(metDeadlinePercentage))}>{metDeadlinePercentage}%</Tag>
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="p90 Delivery">
                {`${p90Landing}`}
            </Descriptions.Item>
            <Descriptions.Item style={{ fontWeight: 'bold' }} label="p80 Delivery">
                {`${p80Landing}`}
            </Descriptions.Item>
        </Descriptions>
    );
};
