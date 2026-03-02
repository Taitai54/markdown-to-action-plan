$WScriptShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$Shortcut = $WScriptShell.CreateShortcut("$Desktop\Markdown to Action Plan.lnk")
$Shortcut.TargetPath = 'C:\Users\matti\OneDrive\Documents\GitHub\markdown-to-action-plan\start-action-plan.bat'
$Shortcut.WorkingDirectory = 'C:\Users\matti\OneDrive\Documents\GitHub\markdown-to-action-plan'
$Shortcut.IconLocation = 'C:\Users\matti\OneDrive\Documents\GitHub\markdown-to-action-plan\action-plan.ico'
$Shortcut.Description = 'Markdown to Action Plan - Convert markdown into structured action plans'
$Shortcut.Save()
Write-Host 'Desktop shortcut created: Markdown to Action Plan'
