import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Empty } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useListRecommendationsQuery } from '../../graphql/recommendations.generated';
import { BrowseEntityCard } from '../search/BrowseEntityCard';
import { useEntityRegistry } from '../useEntityRegistry';
import { useGetEntityCountsQuery } from '../../graphql/app.generated';
import { GettingStartedModal } from './GettingStartedModal';
import { ANTD_GRAY } from '../entity/shared/constants';
import {
    RecommendationContainer,
    RecommendationGroup,
    RecommendationsContainer,
    RecommendationTitle,
    ThinDivider,
} from '../recommendations/RecommendationGroup';
import { ScenarioType } from '../../types.generated';

const BrowseCardContainer = styled.div`
    display: flex;
    justify-content: left;
    align-items: center;
    flex-wrap: wrap;
`;

const ConnectSourcesButton = styled(Button)`
    margin: 16px;
`;

const NoMetadataEmpty = styled(Empty)`
    font-size: 18px;
    color: ${ANTD_GRAY[8]};
`;

const NoMetadataContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;

type Props = {
    userUrn: string;
};

const RECOMMENDATION_MODULE_SORT_ORDER = [
    'ENTITY_NAME_LIST',
    'PLATFORM_SEARCH_LIST',
    'DOMAIN_SEARCH_LIST',
    'TAG_SEARCH_LIST',
];

export const HomePageRecommendationsV2 = ({ userUrn }: Props) => {
    // Entity Types
    const entityRegistry = useEntityRegistry();
    const browseEntityList = entityRegistry.getBrowseEntityTypes();
    const [showGettingStartedModal, setShowGettingStartedModal] = useState(false);

    const { data: entityCountData } = useGetEntityCountsQuery({
        variables: {
            input: {
                types: browseEntityList,
            },
        },
    });

    const orderedEntityCounts = entityCountData?.getEntityCounts?.counts?.sort((a, b) => {
        return browseEntityList.indexOf(a.entityType) - browseEntityList.indexOf(b.entityType);
    });

    // Recommendations
    const scenario = ScenarioType.Home;
    const { data } = useListRecommendationsQuery({
        variables: {
            input: {
                userUrn,
                requestContext: {
                    scenario,
                },
                limit: 10,
            },
        },
        fetchPolicy: 'no-cache',
    });
    const recommendationModules = data?.listRecommendations?.modules;
    const groupedModules = recommendationModules?.reduce((r, a) => {
        const newRenderType = a.renderType;
        const newGroup = [...(r[newRenderType] || []), a];
        // eslint-disable-next-line no-param-reassign
        r[newRenderType] = newGroup;
        return r;
    }, {});

    // Determine whether metadata has been ingested yet.
    const hasLoadedEntityCounts = orderedEntityCounts && orderedEntityCounts.length > 0;
    const hasIngestedMetadata =
        orderedEntityCounts && orderedEntityCounts.filter((entityCount) => entityCount.count > 0).length > 0;

    useEffect(() => {
        if (hasLoadedEntityCounts && !hasIngestedMetadata) {
            setShowGettingStartedModal(true);
        }
    }, [hasLoadedEntityCounts, hasIngestedMetadata]);

    return (
        <RecommendationsContainer>
            {orderedEntityCounts && orderedEntityCounts.length > 0 && (
                <RecommendationContainer>
                    <RecommendationTitle level={4}>Explore your Metadata</RecommendationTitle>
                    <ThinDivider />
                    {hasIngestedMetadata ? (
                        <BrowseCardContainer>
                            {orderedEntityCounts.map(
                                (entityCount) =>
                                    entityCount &&
                                    entityCount.count !== 0 && (
                                        <BrowseEntityCard
                                            key={entityCount.entityType}
                                            entityType={entityCount.entityType}
                                            count={entityCount.count}
                                        />
                                    ),
                            )}
                        </BrowseCardContainer>
                    ) : (
                        <NoMetadataContainer>
                            <NoMetadataEmpty description="No Metadata Found 😢" />
                            <ConnectSourcesButton onClick={() => setShowGettingStartedModal(true)}>
                                <RocketOutlined /> Connect your data sources
                            </ConnectSourcesButton>
                        </NoMetadataContainer>
                    )}
                </RecommendationContainer>
            )}
            {groupedModules &&
                Object.keys(groupedModules)
                    .sort(
                        (a, b) =>
                            RECOMMENDATION_MODULE_SORT_ORDER.indexOf(a) - RECOMMENDATION_MODULE_SORT_ORDER.indexOf(b),
                    )
                    .map((recommendationGroupType) => (
                        <RecommendationGroup modules={groupedModules[recommendationGroupType]} />
                    ))}
            <GettingStartedModal onClose={() => setShowGettingStartedModal(false)} visible={showGettingStartedModal} />
        </RecommendationsContainer>
    );
};
