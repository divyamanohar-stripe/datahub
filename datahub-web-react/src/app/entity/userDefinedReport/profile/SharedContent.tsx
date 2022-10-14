import React from 'react';
import styled from 'styled-components';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';

export type RunEntity = {
    externalUrl: string;
    properties: {
        customProperties: {
            key: string;
            value: string;
        }[];
    };
};

export type DataJobEntity = {
    jobId: string;
    type: 'DATA_JOB';
    urn: string;
    dataFlow: any;
    ownership: any;
    globalTags?: {
        tags: {
            tag: { name: string };
        }[];
    };
    properties?: {
        customProperties: {
            key: string;
            value: string;
        }[];
        externalUrl?: string;
        description?: string;
        name?: string;
    };
    runs?: {
        runs: RunEntity[];
    };
};

// Styles
const LoadingText = styled.div`
    margin-top: 18px;
    font-size: 12px;
`;

const LoadingContainer = styled.div`
    padding-top: 40px;
    padding-bottom: 40px;
    width: 100%;
    text-align: center;
`;

export const loadingPage = (
    <LoadingContainer>
        <LoadingSvg height={80} width={80} />
        <LoadingText>Fetching data...</LoadingText>
    </LoadingContainer>
);

export const ExternalUrlLink = styled.a`
    font-size: 16px;
    color: grey;
`;
