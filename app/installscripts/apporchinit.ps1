#Set-ExecutionPolicy Unrestricted before executing
(iex ((new-object net.webclient).DownloadString("https://chocolatey.org/install.ps1")))>$null 2>&1 | Out-Null
Write-Host "Downloading orchestrator"
New-Item -ItemType directory -force -Path C:\builder\orchestrator
New-Item -ItemType directory -force -Path C:\builder\nssm
New-Item -ItemType directory -force -Path C:\builder\temp
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile("http://installs.apprendalabs.com/orch.zip","c:\builder\temp\orchestrator.zip") | Out-Null
$webClient.DownloadFile("http://installs.apprendalabs.com/installscripts/apporchupdate.ps1","c:\builder\temp\apporchupdate.ps1")  | Out-Null
Write-Host "Extracting orchestrator"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("c:\builder\temp\orchestrator.zip", "c:\builder")  | Out-Null
Write-Host "Downloading servicebat"
$webClient.DownloadFile("http://installs.apprendalabs.com/installers/serviceinit.bat","c:\builder\temp\serviceini.bat")  | Out-Null
Write-Host "Installing nssm"
choco install -y nssm --force
Write-Host "Installing node"
choco install -y nodejs.install
cmd.exe /c "c:\builder\temp\serviceini.bat %1.%2 %3"
