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
apt-get update
apt-get -q -y install postgresql postgresql-contrib
apt-get install python-software-properties
apt-add-repository ppa:ubuntugis/ppa
apt-get update
apt-get install postgresql-9.1-postgis

wget $callback/post/$serverName/$ip/lin/$emails -o /tmp/addon.log
