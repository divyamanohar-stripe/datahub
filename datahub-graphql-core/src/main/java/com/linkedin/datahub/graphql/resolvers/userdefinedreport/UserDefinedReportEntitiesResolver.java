package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import java.util.Collections;
import java.util.concurrent.CompletableFuture;

import com.codahale.metrics.Timer;
import com.google.common.collect.ImmutableList;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.generated.UserDefinedReport;
import com.linkedin.datahub.graphql.generated.UserDefinedReportEntitiesInput;
import com.linkedin.datahub.graphql.generated.SearchResults;
import com.linkedin.datahub.graphql.types.mappers.UrnSearchResultsMapper;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.metadata.query.filter.Condition;
import com.linkedin.metadata.query.filter.ConjunctiveCriterion;
import com.linkedin.metadata.query.filter.ConjunctiveCriterionArray;
import com.linkedin.metadata.query.filter.Criterion;
import com.linkedin.metadata.query.filter.CriterionArray;
import com.linkedin.metadata.query.filter.Filter;
import com.linkedin.metadata.utils.metrics.MetricUtils;

import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;

import static com.linkedin.datahub.graphql.resolvers.ResolverUtils.bindArgument;

/**
 * [STRIPE_CONTRIBUTION]
 * Resolves the entities in a particular UserDefinedReport.
 */
public class UserDefinedReportEntitiesResolver implements DataFetcher<CompletableFuture<SearchResults>> {

    private static final String USER_DEFINED_REPORTS_FIELD_NAME = "userDefinedReports";
    private static final String INPUT_ARG_NAME = "input";
    private static final String DEFAULT_QUERY = "*";
    private static final Integer DEFAULT_START = 0;
    private static final Integer DEFAULT_COUNT = 20;
    private static final UserDefinedReportEntitiesInput DEFAULT_ENTITIES_INPUT = new UserDefinedReportEntitiesInput();

    private final EntityClient _entityClient;

    public UserDefinedReportEntitiesResolver(final EntityClient entityClient) {
        _entityClient = entityClient;
    }

    @Override
    public CompletableFuture<SearchResults> get(DataFetchingEnvironment environment) throws Exception {
        final QueryContext context = environment.getContext();
        final String urn = ((UserDefinedReport) environment.getSource()).getUrn();

        final UserDefinedReportEntitiesInput input = environment.getArgument(INPUT_ARG_NAME) != null
                ? bindArgument(environment.getArgument(INPUT_ARG_NAME), UserDefinedReportEntitiesInput.class)
                : DEFAULT_ENTITIES_INPUT;

        final String query = input.getQuery() != null ? input.getQuery() : DEFAULT_QUERY;
        final int start = input.getStart() != null ? input.getStart() : DEFAULT_START;
        final int count = input.getCount() != null ? input.getCount() : DEFAULT_COUNT;

        return CompletableFuture.supplyAsync(() -> {
            try (Timer.Context ignored = MetricUtils.timer(this.getClass(), "mainQuery").time()) {

                final Criterion filterCriterion = new Criterion()
                        .setField(USER_DEFINED_REPORTS_FIELD_NAME + ".keyword")
                        .setCondition(Condition.EQUAL)
                        .setValue(urn);

                return UrnSearchResultsMapper.map(_entityClient.searchAcrossEntities(
                        Collections.emptyList(),
                        query,
                        new Filter().setOr(new ConjunctiveCriterionArray(
                                new ConjunctiveCriterion()
                                        .setAnd(new CriterionArray(ImmutableList.of(filterCriterion))))),
                        start,
                        count,
                        context.getAuthentication()));

            } catch (Exception e) {
                throw new RuntimeException(
                        String.format("Failed to resolve entities associated with UserDefinedReport with urn %s", urn), e);
            }
        });
    }

}
