import React from 'react';
import { Tag } from 'antd';
import { blue, red } from '@ant-design/colors';
import { FormattedSegment, SegmentState } from '../interfaces';

function getPipelineHeaderStatusTagColor(formattedSegments: FormattedSegment[]) {
    if (formattedSegments.some((segment) => segment.runState === SegmentState.FAILURE || segment.missedSLA)) {
        return red.primary;
    }
    return blue.primary;
}

// component for getting the status of the pipeline based on states of all segments
export const PipelineHeaderStatus = ({ formattedSegments }: { formattedSegments: FormattedSegment[] }) => {
    let pipelineHeaderStatusText;
    if (formattedSegments.some((segment) => segment.runState === SegmentState.RUNNING)) {
        pipelineHeaderStatusText = SegmentState.RUNNING;
    } else if (formattedSegments.some((segment) => segment.runState === SegmentState.FAILURE)) {
        pipelineHeaderStatusText = SegmentState.FAILURE;
    } else if (formattedSegments.every((segment) => segment.runState === SegmentState.COMPLETED)) {
        pipelineHeaderStatusText = SegmentState.COMPLETED;
    } else if (formattedSegments.every((segment) => segment.runState === SegmentState.NOT_STARTED)) {
        pipelineHeaderStatusText = SegmentState.NOT_STARTED;
    } else {
        pipelineHeaderStatusText = SegmentState.RUNNING;
    }
    return <Tag color={getPipelineHeaderStatusTagColor(formattedSegments)}>{pipelineHeaderStatusText}</Tag>;
};
