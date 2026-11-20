using System;
using System.Reflection;
using System.Runtime.InteropServices;

class Monitor {
    static Type _tMgr, _tSession, _tMediaProps, _tTimelineProps, _tPlaybackInfo, _tAsyncInfo, _tIAsyncOpGen, _tIAsyncAction;

    static void Main(string[] args) {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        try {
            LoadTypes();

            if (args.Length > 0 && args[0] == "--control") {
                DoControl(args);
                return;
            }

            object mgr = GetManager();
            if (mgr == null) { Console.WriteLine("NONE"); return; }

            object[] sessions = GetSessions(mgr);
            if (sessions.Length == 0) { Console.WriteLine("NONE"); return; }

            for (int i = 0; i < sessions.Length; i++) {
                try {
                    object session = sessions[i];
                    string srcId = (string)_tSession.GetProperty("SourceAppUserModelId").GetValue(session) ?? "";

                    object props = GetMediaProperties(session);
                    string title = "", artist = "", album = "";
                    if (props != null) {
                        try { title = (string)_tMediaProps.GetProperty("Title").GetValue(props) ?? ""; } catch {}
                        try { artist = (string)_tMediaProps.GetProperty("Artist").GetValue(props) ?? ""; } catch {}
                        try { album = (string)_tMediaProps.GetProperty("AlbumTitle").GetValue(props) ?? ""; } catch {}
                    }

                    object tl = _tSession.GetMethod("GetTimelineProperties").Invoke(session, null);
                    double pos = 0, end = 0;
                    if (tl != null) {
                        try { object p = _tTimelineProps.GetProperty("Position").GetValue(tl); if (p != null) { try { pos = (double)p.GetType().GetProperty("TotalSeconds").GetValue(p); } catch {} } } catch {}
                        try { object e = _tTimelineProps.GetProperty("EndTime").GetValue(tl); if (e != null) { try { end = (double)e.GetType().GetProperty("TotalSeconds").GetValue(e); } catch {} } } catch {}
                    }

                    string status = "Unknown";
                    try { object pbInfo = _tSession.GetMethod("GetPlaybackInfo").Invoke(session, null); if (pbInfo != null) { object st = _tPlaybackInfo.GetProperty("PlaybackStatus").GetValue(pbInfo); if (st != null) status = st.ToString(); } } catch {}

                    Console.WriteLine("S|" + Esc(title) + "|" + Esc(artist) + "|" + Esc(album) + "|" + status + "|" + pos + "|" + end + "|" + Esc(srcId));
                } catch {}
            }
        } catch {}
    }

    static void LoadTypes() {
        Assembly.Load("System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089");
        _tMgr = Type.GetType("Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime", true);
        _tSession = Type.GetType("Windows.Media.Control.GlobalSystemMediaTransportControlsSession,Windows.Media.Control,ContentType=WindowsRuntime", true);
        _tMediaProps = Type.GetType("Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime", true);
        _tTimelineProps = Type.GetType("Windows.Media.Control.GlobalSystemMediaTransportControlsSessionTimelineProperties,Windows.Media.Control,ContentType=WindowsRuntime", true);
        _tPlaybackInfo = Type.GetType("Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackInfo,Windows.Media.Control,ContentType=WindowsRuntime", true);
        _tAsyncInfo = Type.GetType("Windows.Foundation.IAsyncInfo,Windows.Foundation.FoundationContract,ContentType=WindowsRuntime", true);
        _tIAsyncOpGen = Type.GetType("Windows.Foundation.IAsyncOperation`1,Windows.Foundation.FoundationContract,ContentType=WindowsRuntime", true);
        _tIAsyncAction = Type.GetType("Windows.Foundation.IAsyncAction,Windows.Foundation.FoundationContract,ContentType=WindowsRuntime", true);
    }

    static object GetManager() {
        object asyncOp = _tMgr.GetMethod("RequestAsync").Invoke(null, null);
        return AwaitResult(asyncOp, _tMgr);
    }

