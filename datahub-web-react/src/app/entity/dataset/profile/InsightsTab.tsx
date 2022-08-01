/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-nested-ternary */
import React, { MouseEventHandler, ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import moment from 'moment-timezone';
import { useGetInsightsQuery } from '../../../../graphql/insights.generated';
import {
    addToMultimap,
    mapFromObjectArray,
    mapGetWithDefault,
    mapUpdate,
    sortBy,
} from '../../../../utils/collectionUtils';
import { rankGraphNodes } from '../../../../utils/graphUtils';
import { nullthrows } from '../../../../utils/nullthrows';
import { useEntityData } from '../../shared/EntityContext';
import { useInsightsIndex } from './insights/utils/useInsightsIndex';
import { InsightsRunIndicators } from './insights/components/InsightsRunIndicators';
import { InsightsGraphNode } from './insights/components/InsightsGraphNode';
import { InsightsOverlay } from './insights/components/InsightsOverlay';
import { InsightsRootSvg } from './insights/components/InsightsRootSvg';

export const InsightsTab = () => {
    const { urn: initialEntityUrn } = useEntityData();
    const { loading, error, data } = useGetInsightsQuery({
        variables: { urn: initialEntityUrn },
    });

    const [shouldCollapseDatasets, setShouldCollapseDatasets] = useState(true);

    const [currentExecutionDate, setCurrentExecutionDate] = useState<string | null>(null);
    const [hoverRunUrn, setHoverRunUrn] = useState<string | null>(null);
    const [hoverExecutionDate, setHoverExecutionDate] = useState<string | null>(null);
    const [hoverEntityUrn, setHoverEntityUrn] = useState<string | null>(null);

    const { entitiesByUrn, forwardEdges, slaPropertiesByUrn, entityRanksByUrn } = useInsightsIndex({
        initialEntityUrn,
        data,
        shouldCollapseDatasets,
    });

    const nodeDimensions = useMemo(() => ({ width: 300, height: 100 } as const), []);
    const nodeMargins = useMemo(() => ({ x: 300, y: 70 } as const), []);

    const [positions, centroids, incomingPorts, outgoingPorts] = useMemo(() => {
        const positionsMap: Map<string, { readonly x: number; readonly y: number }> = new Map();
        const centroidsMap: Map<string, { readonly x: number; readonly y: number }> = new Map();
        const incomingPortsMap: Map<string, { readonly x: number; readonly y: number }> = new Map();
        const outgoingPortsMap: Map<string, { readonly x: number; readonly y: number }> = new Map();
        const countsByRank: Map<number, number> = new Map();

        data?.searchAcrossLineage?.searchResults.forEach((result) => {
            const { entity } = result;
            if (!entity) return;

            const { urn: entityUrn } = entity;
            const rank = entityRanksByUrn.get(entityUrn);
            if (typeof rank !== 'number') {
                return;
            }

            const positionInRank = mapUpdate(countsByRank, rank, (x) => (x ?? 0) + 1);
            const x = (nodeMargins.x + nodeDimensions.width) * rank + nodeMargins.x;
            const y = (nodeMargins.y + nodeDimensions.height) * positionInRank + nodeMargins.y;
            positionsMap.set(entityUrn, { x, y });
            centroidsMap.set(entityUrn, { x: x + nodeDimensions.width / 2, y: y + nodeDimensions.height / 2 });
            incomingPortsMap.set(entityUrn, { x, y: y + nodeDimensions.height / 2 });
            outgoingPortsMap.set(entityUrn, { x: x + nodeDimensions.width, y: y + nodeDimensions.height / 2 });
        });
        return [positionsMap, centroidsMap, incomingPortsMap, outgoingPortsMap];
    }, [data, entityRanksByUrn, nodeDimensions, nodeMargins]);

    if (loading) {
        return <div key="loading">loading</div>;
    }
    if (error) {
        return <div key="error">error: ${error.message}</div>;
    }

    const edgesLayer: ReactElement[] = [];
    const nodesLayer: ReactElement[] = [];

    const extent = { x: 0, y: 0 };
    positions.forEach((position, entityUrn) => {
        extent.x = Math.max(position.x + nodeMargins.x + nodeDimensions.width, extent.x);
        extent.y = Math.max(position.y + nodeMargins.y + nodeDimensions.height, extent.y);

        (forwardEdges.get(entityUrn) ?? []).forEach((toEntityUrn) => {
            const fromPort = outgoingPorts.get(entityUrn);
            const toPort = incomingPorts.get(toEntityUrn);
            if (!fromPort || !toPort) {
                return;
            }
            const isConnectedToHoverEntity = entityUrn === hoverEntityUrn || toEntityUrn === hoverEntityUrn;
            const bezierControlLength = nodeMargins.x;
            const d = [
                `M ${fromPort.x} ${fromPort.y}`,
                `C ${fromPort.x + bezierControlLength} ${fromPort.y},`,
                `${toPort.x - bezierControlLength} ${toPort.y},`,
                `${toPort.x} ${toPort.y}`,
            ].join(' ');
            edgesLayer.push(
                <path
                    // eslint-disable-next-line react/no-array-index-key
                    key={`edge-${entityUrn}-${toEntityUrn}`}
                    d={d}
                    stroke="#888888"
                    strokeWidth={isConnectedToHoverEntity ? 2 : 1}
                    fill="none"
                    opacity={isConnectedToHoverEntity ? 0.8 : 0.3}
                />,
            );
        });

        const entity = nullthrows(entitiesByUrn.get(entityUrn));
        if (entity.__typename === 'DataJob') {
            // FIXME bad repeated code
            const startedBySla = slaPropertiesByUrn
                .get(entityUrn)
                ?.get('startedBySla')
                ?.map((str) => parseFloat(str))
                .reduce<number | null>((a, b) => (a === null ? b : b === null ? a : Math.min(a, b)), null);

            // FIXME bad repeated code
            const finishedBySla = slaPropertiesByUrn
                .get(entityUrn)
                ?.get('finishedBySla')
                ?.map((str) => parseFloat(str))
                .reduce<number | null>((a, b) => (a === null ? b : b === null ? a : Math.min(a, b)), null);

            const runsWithProperties =
                entity.runs?.runs?.map((run) => {
                    let executionDate: string | null | undefined;
                    let startDate: string | null | undefined;
                    let endDate: string | null | undefined;
                    let state: string | null | undefined;
                    if (run?.properties?.customProperties) {
                        const properties = mapFromObjectArray(run.properties.customProperties);
                        executionDate = properties.get('executionDate');
                        state = properties.get('state');
                        startDate = properties.get('startDate');
                        endDate = properties.get('endDate');
                    }

                    const parsedStartDate = moment(startDate);
                    const parsedEndDate = moment(endDate);
                    const parsedExecutionDate = moment(executionDate);
                    const offsetStartDuration = moment.duration(parsedStartDate.diff(parsedExecutionDate));
                    const offsetEndDuration = moment.duration(parsedEndDate.diff(parsedExecutionDate));
                    const runDuration = moment.duration(parsedEndDate.diff(parsedStartDate));

                    return {
                        ...run,
                        executionDate,
                        startDate,
                        endDate,
                        state,
                        offsetStartDuration,
                        offsetEndDuration,
                        runDuration,
                        parsed: { startDate: parsedStartDate, endDate: parsedEndDate, executionDate },
                    };
                }) ?? [];

            sortBy(runsWithProperties, (run) => `${run.executionDate ?? ''}|${run.startDate ?? ''}`).reverse();

            nodesLayer.push(
                <InsightsGraphNode
                    // eslint-disable-next-line react/no-array-index-key
                    key={`entity-${entityUrn}`}
                    entityUrn={entityUrn}
                    currentExecutionDate={currentExecutionDate}
                    startedBySla={startedBySla}
                    finishedBySla={finishedBySla}
                    nodeDimensions={nodeDimensions}
                    nodePosition={position}
                    runsWithProperties={runsWithProperties}
                    setHoverEntityUrn={setHoverEntityUrn}
                />,
            );

            nodesLayer.push(
                <InsightsRunIndicators
                    // eslint-disable-next-line react/no-array-index-key
                    key={`entity-indicators-${entityUrn}`}
                    currentExecutionDate={currentExecutionDate}
                    hoverExecutionDate={hoverExecutionDate}
                    hoverRunUrn={hoverRunUrn}
                    runsWithProperties={runsWithProperties}
                    nodeDimensions={nodeDimensions}
                    nodePosition={position}
                    setCurrentExecutionDate={setCurrentExecutionDate}
                    setHoverRunUrn={setHoverRunUrn}
                    setHoverExecutionDate={setHoverExecutionDate}
                />,
            );
        }
    });

    const overlayLayer: ReactElement[] = [];
    overlayLayer.push(<InsightsOverlay key="overlay" currentExecutionDate={currentExecutionDate} />);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }} key="success">
            <div
                style={{
                    overflow: 'hidden',
                    position: 'absolute',
                    left: '0px',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                }}
            >
                <InsightsRootSvg width={extent.x} height={extent.y} overlay={overlayLayer}>
                    <g>{edgesLayer}</g>
                    <g>{nodesLayer}</g>
                </InsightsRootSvg>
            </div>
        </div>
    );

    // return <div>{urn}</div>;
};
