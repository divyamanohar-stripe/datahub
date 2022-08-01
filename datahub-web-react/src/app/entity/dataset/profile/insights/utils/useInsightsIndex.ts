/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo } from 'react';
import { useGetInsightsQuery } from '../../../../../../graphql/insights.generated';
import { addToMultimap, mapGetWithDefault } from '../../../../../../utils/collectionUtils';
import { rankGraphNodes } from '../../../../../../utils/graphUtils';

type InsightsQueryData = NonNullable<ReturnType<typeof useGetInsightsQuery>['data']>;
type InsightsQueryEntity = NonNullable<InsightsQueryData['searchAcrossLineage']>['searchResults'][number]['entity'];

export type InsightsIndex = {
    readonly entitiesByUrn: ReadonlyMap<string, InsightsQueryEntity>;
    readonly entityRanksByUrn: ReadonlyMap<string, number>;
    readonly forwardEdges: ReadonlyMap<string, ReadonlySet<string>>;
    readonly slaPropertiesByUrn: Map<string, Map<string, string[]>>;
};

export function useInsightsIndex({
    initialEntityUrn,
    data,
    shouldCollapseDatasets,
}: {
    initialEntityUrn: string;
    data?: ReturnType<typeof useGetInsightsQuery>['data'];
    shouldCollapseDatasets: boolean;
}) {
    const entitiesByUrn = useMemo(() => {
        const map: Map<string, InsightsQueryEntity> = new Map();
        data?.searchAcrossLineage?.searchResults.forEach((result) => {
            map.set(result.entity.urn, result.entity);
        });
        return map;
    }, [data]);

    const [forwardEdges, slaPropertiesByUrn] = useMemo(() => {
        const edges: Map<string, Set<string>> = new Map();
        const slaProperties: Map<string, Map<string, string[]>> = new Map();

        data?.searchAcrossLineage?.searchResults.forEach((result) => {
            const fromUrn = result.entity.urn;
            result.entity.relationships?.relationships.forEach((relationship) => {
                const toUrn = relationship.entity?.urn;
                if (!toUrn) return;
                const swap = relationship.type === 'Produces';
                if (swap) {
                    addToMultimap(edges, toUrn, fromUrn);
                } else {
                    addToMultimap(edges, fromUrn, toUrn);
                }
            });
        });

        edges.forEach((toEntityUrns, entityUrn) => {
            const entity = entitiesByUrn.get(entityUrn);
            if (entity?.__typename === 'Dataset') {
                const propertiesArray = entity.properties?.customProperties;
                if (propertiesArray) {
                    toEntityUrns.forEach((toEntityUrn) => {
                        const toEntity = entitiesByUrn.get(toEntityUrn);
                        if (toEntity?.__typename !== 'Dataset') {
                            const slaPropertiesForJob = mapGetWithDefault(slaProperties, toEntityUrn, () => new Map());
                            propertiesArray.forEach(({ key, value }) => {
                                mapGetWithDefault(slaPropertiesForJob, key, () => []).push(value);
                            });
                        }
                    });
                }
            }
        });

        if (shouldCollapseDatasets) {
            const remappedUrns = new Map<string, Set<string>>();
            edges.forEach((toEntityUrns, entityUrn) => {
                if (entityUrn === initialEntityUrn) {
                    return;
                }
                const entity = entitiesByUrn.get(entityUrn);
                if (!entity) {
                    remappedUrns.set(entityUrn, new Set());
                } else if (entity.__typename === 'Dataset') {
                    remappedUrns.set(entityUrn, toEntityUrns);
                }
            });

            remappedUrns.forEach((_, entityUrn) => edges.delete(entityUrn));

            let changed;
            do {
                changed = false;
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                edges.forEach((toEntityUrns, _entityUrn) => {
                    const toRemove: Set<string> = new Set();
                    toEntityUrns.forEach((toEntityUrn) => {
                        if (remappedUrns.has(toEntityUrn)) {
                            changed = true;
                            toRemove.add(toEntityUrn);
                        }
                    });
                    toRemove.forEach((toEntityUrnToRemove) => {
                        const replacements = remappedUrns.get(toEntityUrnToRemove);
                        toEntityUrns.delete(toEntityUrnToRemove);
                        replacements?.forEach((replacementEntityUrn) => toEntityUrns.add(replacementEntityUrn));
                    });
                });
            } while (changed);
        }

        return [edges, slaProperties];
    }, [initialEntityUrn, data, entitiesByUrn, shouldCollapseDatasets]);

    const entityRanksByUrn = useMemo(
        () => rankGraphNodes(initialEntityUrn, forwardEdges),
        [initialEntityUrn, forwardEdges],
    );

    // This is memoized for referential equality in props, not because
    // it's expensive to construct an object or anything.
    return useMemo(
        () => ({ entitiesByUrn, forwardEdges, entityRanksByUrn, slaPropertiesByUrn }),
        [entitiesByUrn, forwardEdges, entityRanksByUrn, slaPropertiesByUrn],
    );
}
