package com.linkedin.datahub.graphql.resolvers.mutate.util;

import com.google.common.collect.ImmutableList;

import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.authorization.AuthorizationUtils;
import com.linkedin.datahub.graphql.authorization.ConjunctivePrivilegeGroup;
import com.linkedin.datahub.graphql.authorization.DisjunctivePrivilegeGroup;
import com.linkedin.metadata.authorization.PoliciesConfig;
import javax.annotation.Nonnull;

public class UserDefinedReportUtils {
    private static final ConjunctivePrivilegeGroup ALL_PRIVILEGES_GROUP = new ConjunctivePrivilegeGroup(
            ImmutableList.of(
                    PoliciesConfig.EDIT_ENTITY_PRIVILEGE.getType()));

    private UserDefinedReportUtils() {
    }

    public static boolean isAuthorizedToUpdateUserDefinedReportsForEntity(@Nonnull QueryContext context, Urn entityUrn) {
        final DisjunctivePrivilegeGroup orPrivilegeGroups = new DisjunctivePrivilegeGroup(ImmutableList.of(
                ALL_PRIVILEGES_GROUP,
                new ConjunctivePrivilegeGroup(
                        ImmutableList.of(PoliciesConfig.EDIT_ENTITY_USER_DEFINED_REPORTS_PRIVILEGE.getType()))));

        return AuthorizationUtils.isAuthorized(
                context.getAuthorizer(),
                context.getActorUrn(),
                entityUrn.getEntityType(),
                entityUrn.toString(),
                orPrivilegeGroups);
    }
}
