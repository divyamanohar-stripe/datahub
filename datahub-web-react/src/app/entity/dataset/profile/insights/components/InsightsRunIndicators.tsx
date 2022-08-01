/* eslint-disable no-nested-ternary */
import React, { ReactElement } from 'react';
import { Coordinate, Dimensions } from '../utils/types';

export const InsightsRunIndicators = ({
    currentExecutionDate,
    hoverExecutionDate,
    hoverRunUrn,
    runsWithProperties,
    nodeDimensions,
    nodePosition,
    setCurrentExecutionDate,
    setHoverRunUrn,
    setHoverExecutionDate,
}: {
    currentExecutionDate: string | null;
    hoverExecutionDate: string | null;
    hoverRunUrn: string | null;
    runsWithProperties: readonly {
        executionDate: string | null | undefined;
        urn?: string | null | undefined;
        state?: string | null | undefined;
    }[];
    nodeDimensions: Dimensions;
    nodePosition: Coordinate;
    setCurrentExecutionDate: (executionDate: string | null) => void;
    setHoverRunUrn: (urn: string | null) => void;
    setHoverExecutionDate: (executionDate: string | null) => void;
}) => {
    const runDimensions = { width: 10, height: 13 };
    const runMargins = { x: 3, y: 4 };
    const bottomOffset = {
        x: nodePosition.x + nodeDimensions.width - runDimensions.width,
        y: nodePosition.y + nodeDimensions.height,
    };

    const elements: ReactElement[] = [];

    const maxRuns = Math.floor((nodeDimensions.width - runMargins.x) / (runDimensions.width + runMargins.x));
    runsWithProperties.slice(0, maxRuns).forEach((run, ix) => {
        const { urn: runUrn, executionDate } = run;

        if (!runUrn || !executionDate) return;

        const strokeColor =
            executionDate === currentExecutionDate
                ? '#333333'
                : executionDate === hoverExecutionDate
                ? '#5153ad'
                : 'transparent';

        const color = { running: '#a74ab5', success: '#588fe8' }[run.state ?? ''] ?? '#aaaaaa';

        const runOffset = {
            x: bottomOffset.x - (runMargins.x + runDimensions.width) * ix,
            y: bottomOffset.y + runMargins.y,
        };
        elements.push(
            /* TASK RUN INDICATOR BOXES */
            <rect
                key={`run-indicator-${runUrn}`}
                onMouseDown={() => {
                    console.info(`Updating executionDate=${executionDate}`);
                    setCurrentExecutionDate(executionDate);
                }}
                onMouseOver={() => {
                    setHoverRunUrn(runUrn);
                    setHoverExecutionDate(executionDate);
                }}
                onMouseOut={() => {
                    setHoverRunUrn(null);
                    setHoverExecutionDate(null);
                }}
                {...runOffset}
                {...runDimensions}
                fill={color}
                stroke={strokeColor}
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
            />,
        );

        if (runUrn === hoverRunUrn) {
            const formattedExecutionDate = executionDate.replace('T', ' ').replace(/\+.*/, '').replace('00:00:00', '');
            elements.push(
                <text
                    key="run-indicator-hover"
                    textAnchor="start"
                    x={runOffset.x + 20}
                    y={runOffset.y + runDimensions.height + 15}
                    fill="#333333"
                >
                    {formattedExecutionDate}
                </text>,
            );
        }
    });

    return <g>{elements}</g>;
};
