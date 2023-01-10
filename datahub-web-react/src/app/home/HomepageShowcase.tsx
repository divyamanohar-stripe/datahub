import React from 'react';
import {
    BarChartOutlined,
    CheckCircleOutlined,
    DatabaseOutlined,
    LayoutOutlined,
    OrderedListOutlined,
    StockOutlined,
    TeamOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Typography } from 'antd';
import styled from 'styled-components';
import { RecommendationContainer, RecommendationTitle, ThinDivider } from '../recommendations/RecommendationGroup';

const ShowcaseCardContainer = styled.div`
    display: flex;
    justify-content: left;
    align-items: center;
    flex-wrap: wrap;
`;

const Container = styled(Button)`
    margin-right: 12px;
    margin-left: 12px;
    margin-bottom: 12px;
    width: 160px;
    height: 140px;
    display: flex;
    justify-content: center;
    border-radius: 4px;
    align-items: center;
    flex-direction: column;
    border: 1px solid '#F0F0F0';
    box-shadow: ${(props) => props.theme.styles['box-shadow']};
    &&:hover {
        box-shadow: ${(props) => props.theme.styles['box-shadow-hover']};
    }
    white-space: unset;
`;

const ShowcaseTitle = styled(Typography.Text)<{ $titleSizePx?: number }>`
    &&& {
        margin-right 8px;
        font-size: ${(props) => props.$titleSizePx || 16}px;
        font-weight: 600;
        vertical-align: middle;
    }
`;

export const HomePageShowcase = () => {
    return (
        <RecommendationContainer>
            <RecommendationTitle level={4}>Feature Showcase</RecommendationTitle>
            <ThinDivider />
            <ShowcaseCardContainer>
                <Container type="link" href="/search?filter_entity=USER_DEFINED_REPORT&page=1&query=UAR">
                    <LayoutOutlined style={{ fontSize: 14, color: '#B37FEB' }} />
                    <ShowcaseTitle $titleSizePx={14}>Pipeline Timeliness</ShowcaseTitle>
                </Container>
                <Container
                    type="link"
                    href="/search?filter_entity=USER_DEFINED_REPORT&page=1&query=Timeliness%2520tracking"
                >
                    <BarChartOutlined style={{ fontSize: 14, color: 'rgb(144 163 236)' }} />
                    <ShowcaseTitle $titleSizePx={14}>Historical Timeliness</ShowcaseTitle>
                </Container>
                <Container
                    type="link"
                    href="/tasks/urn:li:dataJob:(urn:li:dataFlow:(airflow,dailycron,PROD),icplus.DailyIcPlusFees)/Timeliness"
                >
                    <StockOutlined style={{ fontSize: 14, color: 'rgb(144 163 236)' }} />
                    <ShowcaseTitle $titleSizePx={14}>Dataset Timeliness</ShowcaseTitle>
                </Container>
                <Container type="link" href="/group/urn:li:corpGroup:dscore/metrics">
                    <TeamOutlined style={{ fontSize: 14 }} />
                    <ShowcaseTitle $titleSizePx={14}>DS Core Team Page</ShowcaseTitle>
                </Container>
            </ShowcaseCardContainer>
            <ShowcaseCardContainer>
                <Container
                    type="link"
                    href="/dataset/urn:li:dataset:(urn:li:dataPlatform:iceberg,regulatory_reporting.reporting_mtltransactions_shadow_raw,PROD)/Validation?"
                >
                    <CheckCircleOutlined style={{ fontSize: 14 }} />
                    <ShowcaseTitle $titleSizePx={14}>Dataset Validation</ShowcaseTitle>
                </Container>
                <Container
                    type="link"
                    href="/tasks/urn:li:dataJob:(urn:li:dataFlow:(airflow,dailycron,PROD),communia_sales.AggMerchant)/Changelog"
                >
                    <DatabaseOutlined style={{ fontSize: 14, color: 'rgb(144 163 236)' }} />
                    <ShowcaseTitle $titleSizePx={14}>Task Changelog</ShowcaseTitle>
                </Container>
                <Container
                    type="link"
                    href="/tasks/urn:li:dataJob:(urn:li:dataFlow:(airflow,finfra,PROD),finfra__alerting.AcquiringReconDownstreamSLA)/Insights"
                >
                    <UnorderedListOutlined style={{ fontSize: 14, color: 'rgb(144 163 236)' }} />
                    <ShowcaseTitle $titleSizePx={14}>Upstream Delays</ShowcaseTitle>
                </Container>
                <Container
                    type="link"
                    href="/tasks/urn:li:dataJob:(urn:li:dataFlow:(airflow,finfra,PROD),ops_reporting.RegulatoryPayments)/Lineage"
                >
                    <OrderedListOutlined style={{ fontSize: 14, color: '#B37FEB' }} />
                    <ShowcaseTitle $titleSizePx={14}>Downstream Impacts</ShowcaseTitle>
                </Container>
            </ShowcaseCardContainer>
        </RecommendationContainer>
    );
};
