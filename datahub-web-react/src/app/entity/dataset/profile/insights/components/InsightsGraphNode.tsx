import moment from 'moment';
import * as React from 'react';
import { ReactElement } from 'react';
import { Coordinate, Dimensions } from '../utils/types';

export const InsightsGraphNode = ({
    entityUrn,
    currentExecutionDate,
    startedBySla,
    finishedBySla,
    nodeDimensions,
    nodePosition,
    runsWithProperties,
    setHoverEntityUrn,
}: {
    entityUrn: string;
    currentExecutionDate: string | null;
    startedBySla: number | null | undefined;
    finishedBySla: number | null | undefined;
    nodeDimensions: Dimensions;
    nodePosition: Coordinate;
    runsWithProperties: readonly {
        readonly executionDate?: string | null | undefined;
        readonly offsetStartDuration: moment.Duration;
        readonly offsetEndDuration: moment.Duration;
    }[];
    setHoverEntityUrn: (urn: string | null) => void;
}) => {
    let simpleName = entityUrn;
    {
        const pattern = /urn:li:dataJob:\(urn:li:dataFlow:\(airflow,([^,]+),PROD\),([^)]+)\)/;
        const match = pattern.exec(entityUrn);
        if (match) {
            simpleName = `job.${match[1]}.${match[2]}`;
        }
    }
    {
        const pattern = /urn:li:dataset:\(urn:li:dataPlatform:iceberg,([^,]+),PROD\)/;
        const match = pattern.exec(entityUrn);
        if (match) {
            simpleName = `iceberg.${match[1]}`;
        }
    }
    {
        const pattern = /urn:li:dataset:\(urn:li:dataPlatform:s3,([,]+),PROD\)/;
        const match = pattern.exec(entityUrn);
        if (match) {
            simpleName = `s3.${match[1]}`;
        }
    }

    if (simpleName !== entityUrn) {
        simpleName = simpleName.replace(/\./g, '\n');
    }

    const elements: ReactElement[] = [];

    elements.push(
        <rect
            key="entity-node-box"
            {...nodePosition}
            {...nodeDimensions}
            onMouseOver={() => setHoverEntityUrn(entityUrn)}
            onMouseOut={() => setHoverEntityUrn(null)}
            fill="#eeeeee"
            fillOpacity={0.9}
        />,
    );

    const nameParts = simpleName.split('\n');
    nameParts.forEach((part, ix) => {
        elements.push(
            <text
                // eslint-disable-next-line react/no-array-index-key
                key={`entity-name-${ix}`}
                x={nodePosition.x + 5}
                y={nodePosition.y + 15 * ix + 35}
                fill={ix === nameParts.length - 1 ? '#333333' : '#888888'}
                fontWeight={ix === 0 ? 'bold' : 'default'}
                fontSize={ix === nameParts.length - 1 ? '120%' : 'default'}
                style={{ userSelect: 'none' }}
                pointerEvents="none"
            >
                {part}
            </text>,
        );
    });

    if (startedBySla) {
        const hours = moment.duration(startedBySla, 'seconds').asHours().toFixed(1);
        elements.push(
            <text
                key="entity-start-sla"
                x={nodePosition.x + nodeDimensions.width - 5}
                y={nodePosition.y + 13}
                textAnchor="end"
                fill="#777777"
                fontStyle="italic"
                style={{ userSelect: 'none' }}
            >
                Start SLA: T+{hours}h
            </text>,
        );
    }

    if (finishedBySla) {
        const hours = moment.duration(finishedBySla, 'seconds').asHours().toFixed(1);
        elements.push(
            <text
                key="entity-finish-sla"
                x={nodePosition.x + 5}
                y={nodePosition.y + 13}
                fill="#777777"
                fontStyle="italic"
                style={{ userSelect: 'none' }}
            >
                Finish SLA: T+{hours}h
            </text>,
        );
    }

    if (currentExecutionDate) {
        const finalRunForExecutionDate = runsWithProperties.filter(
            (run) => run.executionDate === currentExecutionDate,
        )[0];
        if (!finalRunForExecutionDate) {
            // FIXME bad UI
            elements.push(
                <text
                    key="no-run-indicator"
                    x={nodePosition.x + nodeDimensions.width - 5}
                    y={nodePosition.y - 2}
                    textAnchor="end"
                    style={{ userSelect: 'none' }}
                    fill="#bd5c28"
                >
                    No run on {currentExecutionDate.replace('T', ' ').replace('+00:00', '').replace('00:00:00', '')}
                </text>,
            );
        } else {
            // FIXME bad UI, repeated code
            let startTimeFill = '#555555';
            if (startedBySla) {
                startTimeFill =
                    finalRunForExecutionDate.offsetStartDuration.asSeconds() < startedBySla ? '#2861bd' : '#bd5c28';
            }
            elements.push(
                <text
                    key="entity-started-at"
                    x={nodePosition.x + nodeDimensions.width - 5}
                    y={nodePosition.y - 2}
                    fill={startTimeFill}
                    textAnchor="end"
                    style={{ userSelect: 'none' }}
                >
                    Started at T+{finalRunForExecutionDate.offsetStartDuration.asHours().toFixed(1)}h
                </text>,
            );
            if (finalRunForExecutionDate.offsetEndDuration.isValid()) {
                let finishTimeFill = '#555555';
                if (finishedBySla) {
                    finishTimeFill =
                        finalRunForExecutionDate.offsetStartDuration.asSeconds() < finishedBySla
                            ? '#2861bd'
                            : '#bd5c28';
                }
                elements.push(
                    <text
                        key="entity-finished-at"
                        x={nodePosition.x + 5}
                        y={nodePosition.y - 2}
                        fill={finishTimeFill}
                        style={{ userSelect: 'none' }}
                    >
                        Finished at T+{finalRunForExecutionDate.offsetEndDuration.asHours().toFixed(1)}h
                    </text>,
                );
            }
        }
    }

    return <g>{elements}</g>;
};
