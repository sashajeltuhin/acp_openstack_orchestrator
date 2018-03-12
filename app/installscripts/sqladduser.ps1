[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | Out-Null
$sqlSrv = New-Object 'Microsoft.SqlServer.Management.Smo.Server' "$env:computername\sqlexpress"
$SqlUser = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Login -ArgumentList $sqlSrv, "appdemo\apprendaadmin"
$SqlUser.LoginType = 'WindowsUser'
$sqlUser.PasswordPolicyEnforced = $false
$SqlUser.Create()
$SqlUser.AddToRole('sysadmin')
$SqlUser.Alter()
$SqlUser.AddToRole('serveradmin')
$SqlUser.Alter()
