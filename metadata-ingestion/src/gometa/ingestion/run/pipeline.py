from typing import Dict
from pydantic import BaseModel
from dataclasses import dataclass, field
import pprint
from gometa.configuration.common import DynamicTypedConfig, DynamicFactory
from gometa.ingestion.api.source import Source, Extractor
from gometa.ingestion.source import source_class_mapping
from gometa.ingestion.api.common import PipelineContext
from gometa.ingestion.api.sink import Sink, NoopWriteCallback, WriteCallback
from gometa.ingestion.sink import sink_class_mapping
from typing import Optional
import importlib
import time
import logging

logger = logging.getLogger(__name__)


class SourceConfig(DynamicTypedConfig):
    extractor: Optional[str] = "gometa.ingestion.extractor.generic.WorkUnitMCEExtractor"


class PipelineConfig(BaseModel):
    source: SourceConfig
    sink: DynamicTypedConfig
    run_id: str = str(int(time.time()) * 1000)


class LoggingCallback(WriteCallback):
    def on_success(self, record_envelope, success_meta):
        logger.debug('sink called success callback')

    def on_failure(self, record_envelope, exception, failure_meta):
        # breakpoint()
        logger.exception(f'failed to write {record_envelope.record} with {exception} and info {failure_meta}')


class Pipeline:
    config: PipelineConfig
    ctx: PipelineContext
    source: Source
    sink: Sink

    def get_class_from_name(self, class_string):
        module_name, class_name = class_string.rsplit(".",1)
        MyClass = getattr(importlib.import_module(module_name), class_name)
        return MyClass
    
    def __init__(self, config_dict):
        self.config = PipelineConfig.parse_obj(config_dict)
        self.ctx = PipelineContext(run_id=self.config.run_id)

        source_type = self.config.source.type
        try:
            source_class = source_class_mapping[source_type]
        except KeyError as e:
            raise ValueError(f'Did not find a registered source class for {source_type}') from e
        self.source: Source = source_class.create(self.config.source.dict().get(source_type, {}), self.ctx)
        logger.debug(f"Source type:{source_type},{source_class} configured")

        sink_type = self.config.sink.type
        try:
            sink_class = sink_class_mapping[sink_type]
        except KeyError as e:
            raise ValueError(f'Did not find a registered sink class for {sink_type}') from e
        sink_config = self.config.sink.dict().get(sink_type, {})
        self.sink: Sink = sink_class.create(sink_config, self.ctx)
        logger.debug(f"Sink type:{self.config.sink.type},{sink_class} configured")

        # Ensure extractor can be constructed, even though we use them later
        self.extractor_class = self.get_class_from_name(self.config.source.extractor)

    def run(self):
        callback = LoggingCallback()
        extractor = self.extractor_class()
        for wu in self.source.get_workunits():
            # TODO: change extractor interface
            extractor.configure({}, self.ctx)

            self.sink.handle_work_unit_start(wu)
            for record_envelope in extractor.get_records(wu):
                self.sink.write_record_async(record_envelope, callback)
            extractor.close()
            self.sink.handle_work_unit_end(wu)
        self.sink.close()

        print()
        print('Source:')
        print(self.source.get_report().as_string())
        print('Sink:')
        print(self.sink.get_report().as_string())
