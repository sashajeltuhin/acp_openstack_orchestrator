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
debconf-set-selections <<< "mysql-server mysql-server/root_password password '$pass'"
debconf-set-selections <<< "mysql-server mysql-server/root_password_again password '$pass'"
apt-get update
apt-get -y install mysql-server
mysql_install_db
#sed -i "s/.*bind-address.*/bind-address = $ip/" /etc/mysql/my.cnf
#service mysql stop
#service mysql start
#/usr/bin/mysqladmin -u root password '$pass'
#/usr/bin/mysqladmin -u root -h $servername password '$pass'
mysql -uroot -p $pass -e "CREATE DATABASE $dbname;"
mysql -uroot -p $pass -e "CREATE USER $dbuser@'$ip' IDENTIFIED BY $spass;"
mysql -uroot -p $pass -e "GRANT ALL PRIVILEGES ON $dbname.* TO $dbuser@'$ip';"
mysql -uroot -p $pass -e "FLUSH PRIVILEGES;"

wget $callback/mysql/$serverName/$ip/lin/$emails -o /tmp/addon.log

#service mysql stop
#mysqld --skip-grant-tables &
#mysql -u root mysql
#UPDATE user SET Password=PASSWORD('$pass') WHERE User='root'; FLUSH PRIVILEGES; exit;
