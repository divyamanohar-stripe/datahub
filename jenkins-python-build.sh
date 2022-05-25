
#!/usr/bin/env bash

set -ex

pushd metadata-ingestion

echo ""
echo "@@ Building Python Wheels"
echo ""
python3 setup.py bdist_wheel
echo ""
echo "@@ Build completed"
echo ""

cp -r dist /build
popd

mkdir /build/henson
cp henson/restart /build/henson/