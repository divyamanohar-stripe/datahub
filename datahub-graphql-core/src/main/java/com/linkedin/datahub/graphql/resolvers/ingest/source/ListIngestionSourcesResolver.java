package com.linkedin.datahub.graphql.resolvers.ingest.source;

import com.google.common.collect.ImmutableSet;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.exception.AuthorizationException;
import com.linkedin.datahub.graphql.generated.ListIngestionSourcesInput;
import com.linkedin.datahub.graphql.generated.ListIngestionSourcesResult;
import com.linkedin.datahub.graphql.resolvers.ingest.IngestionAuthUtils;
import com.linkedin.datahub.graphql.resolvers.ingest.IngestionResolverUtils;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.query.ListResult;
import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static com.linkedin.datahub.graphql.resolvers.ResolverUtils.*;

/**
 * Lists all ingestion sources stored within DataHub. Requires the MANAGE_INGESTION privilege.
 */
public class ListIngestionSourcesResolver implements DataFetcher<CompletableFuture<ListIngestionSourcesResult>> {

  private static final Integer DEFAULT_START = 0;
  private static final Integer DEFAULT_COUNT = 20;

  private final EntityClient _entityClient;

  public ListIngestionSourcesResolver(final EntityClient entityClient) {
    _entityClient = entityClient;
  }

  @Override
  public CompletableFuture<ListIngestionSourcesResult> get(final DataFetchingEnvironment environment) throws Exception {

    final QueryContext context = environment.getContext();

    if (IngestionAuthUtils.canManageIngestion(context)) {
      final ListIngestionSourcesInput input = bindArgument(environment.getArgument("input"), ListIngestionSourcesInput.class);
      final Integer start = input.getStart() == null ? DEFAULT_START : input.getStart();
      final Integer count = input.getCount() == null ? DEFAULT_COUNT : input.getCount();

      return CompletableFuture.supplyAsync(() -> {
        try {
          // First, get all ingestion sources Urns.
          final ListResult gmsResult = _entityClient.list(
              Constants.INGESTION_SOURCE_ENTITY_NAME,
              Collections.emptyMap(),
              start,
              count,
              context.getAuthentication());

          // Then, resolve all ingestion sources
          final Map<Urn, EntityResponse> entities = _entityClient.batchGetV2(
              Constants.INGESTION_SOURCE_ENTITY_NAME,
              new HashSet<>(gmsResult.getEntities()),
              ImmutableSet.of(Constants.INGESTION_INFO_ASPECT_NAME),
              context.getAuthentication());

          // Now that we have entities we can bind this to a result.
          final ListIngestionSourcesResult result = new ListIngestionSourcesResult();
          result.setStart(gmsResult.getStart());
          result.setCount(gmsResult.getCount());
          result.setTotal(gmsResult.getTotal());
          result.setIngestionSources(IngestionResolverUtils.mapIngestionSources(entities.values()));
          return result;

        } catch (Exception e) {
          throw new RuntimeException("Failed to list ingestion sources", e);
        }
      });
    }
    throw new AuthorizationException("Unauthorized to perform this action. Please contact your DataHub administrator.");
  }
}