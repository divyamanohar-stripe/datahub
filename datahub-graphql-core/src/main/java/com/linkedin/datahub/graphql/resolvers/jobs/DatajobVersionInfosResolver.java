package com.linkedin.datahub.graphql.resolvers.jobs;

import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.generated.DataJobVersionInfosResult;
import com.linkedin.datahub.graphql.generated.VersionInfosInput;
import com.linkedin.datahub.graphql.generated.DataJobVersionInfo;
import com.linkedin.datahub.graphql.generated.Entity;
import com.linkedin.datahub.graphql.types.common.mappers.StringMapMapper;
import com.linkedin.datajob.VersionInfo;
import com.linkedin.entity.client.EntityClient;

import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import static com.linkedin.datahub.graphql.resolvers.ResolverUtils.bindArgument;

public class DatajobVersionInfosResolver implements DataFetcher<CompletableFuture<DataJobVersionInfosResult>> {

  private static final String VERSION_INFO_ASPECT_NAME = "versionInfo";
  private static final Integer DEFAULT_START = 0;
  private static final Integer DEFAULT_COUNT = 20;
  private static final VersionInfosInput DEFAULT_VERSION_INFOS_INPUT = new VersionInfosInput();

  private final EntityClient _entityClient;

  public DatajobVersionInfosResolver(final EntityClient entityClient) {
    _entityClient = entityClient;
  }

  @Override
  public CompletableFuture<DataJobVersionInfosResult> get(DataFetchingEnvironment environment) {
    return CompletableFuture.supplyAsync(() -> {
      final QueryContext context = environment.getContext();

      final String entityUrn = ((Entity) environment.getSource()).getUrn();
      final VersionInfosInput input = bindArgument(
          environment.getArgumentOrDefault("input", DEFAULT_VERSION_INFOS_INPUT),
          VersionInfosInput.class);

      final Integer start = input.getStart() != null ? input.getStart() : DEFAULT_START;
      final Integer count = input.getCount() != null ? input.getCount() : DEFAULT_COUNT;

      try {
        List<VersionInfo> versionInfoAspects =
            _entityClient.listVersionedAspects(entityUrn, VERSION_INFO_ASPECT_NAME, new Long(count), new Long(start),
                VersionInfo.class, context.getAuthentication());

        final DataJobVersionInfosResult result = new DataJobVersionInfosResult();
        result.setCount(count);
        result.setStart(start);
        result.setTotal(versionInfoAspects.size());
        result.setVersionInfos(
            versionInfoAspects.stream().map(e -> toDataJobVersionInfo(e)).collect(Collectors.toList()));

        return result;
      } catch (Exception e) {
        throw new RuntimeException(String.format("Failed to retrieve a list of versionInfo with urn: %s, start: %d,"
            + " count: %d", entityUrn, start, count), e);
      }
    });
  }

  private DataJobVersionInfo toDataJobVersionInfo(VersionInfo versionInfo) {
      final DataJobVersionInfo dataJobVersionInfo = new DataJobVersionInfo();
      if (versionInfo.hasVersion()) {
        dataJobVersionInfo.setVersion(versionInfo.getVersion());
      }
      if (versionInfo.hasVersionType()) {
        dataJobVersionInfo.setVersionType(versionInfo.getVersionType());
      }
      if (versionInfo.hasExternalUrl()) {
        dataJobVersionInfo.setExternalUrl(versionInfo.getExternalUrl().toString());
      }
      if (versionInfo.hasCustomProperties()) {
        dataJobVersionInfo.setCustomProperties(StringMapMapper.map(versionInfo.getCustomProperties()));
      }

      return dataJobVersionInfo;
  }
}
