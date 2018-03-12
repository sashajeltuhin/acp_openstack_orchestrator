#!/bin/bash
domainPass="^^domainPass^^"
serverName="^^serverName^^"
postData="^^postData^^"
sed -i \"s/mirrorlist=https/mirrorlist=http/\" /etc/yum.repos.d/epel.repo
yum check-update
yum -y install wget libcgroup cifs-utils nano openssh-clients libcgroup-tools unzip iptables-services net-tools
service cgconfig start
echo "root:$domainPass" | chpasswd
echo "Updating hosts file"
x=$(hostname -I)
eval ipval=($x)
ip=${ipval[0]}
echo "$ip $serverName" >> /etc/hosts
hostnamectl set-hostname $serverName
echo "Updating sshd to allow root login via ssh"
file=/etc/ssh/sshd_config
cp -p $file $file.old &&
while read key other
do
    case $key in
PasswordAuthentication) other=yes;;
PermitRootLogin) other=yes;;
esac
echo "$key $other"
done < $file.old > $file
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
wget -O upgradeseed.sh http://installs.apprendalabs.com/installscripts/upgradeseed.sh
chmod u+x upgradeseed.sh
wget -O orch.zip http://installs.apprendalabs.com/orch.zip
unzip orch.zip -d /data/www
docker network create os-net
docker run -p 27017 -v /data/www/orchestrator/data:/data --name mdb --net="os-net" -d "mongo:2.6.7" mongod
docker run -p 8024 -v /data/www/orchestrator:/data/dev --name iaasapi --net="os-net"  -d "sashaz/nodecentos7" node server.js
docker run -p 80:80 -v /data/www/orchestrator:/data/www -v /data/www/orchestrator/configs/nginx.conf:/etc/nginx/nginx.conf:ro -v /data/www/orchestrator/logs:/logs --name iaasnginx --net="os-net" -d  "sashaz/nginxcentos7"
docker restart mdb
docker restart iaasapi
docker restart iaasnginx
echo "Invoke orchestrator"
wget http://$serverName:8024/api/buildfromseed --postdata $postData
