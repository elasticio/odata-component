install-module navcontainerhelper -force

# set accept_eula to $true to accept the eula found here: https://go.microsoft.com/fwlink/?linkid=861843
$accept_eula = $true

$containername = 'DevBC'
$navdockerimage = 'microsoft/bcsandbox'
$appbacpacuri = ''
$tenantbacpacuri = ''

$additionalParameters = @("-p 443:443 -p 80:80 -p 7048:7048")
if ($appbacpacuri -ne '' -and $tenantbacpacuri -ne '') {
    $additionalParameters = @("--env appbacpac=""$appbacpacuri""","--env tenantBacpac=""$tenantbacpacuri""")
}

$credential = get-credential -UserName $env:USERNAME -Message "Using Windows Authentication. Please enter your Windows credentials."
New-NavContainer -accept_eula:$accept_eula -containername $containername -auth Windows -Credential $credential -includeCSide -alwaysPull -doNotExportObjectsToText -usessl:$false -updateHosts -assignPremiumPlan -shortcuts Desktop -imageName $navdockerimage -additionalParameters $additionalParameters

Setup-NavContainerTestUsers -containerName $containername -password $credential.Password

New-NavContainerWindowsUser -containerName DevBC -Credential aluser
New-NavContainerNavUser -containerName DevBC -WindowsAccount aluser -PermissionSetId SUPER

$mycredentials = Get-Credential
New-NavContainerNavUser -containerName DevBC -credential $mycredentials -PermissionSetId SUPER
