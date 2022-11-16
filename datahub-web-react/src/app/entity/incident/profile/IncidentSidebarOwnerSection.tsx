import React from 'react';
import { Typography } from 'antd';
import { ExpandedOwner } from '../../shared/components/styled/ExpandedOwner';
import { EMPTY_MESSAGES } from '../../shared/constants';
import { useEntityData, useRefetch } from '../../shared/EntityContext';
import { SidebarHeader } from '../../shared/containers/profile/sidebar/SidebarHeader';

export const IncidentSidebarOwnerSection = () => {
    const { urn, entityData } = useEntityData();
    const refetch = useRefetch();
    const ownersEmpty = !entityData?.ownership?.owners?.length;

    return (
        <div>
            <SidebarHeader title="Involved Teams" />
            <div>
                {entityData?.ownership?.owners?.map((owner) => (
                    <ExpandedOwner key={owner.owner.urn} entityUrn={urn} owner={owner} refetch={refetch} />
                ))}
                {ownersEmpty && (
                    <Typography.Paragraph type="secondary">
                        {EMPTY_MESSAGES.owners.title}. {EMPTY_MESSAGES.owners.description}
                    </Typography.Paragraph>
                )}
            </div>
        </div>
    );
};
