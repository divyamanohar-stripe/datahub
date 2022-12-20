import React from 'react';
import { Layout, Steps } from 'antd';
import { FormattedSegment, SegmentState } from '../interfaces';

const { Step } = Steps;
const { Sider } = Layout;

// get status of step
function getSegmentStepStatus(segment: FormattedSegment): 'error' | 'process' | 'finish' | 'wait' {
    if (segment.runState === SegmentState.FAILURE || segment.missedSLA) return 'error';
    if (segment.runState === SegmentState.COMPLETED) {
        return 'finish';
    }
    if (segment.runState === SegmentState.NOT_STARTED) return 'wait';

    // else we are in the SegmentState.RUNNING state
    return 'process';
}

// get steps for segments
function getSegmentTimelineStep(segment: FormattedSegment) {
    return (
        <Step
            title={segment.name}
            subTitle={segment.runState}
            description={segment.lastDataJobLandingTime}
            status={getSegmentStepStatus(segment)}
        />
    );
}

// main component for vertical segments timeline
export const SegmentTimeline = ({ segments, setSegmentId }: { segments: FormattedSegment[]; setSegmentId }) => {
    return (
        <Sider
            width={260}
            style={{
                overflow: 'auto',
                height: 700,
                position: 'fixed',
                marginLeft: 30,
            }}
        >
            <Steps direction="vertical" progressDot current={-1} onChange={setSegmentId} size="small">
                {segments.map(getSegmentTimelineStep)}
            </Steps>
        </Sider>
    );
};
