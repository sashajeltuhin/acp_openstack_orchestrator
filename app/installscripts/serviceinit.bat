
echo %1 %2 %3
nssm install apporch node
nssm set apporch AppDirectory "c:\builder\orchestrator"
nssm set apporch AppParameters "server.js"
nssm set apporch AppStdout "c:\builder\logs"
nssm set apporch AppStderr "c:\builder\logs"
nssm set apporch ObjectName %1\%2 %3
nssm start apporch
