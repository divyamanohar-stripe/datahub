#!/usr/bin/env bash

set -ex

./gradlew :metadata-ingestion:codegen

pushd metadata-ingestion

echo ""
echo "@@ Building Python Wheels"
echo ""
python3 setup.py bdist_wheel
echo ""
echo "@@ Build completed"
echo ""

popd
