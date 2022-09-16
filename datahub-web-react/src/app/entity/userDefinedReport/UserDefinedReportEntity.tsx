import React from 'react';
import { DashboardOutlined } from '@ant-design/icons';
import { useGetUserDefinedReportQuery } from '../../../graphql/userDefinedReport.generated';
import { EntityType, UserDefinedReport, SearchResult } from '../../../types.generated';
import { Entity, IconStyleType, PreviewType } from '../Entity';
import { EntityProfile } from '../shared/containers/profile/EntityProfile';
import { SidebarOwnerSection } from '../shared/containers/profile/sidebar/Ownership/SidebarOwnerSection';
import { SidebarAboutSection } from '../shared/containers/profile/sidebar/SidebarAboutSection';
import { DocumentationTab } from '../shared/tabs/Documentation/DocumentationTab';
import { GenericEntityProperties } from '../shared/types';
import { Preview } from './preview/Preview';
import { UserDefinedReportContentTab } from './profile/UserDefinedReportContentTab';
import { UserDefinedReportEntitiesTab } from './profile/UserDefinedReportEntitiesTab';

/**
 * Definition of the DataHub UserDefinedReport entity.
 */
export class UserDefinedReportEntity implements Entity<UserDefinedReport> {
    type: EntityType = EntityType.UserDefinedReport;

    icon: (fontSize: number, styleType: IconStyleType) => JSX.Element = (
        fontSize: number,
        styleType: IconStyleType,
    ) => {
        if (styleType === IconStyleType.TAB_VIEW) {
            return <DashboardOutlined />;
        }

        if (styleType === IconStyleType.HIGHLIGHT) {
            return <DashboardOutlined style={{ fontSize, color: '#B37FEB' }} />;
        }

        return (
            <DashboardOutlined
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

    getPathName: () => string = () => 'user-defined-report';

    getCollectionName: () => string = () => 'UserDefinedReports';

    getEntityName?: (() => string) | undefined = () => 'UserDefinedReport';

    renderProfile: (urn: string) => JSX.Element = (urn: string) => {
        return (
            <EntityProfile
                urn={urn}
                entityType={EntityType.UserDefinedReport}
                useEntityQuery={useGetUserDefinedReportQuery}
                useUpdateQuery={undefined}
                getOverrideProperties={this.getOverridePropertiesFromEntity}
                tabs={[
                    {
                        name: 'Content',
                        component: UserDefinedReportContentTab,
                    },
                    {
                        name: 'Entities',
                        component: UserDefinedReportEntitiesTab,
                    },
                    {
                        name: 'Documentation',
                        component: DocumentationTab,
                    },
                ]}
                sidebarSections={[
                    {
                        component: SidebarAboutSection,
                    },
                    {
                        component: SidebarOwnerSection,
                        properties: {
                            hideOwnerType: true,
                        },
                    },
                ]}
            />
        );
    };

    renderPreview: (type: PreviewType, data: UserDefinedReport) => JSX.Element = (
        _type: PreviewType,
        data: UserDefinedReport,
    ) => {
        return (
            <Preview
                urn={data.urn}
                name={this.displayName(data)}
                description={data.properties?.description}
                owners={data.ownership?.owners}
                count={data.entities?.total}
                logoComponent={this.icon(12, IconStyleType.ACCENT)}
            />
        );
    };

    renderSearch: (result: SearchResult) => JSX.Element = (result: SearchResult) => {
        const data = result.entity as UserDefinedReport;
        return (
            <Preview
                urn={data.urn}
                name={this.displayName(data)}
                description={data.properties?.description}
                owners={data.ownership?.owners}
                count={data.entities?.total}
                logoComponent={this.icon(12, IconStyleType.ACCENT)}
            />
        );
    };

    displayName: (data: UserDefinedReport) => string = (data: UserDefinedReport) => {
        return data?.properties?.name || data?.id;
    };

    getGenericEntityProperties: (data: UserDefinedReport) => GenericEntityProperties | null = (
        data: UserDefinedReport,
    ) => {
        return {
            name: data.properties?.name,
        };
    };

    getOverridePropertiesFromEntity = (data: UserDefinedReport) => {
        return {
            name: data.properties?.name,
        };
    };
}
