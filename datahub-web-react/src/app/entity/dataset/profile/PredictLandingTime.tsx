import moment from 'moment';
import React, { ErrorInfo, FC, ReactNode } from 'react';
import {
    useGetDataJobPredictionsQuery,
    useSearchAcrossLineagePredictionsQuery,
} from '../../../../graphql/predictions.generated';
import { DataProcessInstanceFilterInputType, EntityType, LineageDirection } from '../../../../types.generated';

enum RunState {
    NOT_STARTED = 'not started',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
    SKIPPED = 'skipped',
}

type FormattedRunCustomProperties = {
    executionDate: string;
    startDate: string;
    state: RunState;
    endDate?: string;
};

type RawDataInfo = {
    entity: {
        urn: string;
        type: string;
        runtimeSLO: { runtimeSLO: number | null } | null;
        upstream: {
            start: number;
            count: number;
            total: number;
            relationships: Array<{ type: string; entity: { urn: string; type: string } }>;
        };
        runs: { runs: Array<{ properties: { customProperties: any } }> };
    };
    degree: number;
};

type TreeDataInfo = {
    urn: string;
    type: string;
    upstreams: TreeDataInfo[];
    runtimeSLO: number;
    startDate?: moment.Moment;
    endDate?: moment.Moment;
    degree: number;
    discovered: boolean;
    landingTime?: moment.Moment;
    strLandingTime?: string;
    maxParent?: string;
};

// calculate predicted landing time
function getPredictedLandingTime(lineageData: TreeDataInfo, executionDate: moment.Moment) {
    function setMaxParentLanding(node, parentLandings) {
        const currNode = node;
        const [maxParent, maxParentTime] = parentLandings.reduce((prev, cur) => {
            if (cur[1].valueOf() > prev[1].valueOf()) {
                return cur;
            }
            return prev;
        });
        currNode.landingTime = moment(maxParentTime).add(currNode.runtimeSLO, 's');
        currNode.strLandingTime = moment(currNode.landingTime).format();
        currNode.maxParent = maxParent;
    }

    function predictLandingTime(incomingNode: TreeDataInfo, parents: TreeDataInfo[]) {
        const node = incomingNode;
        node.discovered = true;

        if (parents.length === 0) {
            // if node has no parents
            if (node.startDate === undefined) {
                // if node has not started, landing time = execution date + runtime SLO
                node.landingTime = moment(executionDate).add(node.runtimeSLO, 's');
                node.strLandingTime = moment(node.landingTime).format();
            } else {
                // if node has started, landing time = start date + runtime SLO
                node.landingTime = moment(node.startDate).add(node.runtimeSLO, 's');
                node.strLandingTime = moment(node.landingTime).format();
            }
        } else if (parents.every((p) => p.startDate !== undefined)) {
            // if all parents have started, get max start date + runtime SLO
            const parentLandings = parents.map(
                (p) => [p.urn, moment(p.startDate).add(p.runtimeSLO, 's')] as [string, moment.Moment],
            );
            setMaxParentLanding(node, parentLandings);
        } else {
            // if some parents have not started, traverse upstream and predict their landing times
            parents.map((p) => (!p.discovered ? predictLandingTime(p, p.upstreams) : 0));
            const definedParents = parents.filter((p) => p.landingTime !== undefined);
            const parentLandings = definedParents.map((p) => [p.urn, p.landingTime] as [string, moment.Moment]);
            setMaxParentLanding(node, parentLandings);
        }
    }

    predictLandingTime(lineageData, lineageData.upstreams);

    if (lineageData.landingTime === undefined) {
        return 'Unable to estimate landing time';
    }
    return lineageData.landingTime.format('MM/DD/YYYY HH:mm:ss');
}

