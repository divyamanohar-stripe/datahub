#!/bin/bash
set -x

# Stripe specific tweaks to `start.sh` so that we can get it to work in our setup. The existing start.sh
# issues a set of wait calls and uses the dockerize command to kick things off. We just wrap the java launch here
exec java $JAVA_OPTS $JMX_OPTS \
  -jar /datahub/datahub-mxe-consumers/bin/${CONSUMER_JOB}-consumer-job.jar
