import React, { useState } from 'react';
import { message, Button } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

import analytics, { EventType, EntityActionType } from '../../../../../analytics';

import StyledMDEditor from '../../../components/styled/StyledMDEditor';
import TabToolbar from '../../../components/styled/TabToolbar';

import { GenericEntityUpdate } from '../../../types';
import { useEntityData, useEntityUpdate } from '../../../EntityContext';

export const DescriptionEditor = ({ onComplete }: { onComplete?: () => void }) => {
    const { urn, entityType, entityData } = useEntityData();
    const updateEntity = useEntityUpdate<GenericEntityUpdate>();

    const description = entityData?.editableProperties?.description || '';
    const [updatedDescription, setUpdatedDescription] = useState(description);

    const handleSaveDescription = async () => {
        message.loading({ content: 'Saving...' });
        try {
            await updateEntity({
                variables: { input: { urn, editableProperties: { description: updatedDescription || '' } } },
            });
            message.destroy();
            analytics.event({
                type: EventType.EntityActionEvent,
                actionType: EntityActionType.UpdateDescription,
                entityType,
                entityUrn: urn,
            });
            message.success({ content: 'Description Updated', duration: 2 });
            if (onComplete) onComplete();
        } catch (e) {
            message.destroy();
            message.error({ content: `Error updating description: \n ${e.message || ''}`, duration: 2 });
        }
    };

    return entityData ? (
        <>
            <TabToolbar>
                <Button type="text" onClick={onComplete}>
                    Cancel
                </Button>
                <Button onClick={handleSaveDescription}>
                    <CheckOutlined /> Save
                </Button>
            </TabToolbar>
            <StyledMDEditor
                value={description}
                onChange={(v) => setUpdatedDescription(v || '')}
                preview="live"
                visiableDragbar={false}
            />
        </>
    ) : null;
};
