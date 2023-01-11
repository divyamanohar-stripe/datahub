package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import com.codahale.metrics.Timer;
import com.linkedin.common.UrnArray;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.authorization.AuthorizationUtils;
import com.linkedin.datahub.graphql.exception.AuthorizationException;
import com.linkedin.datahub.graphql.generated.EntityType;
import com.linkedin.datahub.graphql.generated.ListUserDefinedReportsInput;
import com.linkedin.datahub.graphql.generated.ListUserDefinedReportsResult;
import com.linkedin.datahub.graphql.generated.UserDefinedReport;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.query.ListResult;
import com.linkedin.metadata.utils.metrics.MetricUtils;

import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static com.linkedin.datahub.graphql.resolvers.ResolverUtils.bindArgument;

/**
 * [STRIPE_CONTRIBUTION]
 * Resolver used for listing all user defined reports defined within DataHub. Requires the
 * MANAGE_USER_DEFINED_REPORTS platform privilege.
 */
public class ListUserDefinedReportsResolver implements DataFetcher<CompletableFuture<ListUserDefinedReportsResult>> {

    private static final Integer DEFAULT_START = 0;
    private static final Integer DEFAULT_COUNT = 20;

    private final EntityClient _entityClient;

    public ListUserDefinedReportsResolver(final EntityClient entityClient) {
        _entityClient = entityClient;
    }

    @Override
    public CompletableFuture<ListUserDefinedReportsResult> get(DataFetchingEnvironment environment) throws Exception {
        final QueryContext context = environment.getContext();

        return CompletableFuture.supplyAsync(() -> {

            if (AuthorizationUtils.canManageUserDefinedReports(context)) {
                final ListUserDefinedReportsInput input = bindArgument(environment.getArgument("input"), ListUserDefinedReportsInput.class);
                final Integer start = input.getStart() == null ? DEFAULT_START : input.getStart();
                final Integer count = input.getCount() == null ? DEFAULT_COUNT : input.getCount();

                try (Timer.Context ignored = MetricUtils.timer(this.getClass(), environment.getOperationDefinition().getName()).time()) {
                    // First, get all group Urns.
                    final ListResult gmsResult = _entityClient.list(
                            Constants.USER_DEFINED_REPORT_ENTITY_NAME,
                            Collections.emptyMap(),
                            start,
                            count,
                            context.getAuthentication());

                    // Now that we have entities we can bind this to a result.
                    final ListUserDefinedReportsResult result = new ListUserDefinedReportsResult();
                    result.setStart(gmsResult.getStart());
                    result.setCount(gmsResult.getCount());
                    result.setTotal(gmsResult.getTotal());
                    result.setUserDefinedReports(mapUnresolvedUserDefinedReports(gmsResult.getEntities()));
                    return result;
                } catch (Exception e) {
                    throw new RuntimeException("Failed to list user defined reports", e);
                }
            }
            throw new AuthorizationException(
                    "Unauthorized to perform this action. Please contact your DataHub administrator.");
        });
    }

    // This method maps urns returned from the list endpoint into Partial UserDefinedReport
    // objects which will be resolved be a separate Batch resolver.
    private List<UserDefinedReport> mapUnresolvedUserDefinedReports(final UrnArray entityUrns) {
        final List<UserDefinedReport> results = new ArrayList<>();
        for (final Urn urn : entityUrns) {
            final UserDefinedReport unresolvedUserDefinedReport = new UserDefinedReport();
            unresolvedUserDefinedReport.setUrn(urn.toString());
            unresolvedUserDefinedReport.setType(EntityType.USER_DEFINED_REPORT);
            results.add(unresolvedUserDefinedReport);
        }
        return results;
    }

}
