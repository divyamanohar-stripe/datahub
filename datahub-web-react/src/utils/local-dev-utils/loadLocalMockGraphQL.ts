import { LocalDevMapping } from './LocalDevLink';
import mockData from './MockData.json';

export function loadLocalMockGraphQL(): ReadonlyArray<LocalDevMapping> {
    return JSON.parse(JSON.stringify(mockData));
}
