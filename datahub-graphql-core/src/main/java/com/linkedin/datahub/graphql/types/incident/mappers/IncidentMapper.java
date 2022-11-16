package com.linkedin.datahub.graphql.types.incident.mappers;

import com.linkedin.common.Ownership;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.generated.Incident;
import com.linkedin.datahub.graphql.generated.EntityType;
import com.linkedin.datahub.graphql.types.common.mappers.OwnershipMapper;
import com.linkedin.incident.IncidentProperties;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.EnvelopedAspect;
import com.linkedin.entity.EnvelopedAspectMap;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.key.IncidentKey;

public class IncidentMapper {

  public static Incident map(final EntityResponse entityResponse) {
    final Incident result = new Incident();
    final Urn entityUrn = entityResponse.getUrn();
    final EnvelopedAspectMap aspects = entityResponse.getAspects();

    result.setUrn(entityUrn.toString());
    result.setType(EntityType.INCIDENT);

    // Incidents MUST have key aspect to be rendered.
    final EnvelopedAspect envelopedIncidentKey = aspects.get(Constants.INCIDENT_KEY_ASPECT_NAME);
    if (envelopedIncidentKey != null) {
      result.setId(new IncidentKey(envelopedIncidentKey.getValue().data()).getId());
    } else {
      return null;
    }

    final EnvelopedAspect envelopedIncidentProperties = aspects.get(Constants.INCIDENT_PROPERTIES_ASPECT_NAME);
    if (envelopedIncidentProperties != null) {
      result.setProperties(mapIncidentProperties(new IncidentProperties(envelopedIncidentProperties.getValue().data())));
    }

    final EnvelopedAspect envelopedOwnership = aspects.get(Constants.OWNERSHIP_ASPECT_NAME);
    if (envelopedOwnership != null) {
      result.setOwnership(OwnershipMapper.map(new Ownership(envelopedOwnership.getValue().data())));
    }

    return result;
  }

  private static com.linkedin.datahub.graphql.generated.IncidentProperties mapIncidentProperties(final IncidentProperties gmsProperties) {
    final com.linkedin.datahub.graphql.generated.IncidentProperties propertiesResult = new com.linkedin.datahub.graphql.generated.IncidentProperties();
    propertiesResult.setName(gmsProperties.getName());
    propertiesResult.setDescription(gmsProperties.getDescription());
    propertiesResult.setSummary(gmsProperties.getSummary());
    propertiesResult.setResolution(gmsProperties.getResolution());
    propertiesResult.setSeverity(gmsProperties.getSeverity());
    propertiesResult.setReporter(gmsProperties.getReporter());
    propertiesResult.setState(gmsProperties.getState());
    propertiesResult.setReportLink(gmsProperties.getReportLink());
    propertiesResult.setOpenedAt(gmsProperties.getOpenedAt());
    propertiesResult.setResolvedAt(gmsProperties.getResolvedAt());
    propertiesResult.setClosedAt(gmsProperties.getClosedAt());
    return propertiesResult;
  }

  private IncidentMapper() { }
}
