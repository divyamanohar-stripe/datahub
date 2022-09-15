import { useLocation } from 'react-router-dom';
import * as QueryString from 'query-string';

// used to determine whether sibling entities should be shown merged or not
export const SEPARATE_SIBLINGS_URL_PARAM = 'separate_siblings';

// used to determine whether sibling entities should be shown merged or not
export function useIsSeparateSiblingsMode() {
    const location = useLocation();
    const params = QueryString.parse(location.search, { arrayFormat: 'comma' });

    return params[SEPARATE_SIBLINGS_URL_PARAM] === 'true';
}
