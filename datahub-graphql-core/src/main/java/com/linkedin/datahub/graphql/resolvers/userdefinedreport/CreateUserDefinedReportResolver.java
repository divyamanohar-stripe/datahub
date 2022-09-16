package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import com.google.common.collect.ImmutableList;
import com.linkedin.data.template.SetMode;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.authorization.AuthorizationUtils;
import com.linkedin.datahub.graphql.authorization.ConjunctivePrivilegeGroup;
import com.linkedin.datahub.graphql.authorization.DisjunctivePrivilegeGroup;
import com.linkedin.datahub.graphql.exception.AuthorizationException;
import com.linkedin.datahub.graphql.generated.CreateUserDefinedReportInput;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.events.metadata.ChangeType;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.authorization.PoliciesConfig;
import com.linkedin.metadata.key.UserDefinedReportKey;
import com.linkedin.metadata.utils.GenericRecordUtils;
import com.linkedin.mxe.MetadataChangeProposal;
import com.linkedin.userdefinedreport.UserDefinedReportProperties;
import com.linkedin.userdefinedreport.UserDefinedReportType;

import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;

import static com.linkedin.datahub.graphql.resolvers.ResolverUtils.bindArgument;

/**
 * [STRIPE_CONTRIBUTION] Resolver used for creating a new user defined report on
 * DataHub. Requires the MANAGE_USER_DEFINED_REPORTS privilege.
 */
@RequiredArgsConstructor
public class CreateUserDefinedReportResolver implements DataFetcher<CompletableFuture<String>> {
  private final EntityClient _entityClient;

  @Override
  public CompletableFuture<String> get(DataFetchingEnvironment environment) throws Exception {

    final QueryContext context = environment.getContext();
    final CreateUserDefinedReportInput input = bindArgument(environment.getArgument("input"),
        CreateUserDefinedReportInput.class);

    return CompletableFuture.supplyAsync(() -> {

      if (!isAuthorizedToCreateUserDefinedReport(context)) {
        throw new AuthorizationException(
            "Unauthorized to perform this action. Please contact your DataHub administrator.");
      }

      // TODO: Add exists check. Currently this can override previously created
      // user defined reports.

      try {
        // Create the user defined report Key
        final UserDefinedReportKey key = new UserDefinedReportKey();

        // Take user provided id OR generate a random UUID for the user defined report.
        final String id = input.getId() != null ? input.getId() : UUID.randomUUID().toString();
        key.setId(id);

        // Create the MCP
        final MetadataChangeProposal proposal = new MetadataChangeProposal();
        proposal.setEntityKeyAspect(GenericRecordUtils.serializeAspect(key));
        proposal.setEntityType(Constants.USER_DEFINED_REPORT_ENTITY_NAME);
        proposal.setAspectName(Constants.USER_DEFINED_REPORT_PROPERTIES_ASPECT_NAME);
        proposal.setAspect(GenericRecordUtils.serializeAspect(mapUserDefinedReportProperties(input)));
        proposal.setChangeType(ChangeType.UPSERT);
        return _entityClient.ingestProposal(proposal, context.getAuthentication());
      } catch (Exception e) {
        throw new RuntimeException(
            String.format("Failed to create user defined report with id: %s, name: %s", input.getId(), input.getName()),
            e);
      }
    });
  }

  private UserDefinedReportProperties mapUserDefinedReportProperties(final CreateUserDefinedReportInput input) {
    final UserDefinedReportProperties result = new UserDefinedReportProperties();
    result.setName(input.getName());
    result.setType(UserDefinedReportType.valueOf(input.getType().toString()));
    result.setDescription(input.getDescription(), SetMode.IGNORE_NULL);
    return result;
  }

  private boolean isAuthorizedToCreateUserDefinedReport(final QueryContext context) {
    final DisjunctivePrivilegeGroup orPrivilegeGroups = new DisjunctivePrivilegeGroup(
        ImmutableList.of(new ConjunctivePrivilegeGroup(
            ImmutableList.of(PoliciesConfig.MANAGE_USER_DEFINED_REPORTS_PRIVILEGE.getType()))));

    return AuthorizationUtils.isAuthorized(context.getAuthorizer(), context.getActorUrn(), orPrivilegeGroups);
  }

}
