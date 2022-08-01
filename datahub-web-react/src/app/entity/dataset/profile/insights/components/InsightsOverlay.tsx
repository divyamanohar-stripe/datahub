import * as React from 'react';

export const InsightsOverlay = ({ currentExecutionDate }: { currentExecutionDate: string | null }) => {
    let message: React.ReactElement;
    if (currentExecutionDate) {
        message = (
            <text
                x={10}
                y={40}
                fontSize="14pt"
                fill="#333333"
                fillOpacity={0.5}
                fontWeight="bold"
                style={{ userSelect: 'none' }}
            >
                Viewing execution date:{' '}
                {currentExecutionDate.replace('T', ' ').replace('+00:00', '').replace('00:00:00', '')}
            </text>
        );
    } else {
        message = (
            <text x={10} y={40} fontSize="14pt" fill="#333333" fillOpacity={0.5} style={{ userSelect: 'none' }}>
                No execution date selected—click on a run below a job to see insights for that job&apos;s execution
                date.
            </text>
        );
    }

    return <g>{message}</g>;
};
