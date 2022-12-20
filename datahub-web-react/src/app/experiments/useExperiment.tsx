import { useContext, useMemo } from 'react';
import { ExperimentsContext } from './ExperimentsProvider';

export function useExperiment(experimentTitle: string): any | undefined {
    const { experiments } = useContext(ExperimentsContext);
    const experiment = useMemo(() => {
        return experiments.find((ex) => ex.title === experimentTitle);
    }, [experiments, experimentTitle]);
    return experiment?.value ?? experiment?.defaultValue;
}
