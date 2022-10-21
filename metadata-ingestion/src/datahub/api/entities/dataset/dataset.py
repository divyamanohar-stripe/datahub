"""
NOTE: [FORK_CHANGE]
A minimal interim module that's mocking DataHub's newest API.
https://github.com/datahub-project/datahub/tree/master/metadata-ingestion/src/datahub/api/entities

We need to stop using it once the OSS upstream module is in place. JIRA to track:
https://jira.corp.stripe.com/browse/SCHMAQUERY-1557
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Callable, Dict, Iterable, Optional, Set, Union, cast

from datahub.utilities.urns.data_flow_urn import DataFlowUrn
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.metadata.schema_classes import ChangeTypeClass, DatasetPropertiesClass, OwnershipClass, OwnerClass, OwnershipTypeClass, AuditStampClass, OwnershipSourceTypeClass, OwnershipSourceClass
from datahub.utilities.urns.dataset_urn import DatasetUrn
import datahub.emitter.mce_builder as builder

if TYPE_CHECKING:
    from datahub.emitter.kafka_emitter import DatahubKafkaEmitter
    from datahub.emitter.rest_emitter import DatahubRestEmitter


@dataclass
class Dataset:
    platform_id: str
    table_name: str
    env: str
    flow_urn: DataFlowUrn
    urn: DatasetUrn = field(init=False)
    description: Optional[str] = None
    properties: Dict[str, str] = field(default_factory=dict)
    owners: Set[str] = field(default_factory=set)
    group_owners: Set[str] = field(default_factory=set)

    def __post_init__(self):
        self.urn = DatasetUrn.create_from_ids(self.platform_id, self.table_name, self.env)

    def generate_ownership_aspect(self) -> Iterable[OwnershipClass]:
        owners = set([builder.make_user_urn(owner) for owner in self.owners]) | set(
            [builder.make_group_urn(owner) for owner in self.group_owners]
        )
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
            lastModified=AuditStampClass(
                time=0,
                actor=builder.make_user_urn(self.flow_urn.get_orchestrator_name()),
            ),
        )
        return [ownership]

    def generate_mcp(self) -> Iterable[MetadataChangeProposalWrapper]:
        mcp = MetadataChangeProposalWrapper(
            entityType="dataset",
            entityUrn=str(self.urn),
            aspectName="datasetProperties",
            aspect=DatasetPropertiesClass(
                customProperties=self.properties, description=self.description
            ),
            changeType=ChangeTypeClass.UPSERT,
        )

        yield mcp

        for owner in self.generate_ownership_aspect():
            mcp = MetadataChangeProposalWrapper(
                entityType="dataset",
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
        Emit the Dataset entity to Datahub

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
