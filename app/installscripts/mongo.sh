#!/bin/bash
pass="^^upass^^"
spass="^^spass^^"
uname="^^uname^^"
dbname="^^dbname^^"
dbuser="^^apptenant^^"
serverName="^^serverName^^"
emails="^^emails^^"
callback="^^callback^^"
domainName="^^domainName^^"
domainSuf="^^domainSuf^^"
dcip="^^dcip^^"
echo "root:$pass" | chpasswd
echo "Updating domain info in resolv.conf"
cat > /etc/resolv.conf << EOF
nameserver $dcip
search $domainName.$domainSuf
domain $domainName.$domainSuf
EOF
chattr +i /etc/resolv.conf
echo "Updating hosts file"
x=$(hostname -I)
eval ipval=($x)
ip=${ipval[0]}
echo "$ip $serverName" >> /etc/hosts
service hostname restart
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo \"deb http://repo.mongodb.org/apt/ubuntu precise/mongodb-org/3.0 multiverse\" |  tee /etc/apt/sources.list.d/mongodb-org-3.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
$ echo 'db.createUser({user: " $uname ",pwd: " $spass ",roles: [ { role: \"userAdminAnyDatabase\", db: \"admin\" } ] });' > file.js
$ mongo admin file.js

wget $callback/mongo/$serverName/$ip/lin/$emails -o /tmp/addon.log
