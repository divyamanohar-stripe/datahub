import React from 'react';
import { Line } from '@ant-design/plots';
import { blue, red } from '@ant-design/colors';

/**
 * create SLA miss line chart that displays percent of SLA misses over all runs per day
 * @param data
 */
export const SLALineChart = ({ data }: { data }) => {
    // setting SLA target as 95%
    function getAnnotations() {
        const annotations: any[] = [];
        annotations.push({
            type: 'regionFilter',
            start: ['min', 95],
            end: ['max', 0],
            color: red.primary,
        });
        annotations.push({
            type: 'line',
            start: ['start', 95] as [string, number],
            end: ['end', 95] as [string, number],
            style: {
                stroke: red.primary,
                lineDash: [2, 2],
            },
        });
        annotations.push({
            type: 'text',
            position: ['max', 95] as [string, number],
            content: 'Target',
            offsetX: -50,
            offsetY: 5,
            style: { textBaseline: 'top' as const },
        });
        return annotations;
    }
    const config = {
        data,
        xField: 'date',
        yField: 'value',
        xAxis: {
            title: {
                text: 'Date',
            },
            tickCount: 5,
        },
        yAxis: {
            title: {
                text: 'Percentage Met SLA',
            },
        },
        annotations: getAnnotations(),
        point: {
            size: 2.5,
            shape: 'circle',
            style: {
                fill: blue.primary,
                stroke: blue.primary,
                lineWidth: 2,
            },
        },
    };
    return <Line style={{ marginLeft: '20px', marginRight: '30px' }} {...config} />;
};
