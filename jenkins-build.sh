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

./gradlew :metadata-service:war:build

./gradlew :metadata-jobs:mce-consumer-job:build
./gradlew :metadata-jobs:mae-consumer-job:build

# Skip yarn tests temporarily till we resolve: https://jira.corp.stripe.com/browse/SCHMAQUERY-1551
./gradlew :datahub-frontend:dist -x yarnTest

# Metadata service also requires some jetty related jars
curl https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-runner/9.4.20.v20190813/jetty-runner-9.4.20.v20190813.jar --output /build/jetty-runner.jar
curl https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-jmx/9.4.20.v20190813/jetty-jmx-9.4.20.v20190813.jar --output /build/jetty-jmx.jar
curl https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-util/9.4.20.v20190813/jetty-util-9.4.20.v20190813.jar --output /build/jetty-util.jar

cp metadata-jobs/mce-consumer-job/build/libs/mce-consumer-job.jar /build/mce-consumer-job.jar
cp metadata-jobs/mae-consumer-job/build/libs/mae-consumer-job.jar /build/mae-consumer-job.jar
cp datahub-frontend/build/distributions/datahub-frontend.zip /build/datahub-frontend.zip
cp metadata-service/war/build/libs/war.war /build/war.war
cp metadata-models/src/main/resources/entity-registry.yml /build/entity-registry.yml
cp docker/datahub-gms/jetty.xml /build/jetty.xml
cp docker/datahub-gms/stripe-start.sh /build/stripe-start.sh
cp docker/datahub-mce-consumer/stripe-start.sh /build/mxe-stripe-start.sh
cp docker/datahub-gms/stripe-jmxfetch.yaml /build/stripe-jmxfetch.yaml
cp docker/datahub-mce-consumer/stripe-jmxfetch.yaml /build/mce-stripe-jmxfetch.yaml
cp docker/datahub-mae-consumer/stripe-jmxfetch.yaml /build/mae-stripe-jmxfetch.yaml
cp docker/datahub-frontend/stripe-frontend-start.sh /build/stripe-frontend-start.sh
cp docker/mysql-setup/stripe-init.sh /build/mysql_init.sh
cp docker/mysql-setup/init.sql /build/mysql_init.sql
cp Dockerfile.deploy /build

# enable analytics
cp docker/elasticsearch-setup/create-indices.sh /build/create-indices.sh
cp metadata-service/restli-servlet-impl/src/main/resources/index/usage-event/policy.json /build/policy.json
cp metadata-service/restli-servlet-impl/src/main/resources/index/usage-event/index_template.json /build/index_template.json

./gradlew :metadata-ingestion:codegen

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