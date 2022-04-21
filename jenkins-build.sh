#! /usr/bin/env bash

. /usr/stripe/bin/docker/stripe-init-build

# TODO: The Gradle proxy options should eventually be computed by the Jenkins infra
# layer and passed into this script in a way for Gradle to see automatically.
# See https://jira.corp.stripe.com/browse/DEVTOOLING-1442
# This approach has be copied from our iceberg fork build - go/forks/iceberg

get_proxy_options () {
    /usr/bin/env python3 - "$1" "$2" <<'EOF'
import sys
from urllib.parse import urlsplit
scheme = sys.argv[1]
r = urlsplit(sys.argv[2])
print("-D{}.proxyHost={} -D{}.proxyPort={}".format(scheme, r.hostname, scheme, r.port))
EOF
}

# Setup Gradle HTTP proxy options.
GRADLE_OPTS=""
if [ -n "$http_proxy" ]; then
  GRADLE_OPTS="$GRADLE_OPTS $(get_proxy_options http "$http_proxy")"
fi
if [ -n "$https_proxy" ]; then
  GRADLE_OPTS="$GRADLE_OPTS $(get_proxy_options https "$https_proxy")"
fi
if [ -n "$no_proxy" ]; then
  non_proxy_hosts="$(echo "$no_proxy" | tr ',' '|')"
  GRADLE_OPTS="$GRADLE_OPTS -Dhttp.nonProxyHosts='${non_proxy_hosts}' -Dhttps.nonProxyHosts='${non_proxy_hosts}'"
fi
export GRADLE_OPTS

echo Building datahub.

# We just compile the metadata service and frontend for now
./gradlew :metadata-service:war:build

./gradlew :datahub-frontend:build -x yarnTest

# todo as part of setting up the container builds, copy artifacts
