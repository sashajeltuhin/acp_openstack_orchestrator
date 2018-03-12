#Set-ExecutionPolicy Unrestricted before executing
param([string]$domain,[string]$user,[string]$pass)
Write-Host "Params: " $($domain)  $($user)  $($pass)
nssm stop apporch
nssm remove apporch confirm
rm c:\builder\logs -Force
rm c:\builder\orchestrator -Recurse -Force
rm c:\builder\temp\orchestrator.zip -Force
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile("http://installs.apprendalabs.com/orch.zip","c:\builder\temp\orchestrator.zip")
Write-Host "Extracting orchestrator"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("c:\builder\temp\orchestrator.zip", "c:\builder")
Write-Host "Downloading servicebat"
$webClient.DownloadFile("http://installs.apprendalabs.com/installscripts/serviceinit.bat","c:\builder\temp\serviceinit.bat")
cmd.exe /c "c:\builder\temp\serviceinit.bat $domain $user $pass"
