import * as QueryString from 'query-string';
import { RouteComponentProps } from 'react-router-dom';

import filtersToQueryStringParams from './filtersToQueryStringParams';
import { EntityType, FacetFilterInput } from '../../../types.generated';
import { toPathName } from '../../shared/EntityTypeUtil';
import { PageRoutes } from '../../../conf/Global';

export const navigateToSearchUrl = ({
    type: newType,
    query: newQuery,
    page: newPage = 1,
    filters: newFilters,
    history,
}: {
    type: EntityType;
    query?: string;
    page?: number;
    filters?: Array<FacetFilterInput>;
    history: RouteComponentProps['history'];
}) => {
    const search = QueryString.stringify(
        {
            ...filtersToQueryStringParams(newFilters),
            query: newQuery,
            page: newPage,
        },
        { arrayFormat: 'comma' },
    );

    history.push({
        pathname: `${PageRoutes.SEARCH}/${toPathName(newType)}`,
        search,
    });
};
