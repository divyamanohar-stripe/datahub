package com.linkedin.datahub.graphql.types.dataprocessinst.mappers;

import com.linkedin.datahub.graphql.types.mappers.ModelMapper;
import com.linkedin.datahub.graphql.types.common.mappers.OwnerMapper;
import com.linkedin.datahub.graphql.generated.DataProcessInsight;
import com.linkedin.datahub.graphql.generated.DataProcessInsightType;

import javax.annotation.Nonnull;

/**
 * Maps Pegasus {@link RecordTemplate} objects to objects conforming to the GQL schema.
 *
 * To be replaced by auto-generated mappers implementations
 */
public class InsightMapper implements ModelMapper<com.linkedin.dataprocess.DataProcessInstanceInsight, DataProcessInsight> {

    public static final InsightMapper INSTANCE = new InsightMapper();

    public static DataProcessInsight map(@Nonnull final com.linkedin.dataprocess.DataProcessInstanceInsight dataProcessInstanceInsight) {
        return INSTANCE.apply(dataProcessInstanceInsight);
    }

    @Override
    public DataProcessInsight apply(@Nonnull final com.linkedin.dataprocess.DataProcessInstanceInsight dataProcessInstanceInsight) {
        final DataProcessInsight result = new DataProcessInsight();
        result.setType(Enum.valueOf(DataProcessInsightType.class, dataProcessInstanceInsight.getType().toString()));
        result.setMessage(dataProcessInstanceInsight.getMessage());
        if (dataProcessInstanceInsight.hasLink()) {
            result.setLink(dataProcessInstanceInsight.getLink());
        }
        if (dataProcessInstanceInsight.hasOwner()) {
            result.setOwner(OwnerMapper.map(dataProcessInstanceInsight.getOwner()));
        }
        if (dataProcessInstanceInsight.hasRootCause()) {
            result.setRootCause(dataProcessInstanceInsight.getRootCause());
        }
        return result;
    }
}