    static object[] GetSessions(object mgr) {
        object sessionsObj = mgr.GetType().GetMethod("GetSessions").Invoke(mgr, null);
        Type tSessionsView = Type.GetType("Windows.Foundation.Collections.IVectorView`1,Windows.Foundation.FoundationContract,ContentType=WindowsRuntime", true).MakeGenericType(_tSession);
        int count = (int)(uint)tSessionsView.GetProperty("Size").GetValue(sessionsObj);
        object[] result = new object[count];
        for (int i = 0; i < count; i++)
            result[i] = tSessionsView.GetMethod("GetAt").Invoke(sessionsObj, new object[] { (uint)i });
        return result;
    }

    static object GetMediaProperties(object session) {
        object propsOp = _tSession.GetMethod("TryGetMediaPropertiesAsync").Invoke(session, null);
        if (propsOp == null) return null;
        return AwaitResult(propsOp, _tMediaProps);
    }

    static void DoControl(string[] args) {
        // args: --control <sourceId> <action>
        // or:   --control <action> (control first session)
        string srcFilter = null;
        string action = null;
        if (args.Length >= 3) { srcFilter = args[1]; action = args[2]; }
        else if (args.Length >= 2) { action = args[1]; }

        object mgr = GetManager();
        if (mgr == null) return;
        object[] sessions = GetSessions(mgr);

        object targetSession = null;
        foreach (var s in sessions) {
            string sid = (string)_tSession.GetProperty("SourceAppUserModelId").GetValue(s) ?? "";
            if (srcFilter == null || sid.Contains(srcFilter)) {
                targetSession = s;
                break;
            }
        }
        if (targetSession == null) return;

        try {
            MethodInfo method = _tSession.GetMethod(GetControlMethodName(action));
            if (method != null) {
                object op = method.Invoke(targetSession, null);
                if (op != null) AwaitAction(op);
            }
        } catch {}
    }

    static string GetControlMethodName(string action) {
        switch (action.ToLower()) {
            case "play": return "TryPlayAsync";
            case "pause": return "TryPauseAsync";
            case "toggleplaypause":
            case "toggle": return "TryTogglePlayPauseAsync";
            case "next":
            case "skipnext": return "TrySkipNextAsync";
            case "previous":
            case "prev":
            case "skipprevious": return "TrySkipPreviousAsync";
            default: return null;
        }
    }

    static void AwaitAction(object rawOp) {
        IntPtr pInfo = Marshal.GetComInterfaceForObject(rawOp, _tAsyncInfo);
        object info = Marshal.GetObjectForIUnknown(pInfo);
        Marshal.Release(pInfo);
        while (true) {
            int s = (int)_tAsyncInfo.GetProperty("Status").GetValue(info);
            if (s != 0) break;
            System.Threading.Thread.Sleep(50);
        }
    }

    static object AwaitResult(object rawOp, Type resultType) {
        IntPtr pInfo = Marshal.GetComInterfaceForObject(rawOp, _tAsyncInfo);
        object info = Marshal.GetObjectForIUnknown(pInfo);
        Marshal.Release(pInfo);
        while (true) {
            int s = (int)_tAsyncInfo.GetProperty("Status").GetValue(info);
            if (s != 0) break;
            System.Threading.Thread.Sleep(50);
        }
        Type iAsyncOp = _tIAsyncOpGen.MakeGenericType(resultType);
        IntPtr pOp = Marshal.GetComInterfaceForObject(rawOp, iAsyncOp);
        object typedOp = Marshal.GetObjectForIUnknown(pOp);
        object result = iAsyncOp.GetMethod("GetResults").Invoke(typedOp, null);
        Marshal.Release(pOp);
        return result;
    }

    static string Esc(string s) {
        if (s == null) return "";
        return s.Replace("|", " ").Replace("\r","").Replace("\n"," ");
    }
}
