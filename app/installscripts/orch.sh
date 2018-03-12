#!/bin/bash
sed -i \"s/mirrorlist=https/mirrorlist=http/\" /etc/yum.repos.d/epel.repo
yum check-update
yum -y install wget libcgroup cifs-utils nano openssh-clients libcgroup-tools unzip iptables-services net-tools
domainPass="^^rootpass^^"
echo "root:$domainPass" | chpasswd
echo "Updating sshd to allow root login via ssh"
sed -i 's/#\?\(RSAAuthentication\s*\).*$/\1 yes/' /etc/ssh/sshd_config
service sshd restart
tee /etc/yum.repos.d/docker.repo <<-'EOF'
[dockerrepo]
name=Docker Repository
baseurl=https://yum.dockerproject.org/repo/main/centos/7
enabled=1
gpgcheck=1
gpgkey=https://yum.dockerproject.org/gpg
EOF
yum install -y http://yum.dockerproject.org/repo/main/centos/7/Packages/docker-engine-1.11.1-1.el7.centos.x86_64.rpm
mkdir /etc/systemd/system/docker.service.d
touch /etc/systemd/system/docker.service.d/docker.conf
cat > /etc/systemd/system/docker.service.d/docker.conf << EOF
[Service]
ExecStart=
ExecStart=/usr/bin/docker daemon -H fd:// --exec-opt native.cgroupdriver=systemd
EOF
systemctl daemon-reload
systemctl start docker
systemctl enable docker
echo "Get and install orchestrator"
mkdir -p /data/www
cd /data/www
wget -O auto.zip http://installs.apprendalabs.com/auto.zip
wget -O upgradeorch.sh http://installs.apprendalabs.com/installscripts/upgradeorch.sh
chmod u+x upgradeorch.sh
unzip /data/www/auto.zip -d /data/www
docker network create os-net
docker run -p 27017 -v /data/www/auto/data:/data --name mdb --net="os-net" -d "mongo:2.6.7" mongod
docker run -p 8024 -v /data/www/auto:/data/dev --name iaasapi --net="os-net"  -d "sashaz/nodecentos7" node server.js
docker run -p 80:80 -v /data/www/auto:/data/www -v /data/www/auto/configs/nginx.conf:/etc/nginx/nginx.conf:ro -v /data/www/auto/logs:/logs --name iaasnginx --net="os-net" -d  "sashaz/nginxcentos7"
docker restart mdb
docker restart iaasapi
docker restart iaasnginx
