import { blue, red } from '@ant-design/colors';

export const DATE_DAILY_DISPLAY_FORMAT = 'YYYY-MM-DD';
export const DATE_SEARCH_PARAM_FORMAT = 'YYYY-MM-DD HH:mm';
export const DATE_DISPLAY_TOOLTIP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Valid useage of non-null coercion
export const plotColorLegendMapping = {
    [red.primary!]: 'SLA Miss',
    [blue.primary!]: 'Did Not Miss SLA',
};
