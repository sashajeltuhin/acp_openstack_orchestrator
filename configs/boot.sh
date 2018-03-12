docker network create os-net
docker run -p 27017 -v /data/www/orchestrator/data:/data --name mdb --net="os-net" -d "mongo:2.6.7" mongod
docker run -p 8024 -v /data/www/orchestrator:/data/dev --name iaasapi --net="os-net"  -d "sashaz/nodecentos7" node server.js
docker run -p 80:80 -v /data/www/orchestrator:/data/www -v /data/www/orchestrator/configs/nginx.conf:/etc/nginx/nginx.conf:ro -v /data/www/orchestrator/logs:/logs --name iaasnginx --net="os-net" -d  "sashaz/nginxcentos7"
