#!/bin/sh

# This secret must be configured in the datahub-gms sky cfg file
MYSQL_PASSWORD=$(cat /pay/keys/db_root_password.txt)

sed -e "s/DATAHUB_DB_NAME/${DATAHUB_DB_NAME}/g" /init.sql | tee -a /tmp/init-final.sql
mysql -u $MYSQL_USERNAME -p"$MYSQL_PASSWORD" -h $MYSQL_HOST < /tmp/init-final.sql