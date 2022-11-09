import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Tag } from 'antd';
import { EntityType, Owner } from '../../../types.generated';
import CustomAvatar from './CustomAvatar';
import EntityRegistry from '../../entity/EntityRegistry';
import { SpacedAvatarGroup } from './SpaceAvatarGroup';

const OwnerTag = styled(Tag)`
    padding: 2px;
    padding-right: 6px;
    margin-bottom: 8px;
    display: inline-flex;
    align-items: center;
`;

type Props = {
    owners?: Array<Owner> | null;
    entityRegistry: EntityRegistry;
    maxCount?: number;
    size?: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AvatarsGroup({ owners, entityRegistry, maxCount = 6, size }: Props) {
    if (!owners || owners.length === 0) {
        return null;
    }
    return (
        <SpacedAvatarGroup maxCount={maxCount}>
            {(owners || [])?.map((owner, key) => (
                // eslint-disable-next-line react/no-array-index-key
                <div data-testid={`avatar-tag-${owner.owner.urn}`} key={`${owner.owner.urn}-${key}`}>
                    {owner.owner.__typename === 'CorpUser' ? (
                        <CustomAvatar
                            size={size}
                            name={entityRegistry.getDisplayName(EntityType.CorpUser, owner.owner)}
                            url={`/${entityRegistry.getPathName(owner.owner.type)}/${owner.owner.urn}`}
                            photoUrl={
                                owner.owner?.editableProperties?.pictureLink ||
                                owner.owner?.editableInfo?.pictureLink ||
                                undefined
                            }
                        />
                    ) : (
                        owner.owner.__typename === 'CorpGroup' && (
                            <OwnerTag>
                                <Link to={`/${entityRegistry.getPathName(owner.owner.type)}/${owner.owner.urn}`}>
                                    <CustomAvatar
                                        name={entityRegistry.getDisplayName(EntityType.CorpGroup, owner.owner)}
                                    />
                                    <>{entityRegistry.getDisplayName(EntityType.CorpGroup, owner.owner)}</>
                                </Link>
                            </OwnerTag>
                        )
                    )}
                </div>
            ))}
        </SpacedAvatarGroup>
    );
}
