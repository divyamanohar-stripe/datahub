import { Divider, Switch, Typography } from 'antd';
import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';
import { ExperimentsContext } from './ExperimentsProvider';
import { Preference } from './types';

const ContentContainer = styled.div`
    padding-top: 20px;
    padding-right: 40px;
    padding-left: 40px;
    width: 100%;
`;

const PageTitle = styled(Typography.Title)`
    && {
        margin-bottom: 12px;
    }
`;

type ExperimentProps = {
    experiment: Preference<boolean>;
    setExperiment: ((experiment: Preference<boolean>, value: boolean) => void) | undefined;
};

const Experiment = ({ experiment, setExperiment }: ExperimentProps) => {
    const isChecked = experiment.value ?? experiment.defaultValue;
    const onChange = () => {
        if (setExperiment) {
            setExperiment(experiment, !isChecked);
        }
    };
    return (
        <>
            <Typography.Title level={5}>{experiment.title}</Typography.Title>
            <Typography.Paragraph type="secondary">{experiment.description}</Typography.Paragraph>
            <Switch checked={isChecked} onChange={onChange} />
        </>
    );
};

export const Experiments = () => {
    const { experiments, setExperiment } = useContext(ExperimentsContext);
    const experimentsComponents = useMemo(() => {
        return experiments.map((ex) => <Experiment experiment={ex} setExperiment={setExperiment} />);
    }, [experiments, setExperiment]);
    return (
        <ContentContainer>
            <PageTitle level={3}>Experiments</PageTitle>
            <Typography.Paragraph type="secondary">Manage UI Experiments across Data Catalog</Typography.Paragraph>
            <Divider />
            {experimentsComponents}
        </ContentContainer>
    );
};
