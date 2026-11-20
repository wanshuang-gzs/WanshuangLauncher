Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;
public class WinAPI {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    public static string GetActiveWindowInfo() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "||";
        StringBuilder sb = new StringBuilder(512);
        GetWindowText(hwnd, sb, 512);
        string title = sb.ToString().Replace("|"," ").Replace("\r","").Replace("\n","");
        uint pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        string proc = "";
        try { proc = Process.GetProcessById((int)pid).ProcessName; } catch {}
        return title + "|" + proc;
    }
}
"@
while ($true) {
    $info = [WinAPI]::GetActiveWindowInfo()
    Write-Output $info
    Start-Sleep -Milliseconds 1000
}
