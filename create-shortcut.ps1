$Root = $PSScriptRoot
$WScriptShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$Shortcut = $WScriptShell.CreateShortcut("$Desktop\Markdown to Action Plan.lnk")
$Shortcut.TargetPath = "$Root\start-action-plan.bat"
$Shortcut.WorkingDirectory = $Root
$Shortcut.IconLocation = "$Root\action-plan.ico"
$Shortcut.Description = 'Markdown to Action Plan - Convert markdown into structured action plans'
$Shortcut.Save()
Write-Host 'Desktop shortcut created: Markdown to Action Plan'
