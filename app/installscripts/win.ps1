#ps1_sysnative
$domainPass = "^^domainPass^^"
$domainName = "^^domainName^^"
$domainSuf = "^^domainSuf^^"
$LocalAdmin = "Administrator"
$platformadmin = "^^platformadmin^^"
$platformsystem = "^^platformsystem^^"
$dcip = "^^dns^^"
$callback = "^^callback^^"
$objUser = [ADSI]"WinNT://localhost/$($LocalAdmin), user"
$objUser.psbase.Invoke("SetPassword", $domainPass)
$password = $domainPass | ConvertTo-SecureString -asPlainText -Force
$username = "$($domainName)\$($platformadmin)"
$credential = New-Object System.Management.Automation.PSCredential($username,$password)
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses $dcip
Add-Computer -DomainName "$($domainName).$($domainSuf)" -Credential $credential | Out-Null
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
$admin = "$($domainName)\$($platformadmin)"
$sys = "$($domainName)\$($platformsystem)"
$locallogon = "SeInteractiveLogonRight"
$imp = "SeImpersonatePrivilege"
$servicelogon = "SeServiceLogonRight"
$CarbonDllPath = "c:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Carbon\\bin\\Carbon.dll"
[Reflection.Assembly]::LoadFile($CarbonDllPath)
[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)
[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)
[Carbon.Lsa]::GrantPrivileges($admin, $imp)
[Carbon.Lsa]::GrantPrivileges($sys, $imp)
[Carbon.Lsa]::GrantPrivileges($admin, $servicelogon)
[Carbon.Lsa]::GrantPrivileges($sys, $servicelogon)
Install-WindowsFeature -IncludeManagementTools -Name Web-Server,AS-NET-Framework,Web-Net-Ext,Web-Net-Ext45,Web-ASP,Web-Asp-Net,Web-Asp-Net45 | Out-Null
$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq "Ethernet"}
$sname = $env:computername
$webClient = New-Object System.Net.WebClient
(iex ($webClient.DownloadString("https://chocolatey.org/install.ps1")))>$null 2>&1 | Out-Null
choco install -y sql2008.smo | Out-Null
$jobid = "^^jobid^^"
$url = "$($callback)/$($sname)/$($localIP.IPAddress)/$($localIP.IPAddress)/win/$($jobid)"
write-output $url
Invoke-WebRequest -URI $url -UseBasicParsing
Restart-Computer
