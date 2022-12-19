import React, { useMemo } from 'react';
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
    max-width: 1000px;
    min-width: 750px;
`;

export const RecommendationContainerHalf = styled.div`
    margin-bottom: 32px;
    max-width: 500px;
    min-width: 375px;
    padding-left: 4px;
    padding-right: 4px;
`;

export const RecommendationContainerThird = styled.div`
    margin-bottom: 32px;
    max-width: 333px;
    min-width: 250px;
    padding-left: 3px;
    padding-right: 3px;
`;

export const RecommendationContainerFourth = styled.div`
    margin-bottom: 32px;
    max-width: 250px;
    min-width: 185px;
    padding-left: 2px;
    padding-right: 2px;
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
    const columnWidth = useMemo(() => {
        const modulesLength = modules.length;
        return 24 / modulesLength;
    }, [modules]);
    const componentType = useMemo(() => {
        switch (columnWidth) {
            case 24:
                return RecommendationContainer;
            case 12:
                return RecommendationContainerHalf;
            case 8:
                return RecommendationContainerThird;
            case 6:
                return RecommendationContainerFourth;
            default:
                return RecommendationContainer;
        }
    }, [columnWidth]);
    const columns = useMemo(() => {
        const recommendationRender = modules.map((module) => {
            const SpecificComponent = componentType;
            return (
                <SpecificComponent key={module.title}>
                    <RecommendationTitle level={4}>{module.title}</RecommendationTitle>
                    <ThinDivider />
                    <RecommendationModule
                        key={module.moduleId}
                        module={module as RecommendationModuleType}
                        scenarioType={ScenarioType.Home}
                        showTitle={false}
                    />
                </SpecificComponent>
            );
        });
        return recommendationRender.map((module) => (
            <Col span={columnWidth} key={module.key}>
                {module}
            </Col>
        ));
    }, [modules, columnWidth, componentType]);
    return <Row>{columns}</Row>;
};
