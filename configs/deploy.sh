#!/bin/bash
#chmod u+x
cd /data/www/orchestrator
git pull
cd /data/www
rm -f /data/www/orchestrator/app/orch.zip
rm -f /data/www/orchestrator/app/auto.zip
rm -rf /data/www/auto
zip -r orch.zip orchestrator -x orchestrator/node_modules/**\* orchestrator/app/installers/**\* orchestrator/.git/**\* -q
mv -f orch.zip /data/www/orchestrator/app/orch.zip
rm -f /var/lib/docker/containers/f289760e3007c023dc40bf3f78877e73fa485a0d76a2a33130898cfef56d8b7f/f289760e3007c023dc40bf3f78877e73fa485a0d76a2a33130898cfef56d8b7f-json.log
cd /data/www/orchestrator
npm update
bower update --allow-root
docker restart iaasapi
docker restart iaasnginx
cd /data/www
rm -rf /data/www/auto
rsync -av --exclude='app/installers' --exclude='app/*.xml' --exclude='app/*.lic' --exclude='app/orch.zip' --exclude='.git' --exclude='uploads' orchestrator/ auto
rm -f /data/www/auto/app/scripts/app.js
rm -f /data/www/auto/app/index.html
mv -f /data/www/auto/app/indexscale.html /data/www/auto/app/index.html
zip -r auto.zip auto -x auto/app/installers/**\* auto/.git/**\* -q
mv -f auto.zip /data/www/orchestrator/app/auto.zip
