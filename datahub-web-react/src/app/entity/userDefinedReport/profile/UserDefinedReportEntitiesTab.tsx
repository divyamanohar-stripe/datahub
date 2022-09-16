import React from 'react';
import { EntityType } from '../../../../types.generated';
import { EmbeddedListSearchSection } from '../../shared/components/styled/search/EmbeddedListSearchSection';
import { useEntityData } from '../../shared/EntityContext';

export const UserDefinedReportEntitiesTab = () => {
    const { urn, entityType } = useEntityData();

    let fixedFilter;
    // Set a fixed filter corresponding to the current entity urn.
    if (entityType === EntityType.UserDefinedReport) {
        fixedFilter = {
            field: 'userDefinedReports',
            value: urn,
        };
    }

    return (
        <EmbeddedListSearchSection
            fixedFilter={fixedFilter}
            emptySearchQuery="*"
            placeholderText="Filter user defined report entities..."
        />
    );
};
