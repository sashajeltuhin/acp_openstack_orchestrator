docker stop mdb
docker stop iaasapi
docker stop  iaasnginx
rm -rf /data/www/auto
rm -rf /data/www/auto.zip
cd /data/www
wget -O auto.zip http://installs.apprendalabs.com/auto.zip
unzip /data/www/auto.zip -d /data/www
docker restart mdb
docker restart iaasapi
docker restart iaasnginx
