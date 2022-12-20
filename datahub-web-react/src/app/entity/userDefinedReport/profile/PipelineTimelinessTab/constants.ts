import moment from 'moment-timezone';
import styled from 'styled-components';

export const CLIENT_TZ = moment.tz.guess();
export const DATE_SEARCH_PARAM_FORMAT = 'YYYY-MM-DD HH:mm';
export const DATE_DISPLAY_FORMAT = 'MM/DD/YYYY HH:mm:ss';

export const ExternalUrlLink = styled.a`
    font-size: 16px;
    color: grey;
`;
