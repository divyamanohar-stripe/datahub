package com.linkedin.datahub.graphql.types.userdefinedreport;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.google.common.collect.ImmutableSet;
import com.linkedin.common.urn.Urn;
import com.linkedin.common.urn.UrnUtils;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.generated.EntityType;
import com.linkedin.datahub.graphql.generated.UserDefinedReport;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.metadata.Constants;

import graphql.execution.DataFetcherResult;

public class UserDefinedReportType implements com.linkedin.datahub.graphql.types.EntityType<UserDefinedReport> {

    static final Set<String> ASPECTS_TO_RESOLVE = ImmutableSet.of(Constants.USER_DEFINED_REPORT_KEY_ASPECT_NAME,
            Constants.USER_DEFINED_REPORT_PROPERTIES_ASPECT_NAME, Constants.OWNERSHIP_ASPECT_NAME);

    private final EntityClient _entityClient;

    public UserDefinedReportType(EntityClient entityClient) {
        _entityClient = entityClient;
    }

    @Override
    public Class<UserDefinedReport> objectClass() {
        return UserDefinedReport.class;
    }

    @Override
    public List<DataFetcherResult<UserDefinedReport>> batchLoad(List<String> urns, QueryContext context)
            throws Exception {
        final List<Urn> userDefinedReportUrns = urns.stream().map(UrnUtils::getUrn).collect(Collectors.toList());

        try {
            final Map<Urn, EntityResponse> entities = _entityClient.batchGetV2(
                    Constants.USER_DEFINED_REPORT_ENTITY_NAME, new HashSet<>(userDefinedReportUrns), ASPECTS_TO_RESOLVE,
                    context.getAuthentication());

            final List<EntityResponse> gmsResults = new ArrayList<>();
            for (Urn urn : userDefinedReportUrns) {
                gmsResults.add(entities.getOrDefault(urn, null));
            }
            return gmsResults
                    .stream().map(
                            gmsResult -> gmsResult == null ? null
                                    : DataFetcherResult.<UserDefinedReport>newResult()
                                            .data(UserDefinedReportMapper.map(gmsResult)).build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new RuntimeException("Failed to batch load user defined reports", e);
        }
    }

    @Override
    public EntityType type() {
        return EntityType.USER_DEFINED_REPORT;
    }

}
