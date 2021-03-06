#ps1_sysnative
$domainPass = "^^domainPass^^"
$domainAdmin = "^^domainAdmin^^"
$domainName = "^^domainName^^"
$domainSuf = "^^domainSuf^^"
$LocalAdmin = "Administrator"
$platformadmin = "^^platformadmin^^"
$platformsystem = "^^platformsystem^^"
$dbadmin = "^^dbadmin^^"
$dbPass = "^^dbPass^^"
$platformurl = "^^url^^"
$instance = "^^instance^^"
$dcip = "^^dns^^"
$callback = "^^callback^^"
$lmip = "^^lmip^^"
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
New-Item "C:\Repo\Apprenda" -type directory -force
New-Item "C:\Repo\Applications" -type directory -force
New-Item "C:\Repo\SAC" -type directory -force
New-Item "C:\Repo\Binds" -type directory -force
New-SMBShare -Name "Apprenda" -Path "C:\Repo\Apprenda" -FullAccess Everyone
New-SMBShare -Name "Applications" -Path "C:\Repo\Applications" -FullAccess Everyone
New-SMBShare -Name "SAC" -Path "C:\Repo\SAC" -FullAccess Everyone
New-SMBShare -Name "Binds" -Path "C:\Repo\Binds" -FullAccess Everyone
New-Item "C:\builder\temp" -type directory -force
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile("http://installs.apprendalabs.com/installers/SQLEXPR_x64_ENU.exe","c:\builder\temp\SQLEXPR_x64_ENU.exe") | Out-Null
$webClient.DownloadFile("http://installs.apprendalabs.com/installscripts/sqlinstall.bat","c:\builder\temp\sqlinstall.bat") | Out-Null
cmd.exe /c "c:\builder\temp\sqlinstall.bat c:\builder\temp\SQLEXPR_x64_ENU.exe $($domainPass)" | Out-Null
(iex ($webClient.DownloadString("https://chocolatey.org/install.ps1")))>$null 2>&1 | Out-Null
choco install -y sql2008.smo | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | Out-Null
$sqlSrv = New-Object 'Microsoft.SqlServer.Management.Smo.Server' "$env:computername\sqlexpress"
$SqlUser = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Login -ArgumentList $sqlSrv, "$($domainName)\$($platformadmin)"
$SqlUser.LoginType = 'WindowsUser'
$sqlUser.PasswordPolicyEnforced = $false
$SqlUser.Create()
$SqlUser.AddToRole('sysadmin')
$SqlUser.Alter()
$SqlUser.AddToRole('serveradmin')
$SqlUser.Alter()
$SqlAdmin = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Login -ArgumentList $sqlSrv, "$($dbadmin)"
$SqlAdmin.LoginType = 'SqlLogin'
$SqlAdmin.PasswordPolicyEnforced = $false
$SqlAdmin.Create($($dbPass))
$SqlAdmin.AddToRole('sysadmin')
$SqlAdmin.Alter()
$SqlAdmin.AddToRole('serveradmin')
$SqlAdmin.Alter()
$lmurl = "http://$($lmip):8024/api/completelm"
Invoke-WebRequest -URI $lmurl -UseBasicParsing
$jobid = "^^jobid^^"
$url = "$($callback)/$($sname)/$($localIP.IPAddress)/$($localIP.IPAddress)/sql/$($jobid)"
write-output $url
Invoke-WebRequest -URI $url -UseBasicParsing
Restart-Computer
