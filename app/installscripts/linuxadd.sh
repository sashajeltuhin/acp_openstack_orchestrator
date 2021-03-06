#!/bin/bash
callback="^^callback^^"
domainPass="^^domainPass^^"
domainName="^^domainName^^"
domainSuf="^^domainSuf^^"
dcip="^^dns^^"
platformadmin="^^platformadmin^^"
platformadminpass="^^platformadminpass^^"
serverName="^^serverName^^"
url="^^url^^"
repo="^^repo^^"
jobid="^^jobid^^"
ver="^^ver^^"
sed -i \"s/mirrorlist=https/mirrorlist=http/\" /etc/yum.repos.d/epel.repo
yum check-update
yum -y install wget libcgroup cifs-utils nano openssh-clients libcgroup-tools unzip iptables-services net-tools
service cgconfig start
echo "root:$domainPass" | chpasswd
echo "Updating domain info in resolv.conf"
cat > /etc/resolv.conf << EOF
nameserver $dcip
search $domainName.$domainSuf
domain $domainName.$domainSuf
EOF
echo "Tweak redhat release to appease Apprenda install"
cat > /etc/redhat-release << EOF
CentOS Linux release 7.1.1503 (Core)
EOF
chattr +i /etc/resolv.conf
echo "Updating hosts file"
x=$(hostname -I)
eval ipval=($x)
ip=${ipval[0]}
echo "$ip $serverName" >> /etc/hosts
hostnamectl set-hostname $serverName
echo "Updating sshd to allow root login via ssh"
sed -i 's/#\?\(RSAAuthentication\s*\).*$/\1 yes/' /etc/ssh/sshd_config
service sshd restart
echo "Creating repo mounts"
mkdir -p /apprenda/repo/apps
mkdir -p /apprenda/repo/sys
mkdir -p /apprenda/docker-binds
chmod -R 777 /apprenda/docker-binds
echo "//$repo/Applications /apprenda/repo/apps cifs username=$platformadmin,password=$platformadminpass 0 0" >> /etc/fstab
echo "//$repo/Apprenda /apprenda/repo/sys cifs username=$platformadmin,password=$platformadminpass 0 0" >> /etc/fstab
echo "//$repo/Binds /apprenda/docker-binds cifs username=$platformadmin,password=$platformadminpass,file_mode=0777,dir_mode=0777,noperm 0 0" >> /etc/fstab
mount -a
service iptables stop
cd /apprenda/repo/sys/$ver/System/Nodes/RPM
ls | grep -v rhel6 | xargs yum -y localinstall
/apprenda/apprenda-updater/bin/configure-node.sh -a /apprenda/repo/apps -s /apprenda/repo/sys -h $serverName -o /tmp/output.log -c http://$url
service iptables start
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
service apprenda restart
cd /apprenda
wget $callback/$serverName/$ip/$ip/lin/$jobid -o /tmp/appscale.log
