#!/bin/bash
set -x

# This secret must be configured in the datahub-gms sky cfg file
EBEAN_DATASOURCE_PASSWORD=$(cat /pay/keys/db_root_password.txt)
export EBEAN_DATASOURCE_PASSWORD

# Stripe specific tweaks to `start.sh` so that we can get it to work in our setup. The existing start.sh
# issues a set of wait calls and uses the dockerize command to kick things off. We just wrap the java launch here
exec java $JAVA_OPTS $JMX_OPTS \
  -jar /datahub/datahub-gms/bin/jetty-runner.jar \
  --jar /datahub/datahub-gms/bin/jetty-util.jar \
  --jar /datahub/datahub-gms/bin/jetty-jmx.jar \
  --config /datahub/datahub-gms/scripts/jetty.xml \
  /datahub/datahub-gms/bin/war.war "$@"
