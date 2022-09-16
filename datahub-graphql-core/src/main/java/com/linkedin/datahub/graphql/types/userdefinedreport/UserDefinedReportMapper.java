package com.linkedin.datahub.graphql.types.userdefinedreport;

import com.linkedin.common.Ownership;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.generated.EntityType;
import com.linkedin.datahub.graphql.generated.UserDefinedReport;
import com.linkedin.datahub.graphql.generated.UserDefinedReportType;
import com.linkedin.datahub.graphql.types.common.mappers.OwnershipMapper;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.EnvelopedAspect;
import com.linkedin.entity.EnvelopedAspectMap;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.key.UserDefinedReportKey;
import com.linkedin.userdefinedreport.UserDefinedReportProperties;

public class UserDefinedReportMapper {
  public static UserDefinedReport map(final EntityResponse entityResponse) {
    final UserDefinedReport result = new UserDefinedReport();
    final Urn entityUrn = entityResponse.getUrn();
    final EnvelopedAspectMap aspects = entityResponse.getAspects();

    result.setUrn(entityUrn.toString());
    result.setType(EntityType.USER_DEFINED_REPORT);

    // User defined reports MUST have key aspect to be rendered.
    final EnvelopedAspect envelopedUserDefinedReportKey = aspects.get(Constants.USER_DEFINED_REPORT_KEY_ASPECT_NAME);
    if (envelopedUserDefinedReportKey != null) {
      result.setId(new UserDefinedReportKey(envelopedUserDefinedReportKey.getValue().data()).getId());
    } else {
      return null;
    }

    final EnvelopedAspect envelopedUserDefinedReportProperties = aspects
        .get(Constants.USER_DEFINED_REPORT_PROPERTIES_ASPECT_NAME);
    if (envelopedUserDefinedReportProperties != null) {
      result.setProperties(mapUserDefinedReportProperties(
          new UserDefinedReportProperties(envelopedUserDefinedReportProperties.getValue().data())));
    }

    final EnvelopedAspect envelopedOwnership = aspects.get(Constants.OWNERSHIP_ASPECT_NAME);
    if (envelopedOwnership != null) {
      result.setOwnership(OwnershipMapper.map(new Ownership(envelopedOwnership.getValue().data())));
    }

    return result;
  }

  private static com.linkedin.datahub.graphql.generated.UserDefinedReportProperties mapUserDefinedReportProperties(
      final UserDefinedReportProperties propertiesPegasus) {
    final com.linkedin.datahub.graphql.generated.UserDefinedReportProperties propertiesGQL =
        new com.linkedin.datahub.graphql.generated.UserDefinedReportProperties();
    propertiesGQL.setName(propertiesPegasus.getName());
    propertiesGQL.setType(UserDefinedReportType.valueOf(propertiesPegasus.getType().toString()));
    if (propertiesPegasus.hasDescription()) {
      propertiesGQL.setDescription(propertiesPegasus.getDescription());
    }
    return propertiesGQL;
  }

  private UserDefinedReportMapper() {
  }
}
