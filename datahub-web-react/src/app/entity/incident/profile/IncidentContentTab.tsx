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

function renderIncidentSteps(incidentProperties) {
    const openedAtText =
        incidentProperties?.openedAt !== null && incidentProperties?.openedAt !== undefined
            ? new Date(incidentProperties.openedAt).toUTCString()
            : '';
    const resolvedAtText =
        incidentProperties?.resolvedAt !== null && incidentProperties?.resolvedAt !== undefined
            ? new Date(incidentProperties.resolvedAt).toUTCString()
            : '';
    const closedAtText =
        incidentProperties?.closedAt !== null && incidentProperties?.closedAt !== undefined
            ? new Date(incidentProperties.closedAt).toUTCString()
            : '';
    let currentStep = 0;
    if (incidentProperties?.resolvedAt !== undefined && incidentProperties?.resolvedAt !== null) {
        currentStep = 1;
    }
    if (incidentProperties?.closedAt !== undefined && incidentProperties?.closedAt !== null) {
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
    console.log(data);

    return (
        <div style={{ marginTop: '10px' }}>
            <a
                href={`https://incident-reporting.corp.stripe.com/wf/incidents/${incidentName}`}
                rel="noreferrer"
                target="_blank"
                style={{ marginLeft: '20px' }}
            >
                View Incident Page in BRB
            </a>
            <Descriptions bordered column={1} style={{ marginTop: '10px' }}>
                <Descriptions.Item label="Timeline" span={3}>
                    {renderIncidentSteps(data?.incident?.properties)}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                    {data?.incident?.properties?.description ?? ''}
                </Descriptions.Item>
                <Descriptions.Item label="Summary">{data?.incident?.properties?.summary ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Resolution">{data?.incident?.properties?.resolution ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Reporter">{data?.incident?.properties?.reporter ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Severity">{data?.incident?.properties?.severity ?? ''}</Descriptions.Item>
                <Descriptions.Item label="State">{data?.incident?.properties?.state ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Report Link">
                    {data?.incident?.properties?.reportLink ?? ''}
                </Descriptions.Item>
            </Descriptions>
        </div>
    );
};
