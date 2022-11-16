"""
NOTE: [FORK_CHANGE]
API to emit metadata about Incident entities
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Callable, Dict, Iterable, Optional, Set, Union, cast

from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.metadata.schema_classes import ChangeTypeClass, OwnershipClass, OwnerClass, OwnershipTypeClass, AuditStampClass, OwnershipSourceTypeClass, OwnershipSourceClass
import datahub.emitter.mce_builder as builder
from datahub.utilities.urns.incident_urn import IncidentUrn
from datahub.metadata.com.linkedin.pegasus2avro.incident import IncidentProperties

if TYPE_CHECKING:
    from datahub.emitter.kafka_emitter import DatahubKafkaEmitter
    from datahub.emitter.rest_emitter import DatahubRestEmitter


@dataclass
class Incident:
    """This is a Incident class which represents an Incident
    Args:
        id (str): The id of the incident
        group_owners (Set[str]): Involved teams of the incident
        name (str): The name of the incident
        description (str): The description of the incident
        summary (str): The summary of the incident
        resolution (str): The resolution of the incident
        reporter (str): The reporter username of the incident
        severity (str): The severity level of the incident
        state (str): The state of the incident
        report_link (str): Link to the report doc for the incident
        opened_at (Optional[float]): The time the incident was opened
        resolved_at (Optional[float]): The time the incident was resolved
        closed_at (Optional[float]): The time the incident was closed
    """

    id: str
    urn: str = field(init=False)
    group_owners: Set[str] = field(default_factory=set)
    description: Optional[str] = None
    summary: Optional[str] = None
    resolution: Optional[str] = None
    reporter: Optional[str] = None
    severity: Optional[str] = None
    state: Optional[str] = None
    report_link: Optional[str] = None
    opened_at: Optional[int] = None
    resolved_at: Optional[int] = None
    closed_at: Optional[int] = None

    def __post_init__(self):
        self.urn = IncidentUrn.create_from_id(self.id)

    def generate_ownership_aspect(self) -> Iterable[OwnershipClass]:
        owners = set([builder.make_group_urn(owner) for owner in self.group_owners])
        ownership = OwnershipClass(
            owners=[
                OwnerClass(
                    owner=owner,
                    type=OwnershipTypeClass.DEVELOPER,
                    source=OwnershipSourceClass(
                        type=OwnershipSourceTypeClass.SERVICE,
                    ),
                )
                for owner in (owners or [])
            ],
        )
        return [ownership]

    def generate_mcp(self) -> Iterable[MetadataChangeProposalWrapper]:
        mcp = MetadataChangeProposalWrapper(
            entityType="incident",
            entityUrn=str(self.urn),
            aspectName="incidentProperties",
            aspect=IncidentProperties(
                description=self.description,
                summary=self.summary,
                resolution=self.resolution,
                reporter=self.reporter,
                severity=self.severity,
                state=self.state,
                reportLink=self.report_link,
                openedAt=self.opened_at,
                resolvedAt=self.resolved_at,
                closedAt=self.closed_at,
            ),
            changeType=ChangeTypeClass.UPSERT,
        )

        yield mcp

        for owner in self.generate_ownership_aspect():
            mcp = MetadataChangeProposalWrapper(
                entityType="incident",
                entityUrn=str(self.urn),
                aspectName="ownership",
                aspect=owner,
                changeType=ChangeTypeClass.UPSERT,
            )
            yield mcp

    def emit(
            self,
            emitter: Union[DatahubRestEmitter, DatahubKafkaEmitter],
            callback: Optional[Callable[[Exception, str], None]] = None,
    ) -> None:
        """
        Emit the Incident entity to Datahub

        :param emitter: Datahub Emitter to emit the proccess event
        :param callback: The callback method for KafkaEmitter if it is used
        """
    for mcp in self.generate_mcp():
        if type(emitter).__name__ == "DatahubKafkaEmitter":
            assert callback is not None
            kafka_emitter = cast("DatahubKafkaEmitter", emitter)
            kafka_emitter.emit(mcp, callback)
        else:
            rest_emitter = cast("DatahubRestEmitter", emitter)
            rest_emitter.emit(mcp)
