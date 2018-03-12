#ps1_sysnative
$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq "Ethernet"}
$MaskBits = 24
$Gateway = "10.10.101.1"
$Dns = "127.0.0.1"
$IPType = "IPv4"
# Retrieve the network adapter that you want to configure
$adapter = Get-NetAdapter | ? {$_.Status -eq "up"}
# Remove any existing IP, gateway from our ipv4 adapter
If (($adapter | Get-NetIPConfiguration).IPv4Address.IPAddress) {
    $adapter | Remove-NetIPAddress -AddressFamily $IPType -Confirm:$false
}
$adapter | New-NetIPAddress -AddressFamily $IPType -IPAddress $($localIP) -PrefixLength $MaskBits -DefaultGateway $Gateway
# Configure the DNS client server IP addresses
$adapter | Set-DnsClientServerAddress -ServerAddresses $DNS
