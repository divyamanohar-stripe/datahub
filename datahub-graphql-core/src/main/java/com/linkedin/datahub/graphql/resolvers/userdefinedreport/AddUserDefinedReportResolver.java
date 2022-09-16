package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import com.linkedin.common.UrnArray;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.exception.AuthorizationException;
import com.linkedin.datahub.graphql.resolvers.mutate.util.UserDefinedReportUtils;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.events.metadata.ChangeType;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.entity.EntityService;
import com.linkedin.metadata.utils.GenericRecordUtils;
import com.linkedin.mxe.MetadataChangeProposal;
import com.linkedin.userdefinedreport.UserDefinedReports;

import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;

import static com.linkedin.datahub.graphql.resolvers.mutate.MutationUtils.getAspectFromEntity;

/**
 * Resolver used for adding a user defined report to an entity. Requires the
 * EDIT_USER_DEFINED_REPORTS_PRIVILEGE privilege for a particular entity.
 */
@RequiredArgsConstructor
public class AddUserDefinedReportResolver implements DataFetcher<CompletableFuture<Boolean>> {
    private final EntityClient _entityClient;
    private final EntityService _entityService; // TODO: Remove this when 'exists' added to EntityClient

    @Override
    public CompletableFuture<Boolean> get(DataFetchingEnvironment environment) throws Exception {
        final QueryContext context = environment.getContext();
        final Urn entityUrn = Urn.createFromString(environment.getArgument("entityUrn"));
        final Urn userDefinedReportUrn = Urn.createFromString(environment.getArgument("userDefinedReportUrn"));

        return CompletableFuture.supplyAsync(() -> {

            if (!UserDefinedReportUtils.isAuthorizedToUpdateUserDefinedReportsForEntity(environment.getContext(),
                    entityUrn)) {
                throw new AuthorizationException(
                        "Unauthorized to perform this action. Please contact your DataHub administrator.");
            }
            validateAddUserDefinedReportInput(entityUrn, userDefinedReportUrn, _entityService);
            try {
                UserDefinedReports userDefinedReports = (UserDefinedReports) getAspectFromEntity(entityUrn.toString(),
                        Constants.USER_DEFINED_REPORTS_ASPECT_NAME, _entityService, new UserDefinedReports());
                addUserDefinedReport(userDefinedReports, userDefinedReportUrn);

                // Create the user defined reports aspects
                final MetadataChangeProposal proposal = new MetadataChangeProposal();
                proposal.setEntityUrn(entityUrn);
                proposal.setEntityType(entityUrn.getEntityType());
                proposal.setAspectName(Constants.USER_DEFINED_REPORTS_ASPECT_NAME);
                proposal.setAspect(GenericRecordUtils.serializeAspect(userDefinedReports));
                proposal.setChangeType(ChangeType.UPSERT);
                _entityClient.ingestProposal(proposal, context.getAuthentication());
                return true;
            } catch (Exception e) {
                throw new RuntimeException(String.format("Failed to add user defined report %s to entity %s",
                        userDefinedReportUrn, entityUrn), e);
            }
        });
    }

    public static Boolean validateAddUserDefinedReportInput(Urn entityUrn, Urn userDefinedReportUrn,
            EntityService entityService) {

        if (!entityService.exists(userDefinedReportUrn)) {
            throw new IllegalArgumentException(String.format(
                    "Failed to add Entity %s to user defined report %s. User defined report does not exist.", entityUrn,
                    userDefinedReportUrn));
        }

        if (!entityService.exists(entityUrn)) {
            throw new IllegalArgumentException(
                    String.format("Failed to add Entity %s to user defined report %s. Entity does not exist.",
                            entityUrn, userDefinedReportUrn));
        }

        return true;
    }

    private static void addUserDefinedReport(UserDefinedReports userDefinedReports, Urn userDefinedReportUrn) {
        if (userDefinedReports.hasUserDefinedReports()) {
            userDefinedReports.getUserDefinedReports().add(userDefinedReportUrn);
        } else {
            final UrnArray newUserDefinedReport = new UrnArray();
            newUserDefinedReport.add(userDefinedReportUrn);
            userDefinedReports.setUserDefinedReports(newUserDefinedReport);
        }
    }

}