// build lineage data using results query
function buildLineage(
    rootUrn: string,
    lineageData,
    rootRunInfo,
    rootRuntimeSLO: number,
    rootType: string,
    executionDate: moment.Moment,
) {
    const upstreamData: RawDataInfo[] = [...lineageData?.searchAcrossLineage?.searchResults];

    // upstream from root task is missing from data, add in with relationships as entities with degree 1
    const directParents = upstreamData.filter((u) => u?.degree === 1);
    const rootRelationships = directParents.map((p) => {
        return { type: 'Consumes', entity: { urn: p?.entity?.urn, type: p?.entity?.type } };
    });
    const rootEntry = {
        entity: {
            urn: rootUrn,
            type: rootType,
            upstream: {
                start: 0,
                count: directParents.length,
                total: directParents.length,
                relationships: rootRelationships,
            },
            runs: rootRunInfo,
            runtimeSLO: { runtimeSLO: rootRuntimeSLO },
        },
        degree: 0,
    };

    upstreamData.push(rootEntry);

    // recursively build tree with upstreams in TreeDataInfo format with links to upstreams for each dataset/job
    const getTree = (data: RawDataInfo[]) => {
        const nodeMap = data.reduce((map, node) => {
            const editMap = map;
            editMap[node.entity?.urn] = node;
            return editMap;
        }, {} as Record<string, RawDataInfo>);

        const buildTree = (currNodeUrn: string, prevNodeDegree): TreeDataInfo => {
            let startDate: moment.Moment | undefined;
            let endDate: moment.Moment | undefined;
            const currNodeRuns = nodeMap[currNodeUrn]?.entity?.runs?.runs;
            if (currNodeRuns !== undefined && currNodeRuns.length > 0) {
                const formattedProps = nodeMap[currNodeUrn].entity.runs.runs[0].properties.customProperties.reduce(
                    (acc, e) => ({ ...acc, [e.key]: e.value }),
                    {},
                ) as FormattedRunCustomProperties;
                if (moment.utc(formattedProps.executionDate).isSame(executionDate)) {
                    startDate = moment.utc(formattedProps.startDate);
                    if (formattedProps.endDate !== 'None') {
                        endDate = moment.utc(formattedProps?.endDate);
                    }
                }
            }

            const newNode: TreeDataInfo = {
                urn: currNodeUrn,
                type: nodeMap[currNodeUrn]?.entity?.type,
                upstreams: [],
                runtimeSLO: nodeMap[currNodeUrn]?.entity?.runtimeSLO?.runtimeSLO ?? 0,
                startDate,
                endDate,
                degree: nodeMap[currNodeUrn]?.degree,
                discovered: false,
                landingTime: undefined,
            };

            const newNodeUpstreams = newNode.upstreams;
            if (endDate === undefined && prevNodeDegree < nodeMap[currNodeUrn].degree) {
                newNodeUpstreams.push(
                    ...nodeMap[currNodeUrn].entity.upstream.relationships.map((upstreamUrn) =>
                        buildTree(upstreamUrn.entity.urn, nodeMap[currNodeUrn].degree),
                    ),
                );
            }

            return newNode;
        };

        return buildTree(rootUrn, -1);
    };

    // return full TreeDataInfo object with all upstream info
    return getTree(upstreamData);
}

class ErrorBoundary extends React.Component<{ children: ReactNode }, { errorInfo: ErrorInfo } | { errorInfo: null }> {
    constructor(props) {
        super(props);
        this.state = { errorInfo: null };
    }

    componentDidCatch(_error, errorInfo) {
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.errorInfo) {
            return (
                <>
                    Error:
                    <pre>
                        <code>{this.state.errorInfo}</code>
                    </pre>
                </>
            );
        }
        return this.props.children;
    }
}

interface TimePredictionComponentProps {
    urn: string;
    executionDate: number;
}

const TimePrediction: FC<TimePredictionComponentProps> = ({ urn, executionDate }) => {
    const { data: lineageQueryData, loading: loadingLineage } = useSearchAcrossLineagePredictionsQuery({
        variables: {
            input: {
                urn,
                direction: LineageDirection.Upstream,
                count: 10000,
                types: [EntityType.DataJob, EntityType.Dataset],
            },
            runsInput: {
                filters: [{ type: DataProcessInstanceFilterInputType.OnLogicalDate, value: String(executionDate) }],
            },
        },
    });

    const { data: dataJobPredictions, loading: loadingDataJobPredictions } = useGetDataJobPredictionsQuery({
        variables: {
            urn,
            runsInput: {
                filters: [{ type: DataProcessInstanceFilterInputType.OnLogicalDate, value: String(executionDate) }],
            },
        },
    });

    if (loadingLineage || loadingDataJobPredictions) {
        return <>loading...</>;
    }
    let predictedLandingTime;
    try {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        // Type coercion is especially hard here, would need a deeper rewrite
        const rootRunInfo = dataJobPredictions?.dataJob?.runs ?? { runs: [] };
        const rootRuntimeSLO = dataJobPredictions?.dataJob?.runtimeSLO?.runtimeSLO ?? 0;
        const rootType = dataJobPredictions?.dataJob?.type ?? 'DATA_JOB';
        if (rootRunInfo.runs!.length > 0) {
            const formattedProps = rootRunInfo!.runs![0]!.properties!.customProperties!.reduce(
                (acc, e) => ({ ...acc, [e.key]: e.value }),
                {},
            ) as FormattedRunCustomProperties;
            if (
                formattedProps?.endDate !== undefined &&
                formattedProps?.endDate !== null &&
                formattedProps?.endDate !== 'None'
            ) {
                return <>{moment.utc(formattedProps.endDate).format('MM/DD/YYYY HH:mm:ss')}</>;
            }
            return <>{moment.utc(formattedProps.startDate).add(rootRuntimeSLO, 's').format('MM/DD/YYYY HH:mm:ss')}</>;
        }
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        const lineageData = buildLineage(
            urn,
            lineageQueryData,
            rootRunInfo,
            rootRuntimeSLO,
            rootType,
            moment.utc(executionDate),
        );
        console.log('lineage tree data', lineageData);
        predictedLandingTime = getPredictedLandingTime(lineageData, moment.utc(executionDate));
    } catch {
        predictedLandingTime = 'Unable to estimate landing time';
    }
    console.log('predicted landing time: ', predictedLandingTime);
    return <>{predictedLandingTime}</>;
};

export const TimePredictionComponent: FC<TimePredictionComponentProps> = (props) => (
    <ErrorBoundary>
        <TimePrediction {...props} />
    </ErrorBoundary>
);
