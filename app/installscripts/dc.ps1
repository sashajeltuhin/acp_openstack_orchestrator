#ps1_sysnative
$domainPass = "^^domainPass^^"
$dsrmPassword = (ConvertTo-SecureString -AsPlainText -Force -String $domainPass)
$domainName = "^^domainName^^"
$domainSuf = "^^domainSuf^^"
$callback = "^^callback^^"
$LocalAdmin = "Administrator"
$objUser = [ADSI]"WinNT://localhost/$($LocalAdmin), user"
$objUser.psbase.Invoke("SetPassword", $domainPass)
$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq "Ethernet"}
New-Item "C:\\builder\\temp" -type directory -force
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile("http://installs.apprendalabs.com/installscripts/apporchinit.ps1","c:\builder\temp\apporchinit.ps1") | Out-Null
Invoke-Expression "c:\builder\temp\apporchinit.ps1" | Out-Null
Install-WindowsFeature -name AD-Domain-Services -IncludeManagementTools | Out-Null
$dsrmPassword = (ConvertTo-SecureString -AsPlainText -Force -String $domainPass)
Install-ADDSForest -DomainName "$($domainName).$($domainSuf)" -InstallDNS -Force -SafeModeAdministratorPassword $dsrmPassword -ForestMode Win2012R2 -DomainMode Win2012R2 | Out-Null
$sname = $env:computername
$jobid = "^^jobid^^"
$url = "$($callback)/$($sname)/none/$($localIP.IPAddress)/dc/$($jobid)"
write-output $url
Invoke-WebRequest -URI $url -UseBasicParsing
