from typing import List

from datahub.utilities.urns.error import InvalidUrnError
from datahub.utilities.urns.urn import Urn


class IncidentUrn(Urn):
    """
    expected domain urn format: urn:li:incident:<incident_id>. example: "urn:li:incident:fake-incident"
    """

    ENTITY_TYPE: str = "incident"

    def __init__(
            self, entity_type: str, entity_id: List[str], domain_id: str = Urn.LI_DOMAIN
    ):
        super().__init__(entity_type, entity_id, domain_id)

    @classmethod
    def create_from_string(cls, urn_str: str) -> "IncidentUrn":
        urn: Urn = super().create_from_string(urn_str)
        return cls(urn.get_type(), urn.get_entity_id(), urn.get_domain())

    @classmethod
    def create_from_id(cls, incident_id: str) -> "IncidentUrn":
        return cls(IncidentUrn.ENTITY_TYPE, [incident_id])

    @staticmethod
    def _validate_entity_type(entity_type: str) -> None:
        if entity_type != IncidentUrn.ENTITY_TYPE:
            raise InvalidUrnError(
                f"Entity type should be {IncidentUrn.ENTITY_TYPE} but found {entity_type}"
            )

    @staticmethod
    def _validate_entity_id(entity_id: List[str]) -> None:
        if len(entity_id) != 1:
            raise InvalidUrnError(
                f"Expect 1 part in entity id, but found{len(entity_id)}"
            )
