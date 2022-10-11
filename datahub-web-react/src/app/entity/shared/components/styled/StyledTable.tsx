import styled from 'styled-components';
import { Table } from 'antd';
import { ANTD_GRAY } from '../../constants';

export const UpstreamStyledTable = styled(Table)`
    &&& .ant-table-cell {
        background-color: #e8f8f5;
    }
    &&& .ant-table-thead .ant-table-cell {
        font-weight: 600;
        font-size: 12px;
        color: #${ANTD_GRAY[4]};
    }
    &&
        .ant-table-thead
        > tr
        > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
        border: 1px solid #${ANTD_GRAY[8]};
    }
` as typeof Table;

export const CurrentStyledTable = styled(Table)`
    &&& .ant-table-cell {
        background-color: #d1f2eb;
    }
    &&& .ant-table-thead .ant-table-cell {
        font-weight: 600;
        font-size: 12px;
        color: #${ANTD_GRAY[4]};
    }
    &&
        .ant-table-thead
        > tr
        > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
        border: 1px solid #${ANTD_GRAY[8]};
    }
` as typeof Table;

export const StyledTable = styled(Table)`
    &&& .ant-table-cell {
        background-color: #fff;
    }
    &&& .ant-table-thead .ant-table-cell {
        font-weight: 600;
        font-size: 12px;
        color: ${ANTD_GRAY[8]};
    }
    &&
        .ant-table-thead
        > tr
        > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
        border: 1px solid ${ANTD_GRAY[4]};
    }
` as typeof Table;
// this above line preserves the Table component's generic-ness
