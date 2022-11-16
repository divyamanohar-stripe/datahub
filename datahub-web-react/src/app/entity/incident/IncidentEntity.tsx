import React from 'react';
import { AlertOutlined } from '@ant-design/icons';
import { useGetIncidentQuery } from '../../../graphql/incident.generated';
import { EntityType, Incident, SearchResult } from '../../../types.generated';
import { Entity, IconStyleType, PreviewType } from '../Entity';
import { EntityProfile } from '../shared/containers/profile/EntityProfile';
import { IncidentSidebarOwnerSection } from './profile/IncidentSidebarOwnerSection';
import { GenericEntityProperties } from '../shared/types';
import { Preview } from './preview/Preview';
import { IncidentContentTab } from './profile/IncidentContentTab';

/**
 * Definition of the DataHub Incident entity.
 */
export class IncidentEntity implements Entity<Incident> {
    type: EntityType = EntityType.Incident;

    icon: (fontSize: number, styleType: IconStyleType) => JSX.Element = (
        fontSize: number,
        styleType: IconStyleType,
    ) => {
        if (styleType === IconStyleType.TAB_VIEW) {
            return <AlertOutlined />;
        }

        if (styleType === IconStyleType.HIGHLIGHT) {
            return <AlertOutlined style={{ fontSize, color: '#B37FEB' }} />;
        }

        return (
            <AlertOutlined
                style={{
                    fontSize,
                    color: '#BFBFBF',
                }}
            />
        );
    };

    isSearchEnabled: () => boolean = () => true;

    isBrowseEnabled: () => boolean = () => false;

    isLineageEnabled: () => boolean = () => false;

    getPathName: () => string = () => 'incident';

    getCollectionName: () => string = () => 'Incidents';

    getEntityName?: (() => string) | undefined = () => 'Incident';

    renderProfile: (urn: string) => JSX.Element = (urn: string) => {
        return (
            <EntityProfile
                urn={urn}
                entityType={EntityType.Incident}
                useEntityQuery={useGetIncidentQuery}
                useUpdateQuery={undefined}
                getOverrideProperties={this.getOverridePropertiesFromEntity}
                tabs={[
                    {
                        name: 'Details',
                        component: IncidentContentTab,
                    },
                ]}
                sidebarSections={[
                    {
                        component: IncidentSidebarOwnerSection,
                        properties: {
                            hideOwnerType: true,
                        },
                    },
                ]}
            />
        );
    };

    renderPreview: (type: PreviewType, data: Incident) => JSX.Element = (_type: PreviewType, data: Incident) => {
        return (
            <Preview
                urn={data.urn}
                name={this.displayName(data)}
                description={data.properties?.description}
                owners={data.ownership?.owners}
                logoComponent={this.icon(12, IconStyleType.ACCENT)}
            />
        );
    };

    renderSearch: (result: SearchResult) => JSX.Element = (result: SearchResult) => {
        const data = result.entity as Incident;
        return (
            <Preview
                urn={data.urn}
                name={this.displayName(data)}
                description={data.properties?.description}
                owners={data.ownership?.owners}
                logoComponent={this.icon(12, IconStyleType.ACCENT)}
            />
        );
    };

    displayName: (data: Incident) => string = (data: Incident) => {
        return data?.properties?.name || data?.id;
    };

    getGenericEntityProperties: (data: Incident) => GenericEntityProperties | null = (data: Incident) => {
        return {
            name: data.properties?.name,
        };
    };

    getOverridePropertiesFromEntity = (data: Incident) => {
        return {
            name: data.properties?.name,
        };
    };
}
