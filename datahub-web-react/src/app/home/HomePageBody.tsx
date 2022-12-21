import React from 'react';
import styled from 'styled-components';
import { useExperiment } from '../experiments/useExperiment';
import { useGetAuthenticatedUser } from '../useGetAuthenticatedUser';
import { HomePageRecommendations } from './HomePageRecommendations';
import { HomePageRecommendationsV2 } from './HomepageRecommendationsV2';

const BodyContainer = styled.div`
    padding: 20px 100px;
    margin: 0;
    background-color: ${(props) => props.theme.styles['homepage-background-lower-fade']};
    > div {
        margin-bottom: 20px;
    }
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

export const HomePageBody = () => {
    const authenticatedUserUrn = useGetAuthenticatedUser()?.corpUser?.urn;
    const homepageExperiment = useExperiment('Homepage V2');
    if (authenticatedUserUrn) {
        const recsComponent = homepageExperiment ? (
            <HomePageRecommendationsV2 userUrn={authenticatedUserUrn} />
        ) : (
            <HomePageRecommendations userUrn={authenticatedUserUrn} />
        );
        return <BodyContainer>{recsComponent}</BodyContainer>;
    }
    return null;
};
