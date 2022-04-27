#! /usr/bin/env bash

echo "Building DataHub via Docker"
docker build -t stripe/datahub:build . -f Dockerfile.local

echo "Extracting build files"
docker container create --name extract stripe/datahub:build
docker container cp extract:/build/ .
docker container rm -f extract

echo "Pulling Ubuntu docker image from container registry"
sc docker pull containers.global.prod.stripe.io/stripe/build/ubuntu-20.04:latest

echo "Kicking off Stripe DataHub deploy docker image build"
docker build -t stripe/datahub:latest -f Dockerfile.deploy ./build

echo "Container: stripe/datahub:latest is ready to use!"
