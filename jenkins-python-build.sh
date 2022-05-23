
#!/usr/bin/env bash

set -ex

echo ""
echo "@@ Building"
echo ""


pushd metadata-ingestion



python3 -m pip wheel . --no-deps --wheel-dir dist

echo ""
echo "@@ Build completed"
echo ""

cp -r dist /build
popd

mkdir /build/henson
cp henson/restart /build/henson/