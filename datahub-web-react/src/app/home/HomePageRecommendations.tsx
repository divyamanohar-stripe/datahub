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
    RecommendationsContainer,
    RecommendationContainer,
    RecommendationTitle,
    ThinDivider,
} from '../recommendations/RecommendationGroup';
import { RecommendationModule as RecommendationModuleType, ScenarioType } from '../../types.generated';
import { RecommendationModule } from '../recommendations/RecommendationModule';

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

export const HomePageRecommendations = ({ userUrn }: Props) => {
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
            {recommendationModules &&
                recommendationModules.map((module) => (
                    <RecommendationContainer>
                        <RecommendationTitle level={4}>{module.title}</RecommendationTitle>
                        <ThinDivider />
                        <RecommendationModule
                            key={module.moduleId}
                            module={module as RecommendationModuleType}
                            scenarioType={scenario}
                            showTitle={false}
                        />
                    </RecommendationContainer>
                ))}
            <GettingStartedModal onClose={() => setShowGettingStartedModal(false)} visible={showGettingStartedModal} />
        </RecommendationsContainer>
    );
};
