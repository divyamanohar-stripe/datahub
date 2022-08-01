import React, { MouseEventHandler, useCallback, useRef, useState } from 'react';
import { Coordinate } from '../utils/types';

export const InsightsRootSvg = ({
    width,
    height,
    children,
    overlay,
}: {
    width: number;
    height: number;
    children: React.ReactNode;
    overlay: React.ReactNode;
}) => {
    const [viewTranslation, updateViewTranslation] = useState<Coordinate>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartCoordinate, updateDragStartCoordinate] = useState<Coordinate>({ x: 0, y: 0 });
    const [dragEndCoordinate, updateDragEndCoordinate] = useState<Coordinate>({ x: 0, y: 0 });
    const mouseMoveLastFlushedRef = useRef(0);
    const moveMoveHandler = useCallback<MouseEventHandler>(
        (evt) => {
            if (isDragging) {
                const now = Date.now();
                if (now - mouseMoveLastFlushedRef.current > 10) {
                    mouseMoveLastFlushedRef.current = now;
                    updateDragEndCoordinate({ x: evt.clientX, y: evt.clientY });
                }
            }
        },
        [isDragging],
    );

    const effectiveTranslation = {
        x: viewTranslation.x - (dragEndCoordinate.x - dragStartCoordinate.x),
        y: viewTranslation.y - (dragEndCoordinate.y - dragStartCoordinate.y),
    };

    return (
        <svg
            width={width}
            height={height}
            onMouseDown={(evt) => {
                updateDragStartCoordinate({ x: evt.clientX, y: evt.clientY });
                updateDragEndCoordinate({ x: evt.clientX, y: evt.clientY });
                setIsDragging(true);
            }}
            onMouseUp={(evt) => {
                const xDiff = evt.clientX - dragStartCoordinate.x;
                const yDiff = evt.clientY - dragStartCoordinate.y;
                updateDragStartCoordinate({ x: 0, y: 0 });
                updateDragEndCoordinate({ x: 0, y: 0 });
                updateViewTranslation(({ x, y }) => ({ x: x - xDiff, y: y - yDiff }));
                setIsDragging(false);
            }}
            onMouseMove={moveMoveHandler}
        >
            <g transform={`translate(${-effectiveTranslation.x} ${-effectiveTranslation.y})`}>{children}</g>
            <g>{overlay}</g>
        </svg>
    );
};
