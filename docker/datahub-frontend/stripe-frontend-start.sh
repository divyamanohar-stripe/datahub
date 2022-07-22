#!/bin/bash
set -x

# Thin Stripe specific wrapper to set Play secret env var and kick off the application

# This secret must be configured in the datahub-frontend sky cfg file
DATAHUB_SECRET=$(cat /pay/keys/playsecret.txt)
export DATAHUB_SECRET

./datahub-frontend/bin/playBinary
