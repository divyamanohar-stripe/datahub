import React, { ErrorInfo, ReactNode } from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import { ReactComponent as LoadingSvg } from '../../../images/datahub-logo-color-loading_pendulum.svg';

const { Title } = Typography;

export const ExternalUrlLink = styled.a`
    font-size: 16px;
    color: grey;
`;

export function convertSecsToHumanReadable(seconds: number, truncateToMins = false) {
    const oriSeconds = seconds;
    const floatingPart = oriSeconds - Math.floor(oriSeconds);

    let secondsFloor = Math.floor(seconds);

    const secondsPerHour = 60 * 60;
    const secondsPerMinute = 60;

    const hours = Math.floor(secondsFloor / secondsPerHour);
    secondsFloor -= hours * secondsPerHour;

    const minutes = Math.floor(secondsFloor / secondsPerMinute);
    secondsFloor -= minutes * secondsPerMinute;

    let readableFormat = '';
    if (hours > 0) {
        readableFormat += `${hours}Hours `;
    }
    if (minutes > 0) {
        readableFormat += `${minutes}Min `;
    }
    if (truncateToMins) {
        return readableFormat === '' ? '0Mins' : readableFormat;
    }
    if (secondsFloor + floatingPart > 0) {
        if (Math.floor(oriSeconds) === oriSeconds) {
            readableFormat += `${secondsFloor}Sec `;
        } else {
            secondsFloor += floatingPart;
            readableFormat += `${secondsFloor.toFixed(2)}Sec`;
        }
    }
    return readableFormat;
}

// Styles
const LoadingText = styled.div`
    margin-top: 18px;
    font-size: 12px;
`;

const LoadingContainer = styled.div`
    padding-top: 40px;
    padding-bottom: 40px;
    width: 100%;
    text-align: center;
`;

export const loadingPage = (
    <LoadingContainer>
        <LoadingSvg height={80} width={80} />
        <LoadingText>Fetching data...</LoadingText>
    </LoadingContainer>
);

export class ErrorBoundary extends React.Component<
    { children: ReactNode; fallback?: ReactNode },
    { errorInfo: ErrorInfo } | { errorInfo: null }
> {
    constructor(props) {
        super(props);
        this.state = { errorInfo: null };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.errorInfo) {
            return (
                this.props.fallback ?? (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            padding: '20px',
                        }}
                    >
                        <Title level={3} type="danger">
                            Error: Data could not be loaded
                        </Title>
                    </div>
                )
            );
        }
        return this.props.children;
    }
}
