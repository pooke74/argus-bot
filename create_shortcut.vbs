Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\Argus Trading.lnk")
oShortcut.TargetPath = "C:\Users\tolga\.gemini\antigravity\scratch\ArgusWeb\start_argus.bat"
oShortcut.WorkingDirectory = "C:\Users\tolga\.gemini\antigravity\scratch\ArgusWeb"
oShortcut.Description = "Argus AI Trading System"
oShortcut.IconLocation = "C:\Windows\System32\shell32.dll,21"
oShortcut.Save
