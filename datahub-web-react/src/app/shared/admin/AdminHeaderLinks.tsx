import styled from 'styled-components';
import * as React from 'react';
import {
    ApiOutlined,
    BankOutlined,
    BarChartOutlined,
    SettingOutlined,
    UsergroupAddOutlined,
    FolderOutlined,
    DashboardOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { useAppConfig } from '../../useAppConfig';
import { useGetAuthenticatedUser } from '../../useGetAuthenticatedUser';

const AdminLink = styled.span`
    margin-right: 4px;
`;

export function AdminHeaderLinks() {
    const me = useGetAuthenticatedUser();
    const { config } = useAppConfig();

    const isAnalyticsEnabled = config?.analyticsConfig.enabled;
    const isPoliciesEnabled = config?.policiesConfig.enabled;
    const isIdentityManagementEnabled = config?.identityManagementConfig.enabled;
    const isIngestionEnabled = config?.managedIngestionConfig.enabled;

    /* The user seems to be missing a place for teams. 
        I thought this info was emitted but for now using just the edittable properties
    */
    const showTeamLink = (me && me?.corpUser.editableProperties?.teams) || false;
    const team = me?.corpUser.editableProperties?.teams?.at(0)?.toLowerCase().split(' ').join('_');
    const showAnalytics = (isAnalyticsEnabled && me && me.platformPrivileges.viewAnalytics) || false;
    const showPolicyBuilder = (isPoliciesEnabled && me && me.platformPrivileges.managePolicies) || false;
    const showIdentityManagement =
        (isIdentityManagementEnabled && me && me.platformPrivileges.manageIdentities) || false;
    const showSettings = true;
    const showIngestion =
        isIngestionEnabled && me && me.platformPrivileges.manageIngestion && me.platformPrivileges.manageSecrets;
    const showDomains = me?.platformPrivileges?.manageDomains || false;
    const showUserDefinedReports = me?.platformPrivileges?.manageUserDefinedReports || false;

    return (
        <>
            {showTeamLink && (
                <AdminLink>
                    <Link to={`/group/urn:li:corpGroup:${team}`}>
                        <Button type="text">
                            <TeamOutlined /> My Team
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showAnalytics && (
                <AdminLink>
                    <Link to="/analytics">
                        <Button type="text">
                            <BarChartOutlined /> Analytics
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showDomains && (
                <AdminLink>
                    <Link to="/domains">
                        <Button type="text">
                            <FolderOutlined /> Domains
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showIdentityManagement && (
                <AdminLink>
                    <Link to="/identities">
                        <Button type="text">
                            <UsergroupAddOutlined /> Users & Groups
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showIngestion && (
                <AdminLink>
                    <Link to="/ingestion">
                        <Button type="text">
                            <ApiOutlined /> Ingestion
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showPolicyBuilder && (
                <AdminLink>
                    <Link to="/policies">
                        <Button type="text">
                            <BankOutlined /> Policies
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showUserDefinedReports && (
                <AdminLink>
                    <Link to="/user-defined-reports">
                        <Button type="text">
                            <DashboardOutlined /> User Defined Reports
                        </Button>
                    </Link>
                </AdminLink>
            )}
            {showSettings && (
                <AdminLink style={{ marginRight: 16 }}>
                    <Link to="/settings">
                        <Button type="text">
                            <SettingOutlined />
                        </Button>
                    </Link>
                </AdminLink>
            )}
        </>
    );
}
