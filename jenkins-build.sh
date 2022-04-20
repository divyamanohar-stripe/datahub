#! /usr/bin/env bash

. /usr/stripe/bin/docker/stripe-init-build

echo Building datahub.

./gradlew build

# todo as part of setting up the container builds, copy artifacts
