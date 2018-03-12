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
wget https://www.rabbitmq.com/rabbitmq-signing-key-public.asc
apt-key add rabbitmq-signing-key-public.asc
echo \"deb http://www.rabbitmq.com/debian/ testing main\" >> /etc/apt/sources.list
apt-get update
sudo apt-get -q -y install rabbitmq-server
rabbitmqctl add_user "$uname" "$spass"
rabbitmqctl set_user_tags "$uname" administrator
rabbitmqctl set_permissions -p / "$uname" \".*\" \".*\" \“.*\”

wget $callback/rabbit/$serverName/$ip/lin/$emails -o /tmp/addon.log
