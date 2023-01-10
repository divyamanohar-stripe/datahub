import React from 'react';
import moment from 'moment-timezone';
import { Descriptions } from 'antd';
import { CompactEntityNameList } from '../../../../../recommendations/renderer/component/CompactEntityNameList';

/**
 * render header of chart with title: "Team: did task succeed in SLA?"
 * @param taskId taskId of DataJob
 * @param dataJobEntity data job entity to render
 */
export const DataJobPlotHeader = ({ dataJobEntity }: { dataJobEntity: any }) => {
    const finishedBySLAHours = dataJobEntity?.slaInfo?.errorFinishedBy
        ? moment
              .duration(dataJobEntity.slaInfo.errorFinishedBy, 'seconds')
              .asHours()
              .toFixed(2)
              .replace(/[.,]00$/, '')
        : 'unknown'; // round to 2 decimal places if not whole number

    return (
        <Descriptions
            title={
                <span>
                    {`Did `}
                    <CompactEntityNameList entities={[dataJobEntity]} />
                    {` succeed in ${finishedBySLAHours} hours?`}
                </span>
            }
            bordered
            style={{ marginTop: '15px' }}
        />
    );
};
