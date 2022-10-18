import { FetchResult, MutationFunctionOptions } from '@apollo/client';

import {
    Container,
    DataPlatform,
    DatasetEditableProperties,
    DatasetEditablePropertiesUpdate,
    Deprecation,
    Domain,
    EditableSchemaMetadata,
    EditableSchemaMetadataUpdate,
    EntityLineageResult,
    EntityType,
    GlobalTags,
    GlobalTagsUpdate,
    GlossaryTerms,
    Health,
    InstitutionalMemory,
    InstitutionalMemoryUpdate,
    Maybe,
    Ownership,
    OwnershipUpdate,
    RawAspect,
    SchemaMetadata,
    Status,
    StringMapEntry,
    SubTypes,
    UserDefinedReport,
} from '../../../types.generated';
import { FetchedEntity } from '../../lineage/types';

export type EntityTab = {
    name: string;
    component: React.FunctionComponent<{ properties?: any }>;
    display?: {
        visible: (GenericEntityProperties, T) => boolean; // Whether the tab is visible on the UI. Defaults to true.
        enabled: (GenericEntityProperties, T) => boolean; // Whether the tab is enabled on the UI. Defaults to true.
    };
    properties?: any;
};

export type EntitySidebarSection = {
    component: React.FunctionComponent<{ properties?: any }>;
    display?: {
        visible: (GenericEntityProperties, T) => boolean; // Whether the sidebar is visible on the UI. Defaults to true.
    };
    properties?: any;
};

export type GenericEntityProperties = {
    urn?: string;
    name?: Maybe<string>;
    properties?: Maybe<{
        description?: Maybe<string>;
        qualifiedName?: Maybe<string>;
    }>;
    globalTags?: Maybe<GlobalTags>;
    glossaryTerms?: Maybe<GlossaryTerms>;
    ownership?: Maybe<Ownership>;
    domain?: Maybe<Domain>;
    userDefinedReports?: Maybe<UserDefinedReport[]>;
    platform?: Maybe<DataPlatform>;
    customProperties?: Maybe<StringMapEntry[]>;
    institutionalMemory?: Maybe<InstitutionalMemory>;
    schemaMetadata?: Maybe<SchemaMetadata>;
    externalUrl?: Maybe<string>;
    // to indicate something is a Stream, View instead of Dataset... etc
    entityTypeOverride?: Maybe<string>;
    /** Dataset specific- TODO, migrate these out */
    editableSchemaMetadata?: Maybe<EditableSchemaMetadata>;
    editableProperties?: Maybe<DatasetEditableProperties>;
    autoRenderAspects?: Maybe<Array<RawAspect>>;
    upstream?: Maybe<EntityLineageResult>;
    downstream?: Maybe<EntityLineageResult>;
    subTypes?: Maybe<SubTypes>;
    entityCount?: number;
    runtimeSLO?: Maybe<{
        runtimeSLO: number;
    }>;
    container?: Maybe<Container>;
    health?: Maybe<Health>;
    status?: Maybe<Status>;
    deprecation?: Maybe<Deprecation>;
};

export type GenericEntityUpdate = {
    editableProperties?: Maybe<DatasetEditablePropertiesUpdate>;
    globalTags?: Maybe<GlobalTagsUpdate>;
    ownership?: Maybe<OwnershipUpdate>;
    institutionalMemory?: Maybe<InstitutionalMemoryUpdate>;
    /** Dataset specific- TODO, migrate these out */
    editableSchemaMetadata?: Maybe<EditableSchemaMetadataUpdate>;
};

export type UpdateEntityType<U> = (
    options?:
        | MutationFunctionOptions<
              U,
              {
                  urn: string;
                  input: GenericEntityUpdate;
              }
          >
        | undefined,
) => Promise<FetchResult<U, Record<string, any>, Record<string, any>>>;

export type EntityContextType = {
    urn: string;
    entityType: EntityType;
    entityData: GenericEntityProperties | null;
    baseEntity: any;
    updateEntity?: UpdateEntityType<any> | null;
    routeToTab: (params: { tabName: string; tabParams?: Record<string, any>; method?: 'push' | 'replace' }) => void;
    refetch: () => Promise<any>;
    lineage: FetchedEntity | undefined;
};

export type RequiredAndNotNull<T> = {
    [P in keyof T]-?: Exclude<T[P], null | undefined>;
};

export type EntityAndType = {
    urn: string;
    type: EntityType;
};

export type DataJobEntityWithVersions = {
    type: EntityType.DataJob;
    urn: string;
    jobId: string;
    versionInfo?: {
        total: number;
        versionInfos: {
            customProperties?: {
                key: string;
                value: string;
            }[];
            version: string;
            versionType: string;
            externalUrl?: string;
        }[];
    };
};
