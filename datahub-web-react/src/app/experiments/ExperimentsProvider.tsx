import React, { FC, createContext } from 'react';
import { useLocalStorage } from '../useLocalStorage';
import { ACTIVE_EXPERIMENTS, Preference } from './types';

type ExperimentsContextType = {
    experiments: Preference<boolean>[];
    setExperiment?: (experiment: Preference<boolean>, value: boolean) => void;
};

export const ExperimentsContext = createContext<ExperimentsContextType>({ experiments: ACTIVE_EXPERIMENTS });

export const ExperimentsProvider: FC = ({ children }) => {
    const [experiments, setExperiments] = useLocalStorage<Preference<boolean>[]>('experiments', ACTIVE_EXPERIMENTS);
    const setExperiment = (experiment: Preference<boolean>, value: boolean) => {
        // Should be trivially small N, iteration is alright. If not trivial N, clean up dead experiments!
        const newExperiments = experiments.map((ex) => {
            if (ex.title === experiment.title) {
                return {
                    ...experiment,
                    value,
                };
            }
            return ex;
        });
        setExperiments(newExperiments);
    };
    return <ExperimentsContext.Provider value={{ experiments, setExperiment }}>{children}</ExperimentsContext.Provider>;
};
