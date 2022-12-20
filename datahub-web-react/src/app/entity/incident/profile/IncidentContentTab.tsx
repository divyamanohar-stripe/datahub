import React from 'react';
import styled from 'styled-components';
import { Descriptions, Steps } from 'antd';
import { useGetIncidentQuery } from '../../../../graphql/incident.generated';
import { useEntityData } from '../../shared/EntityContext';
import { ReactComponent as LoadingSvg } from '../../../../images/datahub-logo-color-loading_pendulum.svg';

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

const loadingPage = (
    <LoadingContainer>
        <LoadingSvg height={80} width={80} />
        <LoadingText>Fetching data...</LoadingText>
    </LoadingContainer>
);

function isFieldValid(field: any) {
    return !(field === undefined || field === null || field === 'nan');
}

function isTimeValid(timestamp: any) {
    return !(timestamp === undefined || timestamp === null || (Number.isFinite(timestamp) && timestamp === 0));
}

function renderIncidentSteps(incidentProperties) {
    const openedAtText = isTimeValid(incidentProperties?.openedAt)
        ? new Date(incidentProperties.openedAt).toUTCString()
        : '';
    const resolvedAtText = isTimeValid(incidentProperties?.resolvedAt)
        ? new Date(incidentProperties.resolvedAt).toUTCString()
        : '';
    const closedAtText = isTimeValid(incidentProperties?.closedAt)
        ? new Date(incidentProperties.closedAt).toUTCString()
        : '';
    let currentStep = 0;
    if (isTimeValid(incidentProperties?.resolvedAt)) {
        currentStep = 1;
    }
    if (isTimeValid(incidentProperties?.closedAt)) {
        currentStep = 2;
    }

    return (
        <Steps current={currentStep}>
            <Steps.Step title="Opened" description={openedAtText} />
            <Steps.Step title="Resolved" description={resolvedAtText} />
            <Steps.Step title="Closed" description={closedAtText} />
        </Steps>
    );
}

export const IncidentContentTab = () => {
    const { urn } = useEntityData();

    const { loading, data } = useGetIncidentQuery({
        variables: { urn },
    });

    if (loading) return loadingPage;

    const incidentName = data?.incident?.properties?.name;
    let reportLink: any;
    const reportLinkValue = data?.incident?.properties?.reportLink;
    if (isFieldValid(reportLinkValue)) {
        reportLink = (
            <a href={reportLinkValue ?? ''} target="_blank" rel="noreferrer">
                {reportLinkValue}
            </a>
        );
    }

    return (
        <div style={{ marginTop: '10px' }}>
            <a
                href={`https://incident-reporting.corp.stripe.com/wf/incidents/${incidentName}`}
                rel="noreferrer"
                target="_blank"
                style={{ marginLeft: '20px', fontSize: 'medium', fontWeight: 'bold' }}
            >
                View Incident Page in BRB
            </a>
            <Descriptions bordered column={1} style={{ marginTop: '10px' }}>
                <Descriptions.Item label="Timeline" span={3}>
                    {renderIncidentSteps(data?.incident?.properties)}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                    {isFieldValid(data?.incident?.properties?.description)
                        ? data?.incident?.properties?.description
                        : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Summary">
                    {isFieldValid(data?.incident?.properties?.summary) ? data?.incident?.properties?.summary : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Resolution">
                    {isFieldValid(data?.incident?.properties?.resolution) ? data?.incident?.properties?.resolution : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Reporter">
                    {isFieldValid(data?.incident?.properties?.reporter) ? data?.incident?.properties?.reporter : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                    {isFieldValid(data?.incident?.properties?.severity) ? data?.incident?.properties?.severity : ''}
                </Descriptions.Item>
                <Descriptions.Item label="State">
                    {isFieldValid(data?.incident?.properties?.state) ? data?.incident?.properties?.state : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Report Link">{reportLink ?? ''}</Descriptions.Item>
            </Descriptions>
        </div>
    );
};
