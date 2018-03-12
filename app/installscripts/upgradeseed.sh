docker stop mdb
docker stop iaasapi
docker stop  iaasnginx
rm -rf /data/www/orchestrator
rm -rf /data/www/orch.zip
cd /data/www
wget -O orch.zip http://installs.apprendalabs.com/orch.zip
unzip /data/www/orch.zip -d /data/www
docker restart mdb
docker restart iaasapi
docker restart iaasnginx
