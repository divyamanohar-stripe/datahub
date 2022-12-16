import React, { useCallback } from 'react';
import { Col, Divider, Row, Typography } from 'antd';
import styled from 'styled-components';
import { RecommendationModule as RecommendationModuleType, ScenarioType } from '../../types.generated';
import { RecommendationModule } from './RecommendationModule';

export const RecommendationsContainer = styled.div`
    margin-top: 32px;
    padding-left: 12px;
    padding-right: 12px;
`;

export const RecommendationContainer = styled.div`
    margin-bottom: 32px;
`;

export const RecommendationTitle = styled(Typography.Title)`
    margin-top: 0px;
    margin-bottom: 0px;
    padding: 0px;
`;

export const ThinDivider = styled(Divider)`
    margin-top: 12px;
    margin-bottom: 12px;
`;

type Props = {
    modules: any[];
};

export const RecommendationGroup = ({ modules }: Props) => {
    const getColumnWidth = useCallback(() => {
        const modulesLength = modules.length;
        return 24 / modulesLength;
    }, [modules]);
    const getColumns = useCallback(() => {
        const recommendationRender = modules.map((module) => (
            <RecommendationContainer key={module.title}>
                <RecommendationTitle level={4}>{module.title}</RecommendationTitle>
                <ThinDivider />
                <RecommendationModule
                    key={module.moduleId}
                    module={module as RecommendationModuleType}
                    scenarioType={ScenarioType.Home}
                    showTitle={false}
                />
            </RecommendationContainer>
        ));
        return recommendationRender.map((module) => (
            <Col span={getColumnWidth()} key={module.key}>
                {module}
            </Col>
        ));
    }, [modules, getColumnWidth]);
    return <Row>{getColumns()}</Row>;
};
