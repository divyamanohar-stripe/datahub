
#!/usr/bin/env bash

set -ex

pushd metadata-ingestion

echo ""
echo "@@ Building"
echo ""
python3 -m pip wheel . --no-deps --wheel-dir dist
echo ""
echo "@@ Build completed"
echo ""

cp -r dist /build
popd

mkdir /build/henson
cp henson/restart /build/henson/