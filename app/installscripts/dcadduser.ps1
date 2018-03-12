#ps1_sysnative
$username = "apptest\Administrator"
$credential = New-Object System.Management.Automation.PSCredential($username,$dsrmPassword)
New-ADUser -Credential $credential -Server "dctest1.apptest.local" -SamAccountName $appadmin -AccountPassword $dsrmPassword -name "$appadmin" -enabled $true -PasswordNeverExpires $true -ChangePasswordAtLogon $false | Out-Null

Add-ADPrincipalGroupMembership -Identity "CN=,CN=Users,DC=corp,DC=krypted,DC=com" -MemberOf "CN=Enterprise Admins,CN=Users,DC=contoso,DC=com","CN=Domain Admins,CN=Users,DC=krypted,DC=com"
