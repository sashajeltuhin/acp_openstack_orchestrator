#ps1_sysnative
$domainPass = "^^domainPass^^"
$domainAdmin = "^^domainAdmin^^"
$domainName = "^^domainName^^"
$domainSuf = "^^domainSuf^^"
$LocalAdmin = "Administrator"
$platformadmin = "^^platformadmin^^"
$platformsystem = "^^platformsystem^^"
$platformurl = "^^url^^"
$dcip = "^^dns^^"
$dcname = "^^dcname^^"
$callback = "^^callback^^"
$manifestfile = "^^manifestfile^^"
$manifestxml = "^^manifestxml^^"
$ver = "^^ver^^"
if($dcip){
$objUser = [ADSI]"WinNT://localhost/$($LocalAdmin), user"
$objUser.psbase.Invoke("SetPassword", $domainPass)
$password = $domainPass | ConvertTo-SecureString -asPlainText -Force
$username = "$($domainName)\$($domainAdmin)"
$credential = New-Object System.Management.Automation.PSCredential($username,$password)
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses $dcip
Add-Computer -DomainName "$($domainName).$($domainSuf)" -Credential $credential | Out-Null
}
Set-Service NetTcpPortSharing -startuptype "automatic" | Out-Null
start-service -name NetTcpPortSharing  | Out-Null
Uninstall-Dtc -Confirm:$False | Out-Null
Install-Dtc -LogPath "C:\log" -StartType "AutoStart" | Out-Null
$regkey = "HKLM:\Software\Microsoft\MSDTC\Security"
$regkeyroot = "HKLM:\\Software\\Microsoft\\MSDTC"
Set-ItemProperty -Path $regkey -Name NetworkDtcAccess -Value 1
Set-ItemProperty -Path $regkey -Name NetworkDtcAccessClients -Value 1
Set-ItemProperty -Path $regkey -Name NetworkDtcAccessInbound -Value 1
Set-ItemProperty -Path $regkey -Name NetworkDtcAccessOutbound -Value 1
Set-ItemProperty -Path $regkeyroot -Name AllowOnlySecureRpcCalls -Value 0
Set-ItemProperty -Path $regkeyroot -Name TurnOffRpcSecurity -Value 1
Set-ItemProperty -Path $regkey -Name NetworkDtcAccessTransactions -Value 1
Set-ItemProperty -Path $regkey -Name XaTransactions -Value 1
Restart-Service msdtc | Out-Null
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
if($dcip){
Install-WindowsFeature -name AD-Domain-Services | Out-Null
$username = "apptest\Administrator"
$dsrmPassword = (ConvertTo-SecureString -AsPlainText -Force -String $domainPass)
$credential = New-Object System.Management.Automation.PSCredential($username,$dsrmPassword)
New-ADUser -Credential $credential -Server "$($dcname).$($domainName).$($domainSuf)" -SamAccountName $platformadmin -AccountPassword $dsrmPassword -name "$($platformadmin)" -enabled $true -PasswordNeverExpires $true -ChangePasswordAtLogon $false | Out-Null
New-ADUser -Credential $credential -Server "$($dcname).$($domainName).$($domainSuf)" -SamAccountName $platformsystem -AccountPassword $dsrmPassword -name "$($platformsystem)" -enabled $true -PasswordNeverExpires $true -ChangePasswordAtLogon $false | Out-Null
Add-ADPrincipalGroupMembership -Identity "CN=$($platformadmin),CN=Users,DC=$($domainName),DC=$($domainSuf)" -MemberOf "CN=Domain Admins,CN=Users,DC=$($domainName),DC=$($domainSuf)"
Add-ADPrincipalGroupMembership -Identity "CN=$($platformsystem),CN=Users,DC=$($domainName),DC=$($domainSuf)" -MemberOf "CN=Domain Admins,CN=Users,DC=$($domainName),DC=$($domainSuf)"
Uninstall-WindowsFeature -Name AD-Domain-Services | Out-Null
}
$admin = "$($domainName)\$($platformadmin)"
$sys = "$($domainName)\$($platformsystem)"
$locallogon = "SeInteractiveLogonRight"
$imp = "SeImpersonatePrivilege"
$servicelogon = "SeServiceLogonRight"
$webClient = New-Object System.Net.WebClient
New-Item "C:\builder\temp" -type directory -force
$webClient.DownloadFile("http://installs.apprendalabs.com/installers/carbon.zip","c:\builder\temp\carbon.zip")
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("c:\builder\temp\carbon.zip", "c:\builder")
$CarbonDllPath = "c:\builder\Carbon\bin\Carbon.dll"
[Reflection.Assembly]::LoadFile($CarbonDllPath)
[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)
[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)
[Carbon.Lsa]::GrantPrivileges($admin, $imp)
[Carbon.Lsa]::GrantPrivileges($sys, $imp)
[Carbon.Lsa]::GrantPrivileges($admin, $servicelogon)
[Carbon.Lsa]::GrantPrivileges($sys, $servicelogon)
Install-WindowsFeature -Name Web-Server,AS-NET-Framework,Web-Net-Ext,Web-Net-Ext45,Web-ASP,Web-Asp-Net,Web-Asp-Net45 | Out-Null
Install-WindowsFeature DNS | Out-Null
$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq "Ethernet"}
$file = "C:\\Windows\\System32\\drivers\\etc\\hosts"
"$($localIP.IPAddress) `t`t apps.$platformurl" | Out-File -encoding ASCII -append $file
(iex ($webClient.DownloadString("https://chocolatey.org/install.ps1")))>$null 2>&1 | Out-Null
$webClient.DownloadFile("http://installs.apprendalabs.com/installscripts/apporchinit.ps1","c:\builder\temp\apporchinit.ps1") | Out-Null
Invoke-Expression "c:\\builder\\temp\\apporchinit.ps1" | Out-Null
choco install -y iis-arr --force | Out-Null
out-file -filepath "C:\builder\temp\$($manifestfile)" -inputobject $manifestxml -encoding utf8
New-Item "C:\Apprenda" -type directory -force
$webClient.DownloadFile("http://installs.apprendalabs.com/installers/apprenda-$($ver).zip","C:\builder\temp\apprenda-$($ver).zip") | Out-Null
[System.IO.Compression.ZipFile]::ExtractToDirectory("c:\builder\temp\apprenda-$($ver).zip", "c:\Apprenda")

