const { app, BrowserWindow, ipcMain, Menu, dialog, shell, nativeImage, net } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { io } = require('socket.io-client');
const { Auth } = require('./src/vendor/auth');

app.setAppUserModelId(app.isPackaged
  ? '045C59DF.WanshuangLauncher'
  : 'com.wanshuang.launcher');

// ── IM Server config (暂停使用，启用前请填入真实服务器地址) ──
const IM_SERVER_URL = '';
const IM_TOKEN_FILE = path.join(app.getPath('userData'), 'im_token.json');

const MINECRAFT_DIR = path.join(process.env.APPDATA || process.env.HOME, '.minecraft');
const JAVA_RUNTIME_DIR = path.join(app.isPackaged ? app.getPath('userData') : __dirname, 'runtime', 'java');
const MIRRORS = [
  { name: 'Official', url: 'https://piston-meta.mojang.com' },
  { name: 'BMCLAPI', url: 'https://bmclapi2.bangbang93.com' },
  { name: 'MCBBS', url: 'https://download.mcbbs.net' },
  { name: 'MCIM', url: 'https://download.mcimirror.top' },
  { name: 'MC-SDK', url: 'https://mc-sdk.xinghai.dev' },
];
const MODRINTH_API = 'https://api.modrinth.com/v2';
let mainWindow = null;
let splashWin = null;
let splashActive = false;
let currentMirror = 0;
let downloadQueue = [];

const LOADER_MIRROR_PATHS = {
  'meta.fabricmc.net': '/fabric-meta',
  'maven.fabricmc.net': '/maven',
  'maven.minecraftforge.net': '/maven',
  'maven.neoforged.net': '/maven',
  'meta.quiltmc.org': '/quilt-meta',
};
function loaderMirrorUrl(originalUrl) {
  const m = MIRRORS[currentMirror];
  if (!m || currentMirror === 0) return originalUrl;
  for (const [domain, path] of Object.entries(LOADER_MIRROR_PATHS)) {
    if (originalUrl.includes(domain))
      return originalUrl.replace('https://' + domain, m.url + path);
  }
  return originalUrl;
}
async function tryLoaderFetch(originalUrl, timeoutMs = 15000) {
  const mapped = loaderMirrorUrl(originalUrl);
  const errors = [];
  // 1) Try mirror-mapped URL
  try { return await httpGet(mapped, null, timeoutMs) } catch (e) { errors.push('mirror: ' + e.message) }
  // 2) Try original URL directly (in case mirror is bad but official works)
  if (mapped !== originalUrl) {
    try { return await httpGet(originalUrl, null, timeoutMs) } catch (e) { errors.push('direct: ' + e.message) }
  }
  // 3) Fallback to BMCLAPI for known loader domains
  for (const [domain, path] of Object.entries(LOADER_MIRROR_PATHS)) {
    if (originalUrl.includes(domain)) {
      try { return await httpGet(originalUrl.replace('https://' + domain, 'https://bmclapi2.bangbang93.com' + path), null, timeoutMs) } catch (e) { errors.push('bmclapi: ' + e.message) }
      break;
    }
  }
  return null;
}
async function speedTestAndAskMirror() {
  const results = [];
  for (let i = 1; i < MIRRORS.length; i++) {
    const m = MIRRORS[i];
    const start = Date.now();
    try {
      await Promise.race([
        httpGet(m.url + '/mc/game/version_manifest_v2.json', null, 8000),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ]);
      results.push({ index: i, name: m.name, ping: Date.now() - start, ok: true });
    } catch { results.push({ index: i, name: m.name, ping: Infinity, ok: false }) }
  }
  const fastest = results.filter(r => r.ok).sort((a, b) => a.ping - b.ping)[0];
  if (fastest && fastest.index !== currentMirror) {
    const r = await dialog.showMessageBox(mainWindow, {
      type: 'question', title: '网络检测',
      message: `下载加载器较慢。当前最快镜像为「${fastest.name}」，是否切换？`,
      buttons: ['切换', '不切换'], defaultId: 0, cancelId: 1,
    });
    if (r.response === 0) {
      currentMirror = fastest.index;
      mainWindow?.webContents.send('mc:mirrorChanged', currentMirror);
      return true;
    }
  }
  return false;
}
let queueIdCounter = 0;

function createSplash() {
  Menu.setApplicationMenu(null);
  const splashPath = path.join(__dirname, 'splash', 'index.html');
  if (!fs.existsSync(splashPath)) { createWindow(); return }
  const startedAt = Date.now();
  splashActive = true;
  splashWin = new BrowserWindow({
    width: 620, height: 340,
    frame: false, resizable: false,
    transparent: false,
    show: false,
    backgroundColor: '#05050a',
    icon: path.join(__dirname, 'public', 'app.ico'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWin.loadFile(splashPath);
  splashWin.center();
  splashWin.once('ready-to-show', () => {
    if (splashWin && !splashWin.isDestroyed()) splashWin.show();
  });
  splashWin.on('closed', () => {
    splashWin = null;
    if (!mainWindow) createWindow();
  });
  createWindow();
  // 启动动画本身约 6.5 秒（打字 + 7 个进度步骤 + 结尾停顿），等它播完再切换主界面
  const finish = () => {
    const wait = Math.max(0, 7000 - (Date.now() - startedAt));
    setTimeout(() => {
      splashActive = false;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
    }, wait);
  };
  if (mainWindow) {
    if (mainWindow.webContents.isLoading()) mainWindow.once('ready-to-show', finish);
    else finish();
  }
  // 兜底：12 秒后无论如何都进入主界面
  setTimeout(() => {
    splashActive = false;
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  }, 12000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 780,
    minWidth: 880, minHeight: 660,
    frame: false,
    transparent: true,
    show: false,
    icon: path.join(__dirname, 'public', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  // 页面渲染完成后再显示，避免透明窗口先闪一下旧内容
  mainWindow.once('ready-to-show', () => {
    if (!splashActive && mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } });
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') callback(true);
    else callback(false);
  });
  // Init bot IPC after window is ready
  try {
    const bot = require('./bot');
    bot.register(mainWindow);
  } catch (e) { /* bot deps not installed */ }
}

app.whenReady().then(createSplash);
app.on('window-all-closed', () => { app.quit() });

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(MINECRAFT_DIR, 'wsl_config.json'), 'utf8')) } catch { return {} }
}
function saveConfig(data) {
  try {
    const dir = path.dirname(path.join(MINECRAFT_DIR, 'wsl_config.json'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(MINECRAFT_DIR, 'wsl_config.json'), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { mainWindow?.webContents.send('mc:log', 'Config save error: ' + e.message) }
}

// ── Window ──
ipcMain.handle('win:minimize', () => mainWindow?.minimize());
ipcMain.handle('win:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() });
ipcMain.handle('win:close', () => mainWindow?.close());

// ── Logo ──
ipcMain.handle('app:logo', () => {
  const logoPath = path.join(__dirname, 'logo.png');
  try {
    if (fs.existsSync(logoPath)) {
      const img = nativeImage.createFromPath(logoPath);
      return img.resize({ width: 32, height: 32 }).toDataURL();
    }
  } catch {}
  return null;
});

// ── Java detect ──
function collectJavaCandidates() {
  const candidates = [];
  try {
    const regOut = execSync('reg query "HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment" /s /v JavaHome 2>nul', { encoding: 'utf8', timeout: 3000 });
    for (const line of regOut.split('\n')) { const m = line.match(/JavaHome\s+REG_SZ\s+(.+)/); if (m) candidates.push(path.join(m[1].trim(), 'bin\\java.exe')) }
  } catch {}
  try {
    const regOut = execSync('reg query "HKLM\\SOFTWARE\\JavaSoft\\JDK" /s /v JavaHome 2>nul', { encoding: 'utf8', timeout: 3000 });
    for (const line of regOut.split('\n')) { const m = line.match(/JavaHome\s+REG_SZ\s+(.+)/); if (m) candidates.push(path.join(m[1].trim(), 'bin\\java.exe')) }
  } catch {}
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  for (const base of [pf, pfx86]) {
    for (const dir of ['Java', 'Eclipse Adoptium', 'BellSoft', 'Amazon Corretto', 'Zulu', 'Microsoft']) {
      const p = path.join(base, dir);
      if (fs.existsSync(p)) {
        for (const entry of fs.readdirSync(p)) {
          for (const exe of ['javaw.exe', 'java.exe']) {
            const bin = path.join(p, entry, 'bin', exe);
            if (fs.existsSync(bin)) candidates.push(bin);
          }
        }
      }
    }
  }
  if (process.env.JAVA_HOME) {
    for (const exe of ['javaw.exe', 'java.exe']) {
      const bin = path.join(process.env.JAVA_HOME, 'bin', exe);
      if (fs.existsSync(bin)) candidates.push(bin);
    }
  }
  try { const out = execSync('where java 2>nul', { encoding: 'utf8', timeout: 3000 }); for (const line of out.split('\n')) { const p = line.trim(); if (p && fs.existsSync(p)) candidates.push(p) } } catch {}
  // 启动器内置下载的 Java
  try {
    if (fs.existsSync(JAVA_RUNTIME_DIR)) {
      for (const entry of fs.readdirSync(JAVA_RUNTIME_DIR)) {
        const dir = path.join(JAVA_RUNTIME_DIR, entry);
        let isDir = false;
        try { isDir = fs.statSync(dir).isDirectory() } catch {}
        if (!isDir) continue;
        for (const exe of ['javaw.exe', 'java.exe']) {
          const bin = path.join(dir, 'bin', exe);
          if (fs.existsSync(bin)) candidates.push(bin);
        }
      }
    }
  } catch {}
  return [...new Set(candidates)].filter(p => fs.existsSync(p));
}

function javaMajorFromPath(javaPath) {
  const folder = path.basename(path.dirname(path.dirname(javaPath))).toLowerCase();
  let m = folder.match(/(?:jdk|jre)[-_]?(\d+)/);
  if (m) { const n = parseInt(m[1]); return n === 1 ? 8 : n }
  m = folder.match(/1\.(\d+)/);
  if (m) return parseInt(m[1]);
  return 0;
}

function probeJavaMajor(javaPath) {
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    const finish = (major) => { if (done) return; done = true; resolve(major) };
    try {
      const p = spawn(javaPath, ['-version'], { windowsHide: true });
      const collect = (d) => { out += d.toString() };
      p.stdout.on('data', collect);
      p.stderr.on('data', collect);
      const timer = setTimeout(() => { try { p.kill() } catch {}; finish(0) }, 5000);
      p.on('close', () => {
        clearTimeout(timer);
        const m = out.match(/version "(\d+)(?:\.(\d+))?/);
        finish(m ? (m[1] === '1' ? parseInt(m[2] || '0') : parseInt(m[1])) : 0);
      });
      p.on('error', () => { clearTimeout(timer); finish(0) });
    } catch { finish(0) }
  });
}

// Minecraft 版本所需的 Java 主版本
function requiredJavaMajor(mcVersion) {
  const m = String(mcVersion || '').match(/1\.(\d+)(?:\.(\d+))?/);
  if (!m) return 0;
  const minor = parseInt(m[1]); const patch = parseInt(m[2] || '0');
  if (minor <= 16) return 8;
  if (minor <= 19) return 17;
  if (minor === 20) return patch >= 5 ? 21 : 17;
  return 21;
}

async function chooseJava(mcVersion) {
  const all = collectJavaCandidates();
  if (!all.length) return null;
  const probed = (await Promise.all(all.slice(0, 16).map(async (p) => {
    const major = (await probeJavaMajor(p)) || javaMajorFromPath(p);
    return { path: p, major };
  }))).filter(x => x.major > 0);
  const req = requiredJavaMajor(mcVersion);
  if (probed.length) {
    if (req) {
      const compatible = probed.filter(x => x.major >= req).sort((a, b) => a.major - b.major);
      if (compatible.length) return { ...compatible[0], required: req };
    }
    for (const major of [21, 17, 8]) {
      const hit = probed.find(x => x.major === major);
      if (hit) return { ...hit, required: req };
    }
    return { ...probed.sort((a, b) => b.major - a.major)[0], required: req };
  }
  return { path: all[0], major: 0, required: req };
}

// 按版本 JSON 声明的 Java 主版本挑选（优先精确匹配，其次更高版本）
async function chooseJavaForMajor(required) {
  if (!required) return null;
  const all = collectJavaCandidates();
  if (!all.length) return null;
  const probed = (await Promise.all(all.slice(0, 16).map(async (p) => {
    const major = (await probeJavaMajor(p)) || javaMajorFromPath(p);
    return { path: p, major };
  }))).filter(x => x.major > 0);
  const exact = probed.find(x => x.major === required);
  if (exact) return { ...exact, required };
  const above = probed.filter(x => x.major > required).sort((a, b) => a.major - b.major)[0];
  if (above) return { ...above, required };
  return null;
}

// 整合包实例 / 加载器版本 → 对应的原版版本号
function baseGameVersionOf(versionId) {
  try {
    const p = path.join(MINECRAFT_DIR, 'versions', versionId, versionId + '.json');
    const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (meta.wslPack?.mcVersion) return meta.wslPack.mcVersion;
    if (meta.inheritsFrom) return baseGameVersionOf(meta.inheritsFrom) || meta.inheritsFrom;
  } catch {}
  return versionId;
}

ipcMain.handle('java:detect', async (_, mcVersion) => {
  const r = await chooseJava(mcVersion);
  return r ? r.path : null;
});

ipcMain.handle('java:detectBest', async (_, mcVersion) => {
  return await chooseJava(mcVersion);
});

ipcMain.handle('java:detectAll', () => collectJavaCandidates());

ipcMain.handle('java:browse', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'Java', extensions: ['exe'] }],
  });
  return r.canceled ? null : r.filePaths[0];
});

// ── OAuth (via MSMC) ──
const AVATAR_CACHE_DIR = path.join(app.getPath('userData'), 'cache', 'avatars');

async function getCachedAvatar(uuid, log) {
  if (!uuid) { log('OAuth: avatar skipped - no uuid'); return null }
  const dir = AVATAR_CACHE_DIR;
  const file = path.join(dir, uuid + '.png');
  // Try reading from cache first
  try {
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      log('OAuth: avatar loaded from cache (' + buf.length + ' bytes)');
      return 'data:image/png;base64,' + buf.toString('base64');
    }
  } catch (e) { log('OAuth: avatar cache read error: ' + e.message) }
  // Download from minotar (most reliable)
  const sources = [
    'https://minotar.net/helm/' + uuid + '/100',
    'https://minotar.net/avatar/' + uuid + '/100',
    'https://crafatar.com/avatars/' + uuid + '?overlay',
  ];
  for (const url of sources) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      log('OAuth: downloading avatar from ' + url);
      const res = await fetch(url, { timeout: 10000 });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(file, buf);
        log('OAuth: avatar downloaded (' + buf.length + ' bytes) from ' + url);
        return 'data:image/png;base64,' + buf.toString('base64');
      }
      log('OAuth: avatar HTTP ' + res.status + ' from ' + url);
    } catch (e) { log('OAuth: avatar error from ' + url + ': ' + e.message) }
  }
  log('OAuth: avatar all sources failed');
  return null;
}

ipcMain.handle('auth:microsoft', async () => {
  try {
    mainWindow?.webContents.send('mc:log', 'OAuth: launching MSMC popup...');
    const authManager = new Auth('select_account');
    authManager.on('load', (code, msg) => {
      mainWindow?.webContents.send('mc:log', 'MSMC: ' + msg);
    });
    const xbox = await authManager.launch('electron', { width: 600, height: 700, parent: mainWindow, modal: true, icon: path.join(__dirname, 'public', 'app.ico') });
    mainWindow?.webContents.send('mc:log', 'OAuth: XBL done, getting Minecraft token...');
    const mc = await xbox.getMinecraft();
    mainWindow?.webContents.send('mc:log', 'OAuth: got Minecraft profile: ' + mc.profile.name);
    const log = (m) => mainWindow?.webContents.send('mc:log', m);
    const avatar = await getCachedAvatar(mc.profile.id, log);
    return {
      name: mc.profile.name,
      uuid: mc.profile.id,
      token: mc.mcToken,
      refresh: mc.refreshTkn || '',
      avatar,
    };
  } catch (e) {
    const msg = e.message || String(e);
    mainWindow?.webContents.send('mc:log', 'OAuth error: ' + msg);
    return null;
  }
});

ipcMain.handle('auth:microsoftRefresh', async (_, refreshToken) => {
  try {
    mainWindow?.webContents.send('mc:log', 'OAuth: refreshing token...');
    const authManager = new Auth('select_account');
    authManager.on('load', (code, msg) => {
      mainWindow?.webContents.send('mc:log', 'MSMC: ' + msg);
    });
    const xbox = await authManager.refresh(refreshToken);
    const mc = await xbox.getMinecraft();
    const log = (m) => mainWindow?.webContents.send('mc:log', m);
    const avatar = await getCachedAvatar(mc.profile.id, log);
    return {
      name: mc.profile.name,
      uuid: mc.profile.id,
      token: mc.mcToken,
      refresh: mc.refreshTkn || refreshToken,
      avatar,
    };
  } catch (e) {
    const msg = e.message || String(e);
    mainWindow?.webContents.send('mc:log', 'OAuth refresh error: ' + msg);
    throw new Error(msg);
  }
});

ipcMain.handle('auth:logout', () => {});

// ── HTTP ──
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
function httpGet(url, headers, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = net.request(url);
    const timer = setTimeout(() => { try { req.abort() } catch {}; reject(new Error('HTTP 408: timeout')) }, timeoutMs);
    if (headers) for (const [k, v] of Object.entries(headers)) req.setHeader(k, v);
    req.setHeader('User-Agent', UA);
    let d = '';
    req.on('response', (res) => { clearTimeout(timer); res.setEncoding('utf8'); res.on('data', c => d += c); res.on('end', () => { if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ': ' + d.slice(0, 200))); try { resolve(JSON.parse(d)) } catch { resolve(d) } }) });
    req.on('error', (e) => { clearTimeout(timer); reject(e) });
    req.end();
  });
}
function httpPost(url, body) {
  const bodyStr = JSON.stringify(body);
  mainWindow?.webContents.send('mc:log', 'OAuth: httpPost -> ' + url + ' body=' + bodyStr.slice(0, 500));
  return new Promise((resolve, reject) => {
    const req = net.request({ method: 'POST', url });
    req.setHeader('Content-Type', 'application/json');
    req.setHeader('Accept', 'application/json');
    req.setHeader('User-Agent', UA);
    let d = '';
    req.on('response', (res) => {
      mainWindow?.webContents.send('mc:log', 'OAuth: httpPost <- ' + url + ' status=' + res.statusCode);
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          let msg = d;
          try { const j = JSON.parse(d); if (j.error) msg = j.error; if (j.error_description) msg += ': ' + j.error_description } catch {}
          let hdrLog = '';
          try { for (const [k, v] of Object.entries(res.headers)) hdrLog += k + '=' + v + '; ' } catch {}
          mainWindow?.webContents.send('mc:log', 'OAuth: XBL/XSTS raw: HTTP ' + res.statusCode + ' headers=[' + hdrLog + '] body=[' + d + ']');
          reject(new Error('HTTP ' + res.statusCode + ': ' + msg));
        } else {
          try { resolve(JSON.parse(d)) } catch { reject(new Error(d)) }
        }
      });
    });
    req.on('error', (e) => {
      mainWindow?.webContents.send('mc:log', 'OAuth: httpPost net.error: ' + e.message);
      reject(e);
    });
    req.write(bodyStr);
    req.end();
  });
}
function httpPostForm(url, data) {
  // Manually build & log each param (clamped for display)
  const parts = [];
  for (const [k, v] of Object.entries(data)) {
    parts.push(encode(k) + '=' + encode(v));
  }
  const body = parts.join('&');
  mainWindow?.webContents.send('mc:log', 'OAuth: POST ' + url + ' body=[' + parts.map(p => p.length > 120 ? p.slice(0, 60) + '…' : p).join(', ') + ']');
  mainWindow?.webContents.send('mc:log', 'OAuth: POST body raw len=' + body.length);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  }).then(async (res) => {
    mainWindow?.webContents.send('mc:log', 'OAuth: resp status=' + res.status);
    let text = '';
    try { text = await res.text() } catch (e) { text = 'read-body-failed: ' + e.message }
    mainWindow?.webContents.send('mc:log', 'OAuth raw: HTTP ' + res.status + ' body=[' + text + ']');
    if (res.status !== 200) {
      let msg = text;
      try { const j = JSON.parse(text); if (j.error) msg = j.error; if (j.error_description) msg += ': ' + j.error_description } catch {}
      throw new Error('HTTP ' + res.status + ': ' + msg);
    }
    try { return JSON.parse(text) } catch { throw new Error(text) }
  }).catch(e => {
    if (!e.message.startsWith('HTTP ')) {
      mainWindow?.webContents.send('mc:log', 'OAuth fetch error: ' + e.message);
      mainWindow?.webContents.send('mc:log', 'OAuth fetch error stack: ' + e.stack?.slice(0, 500));
    }
    throw e;
  });
}

// ── Mirror ──
ipcMain.handle('mc:getMirrors', () => MIRRORS.map(m => ({ ...m })));
ipcMain.handle('mc:setMirror', (_, val) => { currentMirror = val; return true });

function mirrorUrl(path) {
  const m = MIRRORS[currentMirror];
  if (!m) return 'https://piston-meta.mojang.com' + path;
  return m.url + path;
}

// ── Versions ──
ipcMain.handle('mc:fetchVersions', async () => {
  try {
    const data = await httpGet(mirrorUrl('/mc/game/version_manifest_v2.json'));
    return (data?.versions || []).map(v => ({ id: v.id, type: v.type, time: v.time, releaseTime: v.releaseTime, url: v.url }));
  } catch { return [] }
});

ipcMain.handle('mc:getLocalVersions', () => {
  const dir = path.join(MINECRAFT_DIR, 'versions');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.existsSync(path.join(dir, f, f + '.json')));
});

ipcMain.handle('mc:getVersionMeta', (_, id) => {
  try { return JSON.parse(fs.readFileSync(path.join(MINECRAFT_DIR, 'versions', id, id + '.json'), 'utf8')) } catch { return null }
});

// ── 完整安装版本（客户端、依赖库、资源、运行库解压）──
ipcMain.handle('mc:installVersion', async (_, versionId) => {
  const sendLog = (msg) => mainWindow?.webContents.send('mc:log', msg);
  const report = (stage, message, pct) => mainWindow?.webContents.send('mc:installProgress', { stage, message, pct: Math.max(0, Math.min(100, Math.round(pct))) });
  try {
    report('meta', '正在获取版本信息...', 3);
    const meta = await resolveVersion(versionId);
    sendLog('Installing version: ' + versionId);

    report('libraries', '正在下载依赖库...', 8);
    let lastLibPct = 8;
    await resolveLibraries(meta, sendLog, (done, total) => {
      const pct = 8 + (done / Math.max(total, 1)) * 32;
      if (pct - lastLibPct >= 1) { lastLibPct = pct; report('libraries', '正在下载依赖库 ' + done + '/' + total, pct) }
    });

    report('assets-index', '正在获取资源索引...', 42);
    const assetIndexData = await getAssetIndex(meta, sendLog);

    report('assets', '正在校验资源文件...', 45);
    let lastAssetPct = 45;
    await resolveAssets(assetIndexData, sendLog, (done, total) => {
      const pct = 45 + (done / Math.max(total, 1)) * 50;
      if (pct - lastAssetPct >= 1) { lastAssetPct = pct; report('assets', '正在下载资源文件 ' + done + '/' + total, pct) }
    });

    report('natives', '正在解压运行库...', 97);
    await extractNatives(meta, sendLog);

    report('mods', '正在预装皮肤模组...', 98);
    try {
      const preset = await preinstallSkinMods(versionId, sendLog);
      if (preset.skipped === 'no-loader') sendLog('原版版本无需预装皮肤模组');
      else if (preset.installed?.length) sendLog('预装模组完成: ' + preset.installed.join(', '));
    } catch (e) {
      sendLog('预装模组失败: ' + e.message);
    }

    report('done', '安装完成', 100);
    sendLog('Version installed: ' + versionId);
    return { success: true, versionId };
  } catch (e) {
    sendLog('Install error: ' + e.message);
    report('error', e.message, 0);
    return { success: false, error: e.message };
  }
});

// ── Download with retry ──
async function downloadWithRetry(url, dest, retries = 3, onProgress) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (url.startsWith('data:')) {
        const b64 = url.includes('base64,'); const data = url.split(',')[1]; const buf = b64 ? Buffer.from(data, 'base64') : Buffer.from(data, 'utf8');
        fs.writeFileSync(dest, buf); return true;
      }
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = net.request(url);
        let total = 0, dl = 0, settled = false, idleTimer = null;
        const settle = (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(idleTimer);
          if (err) reject(err); else resolve();
        };
        // 30 秒没有任何数据就放弃，交给上层重试，避免永久卡住
        const armIdle = () => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            try { req.abort() } catch {}
            try { file.destroy() } catch {}
            settle(new Error('下载超时（30 秒无数据）'));
          }, 30000);
        };
        armIdle();
        req.on('response', (res) => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            res.resume();
            try { file.destroy() } catch {}
            try { fs.unlinkSync(dest) } catch {}
            settle(new Error('HTTP ' + res.statusCode));
            return;
          }
          total = parseInt(res.headers['content-length'] || '0');
          armIdle();
          res.on('data', c => { dl += c.length; armIdle(); if (total > 0 && onProgress) onProgress(dl, total) });
          res.on('error', (e) => { try { file.destroy() } catch {}; settle(e) });
          res.pipe(file);
        });
        file.on('finish', () => {
          try { file.close() } catch {}
          // 服务端提前断开时 length 对不上，删掉半截文件让上层重试，避免留下损坏的 jar
          if (total > 0 && dl < total) {
            try { fs.unlinkSync(dest) } catch {}
            settle(new Error('下载不完整: ' + dl + '/' + total));
            return;
          }
          settle();
        });
        file.on('error', (e) => { try { file.destroy() } catch {}; settle(e) });
        req.on('error', (e) => settle(e));
        req.on('abort', () => settle(new Error('下载已中止')));
        req.end();
      });
      return true;
    } catch (e) { if (attempt === retries) { return false } }
  }
  return false;
}

ipcMain.handle('mc:downloadFile', (_, url, dest) => downloadWithRetry(url, dest));

// ── Download queue ──
ipcMain.handle('mc:queueDownload', async (_, items) => {
  const queueId = ++queueIdCounter;
  const entry = { id: queueId, items: items.map(it => ({ ...it, progress: 0, status: 'pending' })), total: items.length, done: 0, cancelled: false };
  downloadQueue.push(entry);
  const send = () => mainWindow?.webContents.send('mc:queueProgress', entry.items);

  for (const item of entry.items) {
    if (entry.cancelled) { item.status = 'cancelled'; continue }
    item.status = 'downloading';
    send();
    const ok = await downloadWithRetry(item.url, item.dest, 3, (dl, total) => { item.progress = Math.round((dl / total) * 100) });
    if (ok) { item.status = 'done'; entry.done++ } else { item.status = 'error' }
    send();
  }
  return queueId;
});

ipcMain.handle('mc:cancelQueue', (_, id) => {
  const e = downloadQueue.find(x => x.id === id);
  if (e) e.cancelled = true;
});

// ── Modrinth API ──
ipcMain.handle('mc:searchResources', async (_, opts) => {
  const { query, type, limit = 40, offset = 0 } = opts || {};
  const facets = [];
  if (type && type !== 'all') facets.push(["project_type:" + type]);
  let url = `${MODRINTH_API}/search?limit=${limit}&offset=${offset}`;
  if (query) url += `&query=${encodeURIComponent(query)}`;
  if (facets.length) url += `&facets=${encodeURIComponent(JSON.stringify(facets))}`;
  try { return await httpGet(url) } catch { return null }
});

// ── Loaders ──
ipcMain.handle('mc:getLoaders', async (_, versionId) => {
  const loaders = [];
  let needAsk = false;

  async function fetchOrFail(url) {
    const r = await tryLoaderFetch(url);
    if (r !== null) return r;
    needAsk = true;
    return null;
  }

  // Fabric
  try {
    const fabricData = await fetchOrFail('https://meta.fabricmc.net/v2/versions/loader/' + encodeURIComponent(versionId));
    if (fabricData && Array.isArray(fabricData) && fabricData.length > 0) {
      const lv = fabricData[0].loader.version;
      const installerData = await fetchOrFail('https://maven.fabricmc.net/net/fabricmc/fabric-installer/maven-metadata.xml');
      const ivMatch = typeof installerData === 'string' ? installerData.match(/<release>([^<]+)<\/release>/) : null;
      const iv = ivMatch ? ivMatch[1] : '1.0.1';
      loaders.push({ name: 'Fabric', type: 'fabric', version: lv, downloadUrl: 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/' + iv + '/fabric-installer-' + iv + '.jar', installerVersion: iv, icon: 'loader-fabric' });
    }
  } catch {}
  // Quilt
  try {
    const quiltData = await fetchOrFail('https://meta.quiltmc.org/v3/versions/loader/' + encodeURIComponent(versionId));
    if (quiltData && Array.isArray(quiltData) && quiltData.length > 0) {
      const lv = quiltData[0].loader.version;
      loaders.push({ name: 'Quilt', type: 'quilt', version: lv, downloadUrl: 'https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.10.2/quilt-installer-0.10.2.jar', installerVersion: '0.10.2', icon: 'loader-quilt' });
    }
  } catch {}
  // Forge
  try {
    const forgeXml = await fetchOrFail('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml');
    if (typeof forgeXml === 'string') {
      const fv = (forgeXml.match(/<version>([^<]+)<\/version>/g) || []).map(m => m.replace(/<\/?version>/g, '')).filter(v => v.startsWith(versionId + '-')).sort().pop();
      if (fv) loaders.push({ name: 'Forge', type: 'forge', version: fv, downloadUrl: 'https://maven.minecraftforge.net/net/minecraftforge/forge/' + fv + '/forge-' + fv + '-installer.jar', icon: 'loader-forge' });
    }
  } catch {}
  // NeoForge
  try {
    const neoXml = await fetchOrFail('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml');
    if (typeof neoXml === 'string') {
      const nv = (neoXml.match(/<version>([^<]+)<\/version>/g) || []).map(m => m.replace(/<\/?version>/g, '')).filter(v => v.startsWith(versionId + '-')).sort().pop();
      if (nv) loaders.push({ name: 'NeoForge', type: 'neoforge', version: nv, downloadUrl: 'https://maven.neoforged.net/releases/net/neoforged/neoforge/' + nv + '/neoforge-' + nv + '-installer.jar', icon: 'loader-neoforge' });
    }
  } catch {}

  if (needAsk && loaders.length === 0) {
    const switched = await speedTestAndAskMirror();
    if (switched) return ipcMain.emit('mc:getLoaders', null, versionId);
  }
  return loaders;
});

async function installLoaderInternal({ mcVersion, loaderName, loaderType, loaderVersion, downloadUrl, javaPath: jp }) {
  const javaPath = jp || 'java';
  const newId = mcVersion + '-' + loaderName.toLowerCase();
  const verDir = path.join(MINECRAFT_DIR, 'versions', newId);
  const log = (msg) => mainWindow?.webContents.send('mc:log', msg);

  if (fs.existsSync(path.join(verDir, newId + '.json'))) {
    return { alreadyInstalled: true, newVersionId: newId };
  }

  function sendProgress(items, total, done) {
    mainWindow?.webContents.send('mc:queueProgress', items, total, done);
  }

  try {
    fs.mkdirSync(verDir, { recursive: true });

    if (loaderType === 'fabric' || loaderType === 'quilt') {
      const metaUrl = loaderType === 'fabric'
        ? 'https://meta.fabricmc.net/v2/versions/loader/' + encodeURIComponent(mcVersion) + '/' + encodeURIComponent(loaderVersion) + '/profile/json'
        : 'https://meta.quiltmc.org/v3/versions/loader/' + encodeURIComponent(mcVersion) + '/' + encodeURIComponent(loaderVersion) + '/profile/json';
      const qItems = [
        { name: '获取配置文件', progress: 0, status: 'pending' },
        { name: '原版客户端', progress: 0, status: 'pending' },
        { name: '复制原版 jar', progress: 0, status: 'pending' },
        { name: '下载依赖库', progress: 0, status: 'pending' },
        { name: '完成', progress: 0, status: 'pending' },
      ];
      sendProgress(qItems, 5, 0);

      qItems[0].status = 'downloading'; sendProgress(qItems, 5, 0);
      log('正在获取 ' + loaderName + ' 配置文件...');
      const profile = await tryLoaderFetch(metaUrl);
      if (profile === null) throw new Error('无法获取加载器配置文件（网络超时）');
      if (!profile || typeof profile !== 'object') throw new Error('无法获取加载器配置文件');
      profile.id = newId;
      fs.writeFileSync(path.join(verDir, newId + '.json'), JSON.stringify(profile, null, 2), 'utf8');
      qItems[0].progress = 100; qItems[0].status = 'done'; sendProgress(qItems, 5, 1);

      qItems[1].status = 'downloading'; sendProgress(qItems, 5, 1);
      const srcJar = path.join(MINECRAFT_DIR, 'versions', mcVersion, mcVersion + '.jar');
      if (!fs.existsSync(srcJar)) {
        log('未找到原版 ' + mcVersion + '.jar，正在下载...');
        const baseMetaPath = path.join(MINECRAFT_DIR, 'versions', mcVersion, mcVersion + '.json');
        let baseMeta = null;
        if (fs.existsSync(baseMetaPath)) {
          try { baseMeta = JSON.parse(fs.readFileSync(baseMetaPath, 'utf8')) } catch {}
        }
        if (!baseMeta) {
          try {
            const manifest = await httpGet(mirrorUrl('/mc/game/version_manifest_v2.json'));
            const verEntry = manifest?.versions?.find(v => v.id === mcVersion);
            if (verEntry?.url) baseMeta = await httpGet(verEntry.url);
          } catch {}
        }
        const clientUrl = baseMeta?.downloads?.client?.url;
        if (clientUrl) {
          fs.mkdirSync(path.join(MINECRAFT_DIR, 'versions', mcVersion), { recursive: true });
          if (!fs.existsSync(baseMetaPath) && baseMeta) {
            fs.writeFileSync(baseMetaPath, JSON.stringify(baseMeta, null, 2), 'utf8');
          }
          const ok = await downloadWithRetry(clientUrl, srcJar);
          if (!ok) throw new Error('原版 ' + mcVersion + '.jar 下载失败');
          log('原版客户端下载完成');
        } else {
          throw new Error('无法获取原版客户端下载地址');
        }
      }
      qItems[1].progress = 100; qItems[1].status = 'done'; sendProgress(qItems, 5, 2);

      qItems[2].status = 'downloading'; sendProgress(qItems, 5, 2);
      if (fs.existsSync(srcJar)) {
        fs.copyFileSync(srcJar, path.join(verDir, newId + '.jar'));
        log('已复制原版 jar');
      }
      qItems[2].progress = 100; qItems[2].status = 'done'; sendProgress(qItems, 5, 3);

      qItems[3].status = 'downloading'; sendProgress(qItems, 5, 3);
      const libs = profile.libraries || [];
      let libDone = 0;
      for (let i = 0; i < libs.length; i++) {
        const lib = libs[i];
        const libPath = getLibraryPath(lib);
        if (!libPath) continue;
        if (!fs.existsSync(libPath)) {
          const libUrl = getLibraryUrl(lib);
          if (libUrl) {
            fs.mkdirSync(path.dirname(libPath), { recursive: true });
            await downloadWithRetry(loaderMirrorUrl(libUrl), libPath);
          }
        }
        libDone++;
        qItems[3].progress = Math.round((libDone / libs.length) * 100);
        sendProgress(qItems, 5, 3);
      }
      qItems[3].progress = 100; qItems[3].status = 'done'; sendProgress(qItems, 5, 4);

      qItems[4].progress = 100; qItems[4].status = 'done'; sendProgress(qItems, 5, 5);
    } else if (loaderType === 'forge' || loaderType === 'neoforge') {
      const qItems = [
        { name: '下载安装器', progress: 0, status: 'pending' },
        { name: '运行安装器', progress: 0, status: 'pending' },
        { name: '整理版本目录', progress: 0, status: 'pending' },
        { name: '完成', progress: 0, status: 'pending' },
      ];
      sendProgress(qItems, 4, 0);

      const versionsDir = path.join(MINECRAFT_DIR, 'versions');
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const verShort = loaderVersion.startsWith(mcVersion + '-') ? loaderVersion.slice(mcVersion.length + 1) : loaderVersion;
      const candidateNames = loaderType === 'forge'
        ? [mcVersion + '-forge-' + verShort]
        : ['neoforge-' + verShort, mcVersion + '-neoforge-' + verShort];
      let created = candidateNames.find(name => {
        const dir = path.join(versionsDir, name);
        try { return fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.endsWith('.json')) } catch { return false }
      });

      if (created) {
        log('发现已安装的 ' + loaderName + ' 版本 ' + created + '，直接复用');
        qItems[0].progress = 100; qItems[0].status = 'done';
        qItems[1].progress = 100; qItems[1].status = 'done';
        sendProgress(qItems, 4, 2);
      } else {
        qItems[0].status = 'downloading'; sendProgress(qItems, 4, 0);
        // Forge/NeoForge 安装器要求目标目录里有 launcher_profiles.json，否则直接报错退出
        const profilesPath = path.join(MINECRAFT_DIR, 'launcher_profiles.json');
        let profilesData = null;
        try { profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf8')) } catch {}
        if (!profilesData || !profilesData.profiles) {
          fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {}, settings: { language: 'zh_cn' }, version: 3 }, null, 2), 'utf8');
          log('已创建 launcher_profiles.json（加载器安装器要求）');
        }
        const installerPath = path.join(MINECRAFT_DIR, 'runtime', 'loader-installer.jar');
        fs.mkdirSync(path.join(MINECRAFT_DIR, 'runtime'), { recursive: true });
        log('正在下载 ' + loaderName + ' 安装器...');
        const dlUrls = [loaderMirrorUrl(downloadUrl)];
        if (dlUrls[0] !== downloadUrl) dlUrls.push(downloadUrl);
        for (const [domain, path] of Object.entries(LOADER_MIRROR_PATHS)) {
          if (downloadUrl.includes(domain)) {
            dlUrls.push(downloadUrl.replace('https://' + domain, 'https://bmclapi2.bangbang93.com' + path));
            break;
          }
        }
        let dlOk = false;
        for (const u of dlUrls) {
          if (await downloadWithRetry(u, installerPath)) { dlOk = true; break }
        }
        if (!dlOk) throw new Error(loaderName + ' 安装器下载失败，请检查网络或切换下载源');
        qItems[0].progress = 100; qItems[0].status = 'done'; sendProgress(qItems, 4, 1);

        qItems[1].status = 'downloading'; sendProgress(qItems, 4, 1);
        log('正在运行 ' + loaderName + ' 安装器...');
        const versionsBefore = new Set(fs.readdirSync(versionsDir));
        const cmd = '--installClient';
        const runInstaller = (extra) => new Promise((resolve) => {
          const child = spawn(javaPath, ['-jar', installerPath, cmd, ...extra], { cwd: MINECRAFT_DIR, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
          let out = '';
          const timer = setTimeout(() => {
            try { child.kill() } catch {}
            resolve({ code: -1, out: out + '\n安装器运行超时（3 分钟）' });
          }, 180000);
          const onData = (d) => {
            const t = String(d).trim();
            if (t) out = (out + '\n' + t).slice(-4000);
            if (t) log(t.substring(0, 200));
          };
          child.stdout.on('data', onData);
          child.stderr.on('data', onData);
          child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out: String(e.message) }) });
          child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }) });
        });
        const findCreated = () => fs.readdirSync(versionsDir).find(f => !versionsBefore.has(f)) ||
          candidateNames.find(n => fs.existsSync(path.join(versionsDir, n)));
        // 显式传入 .minecraft 作为目标目录：部分 JDK 在父目录含非 ASCII 字符时，
        // 用工作目录 "." 找不到 launcher_profiles.json，会直接报 "no minecraft launcher profile"
        let run = await runInstaller([MINECRAFT_DIR]);
        if (run.code !== 0 && !findCreated()) {
          log(loaderName + ' 指定目录安装失败，改用工作目录重试: ' + run.out.substring(Math.max(0, run.out.length - 200)));
          run = await runInstaller([]);
        }
        if (run.code !== 0 || !findCreated()) {
          const made = findCreated();
          const madeDir = made ? path.join(versionsDir, made) : null;
          const madeOk = madeDir && fs.existsSync(madeDir) && fs.readdirSync(madeDir).some(f => f.endsWith('.json'));
          if (madeOk) {
            log(loaderName + ' 安装器返回错误，但已生成有效版本目录 ' + made + '，继续导入');
            created = made;
          } else {
            try { fs.unlinkSync(installerPath) } catch {}
            throw new Error(loaderName + ' 安装器运行失败（退出码 ' + run.code + '）: ' + run.out.substring(Math.max(0, run.out.length - 300)));
          }
        }
        qItems[1].progress = 100; qItems[1].status = 'done'; sendProgress(qItems, 4, 2);

        qItems[2].status = 'downloading'; sendProgress(qItems, 4, 2);
        const versionsAfter = fs.readdirSync(versionsDir);
        created = versionsAfter.find(f => !versionsBefore.has(f));
        if (!created) {
          created = candidateNames.find(name => fs.existsSync(path.join(versionsDir, name)));
        }
        if (!created) throw new Error(loaderName + ' 安装器运行完毕但未生成版本文件夹');
        log('安装器生成的版本: ' + created);
      }
      const tempDir = path.join(versionsDir, created);
      if (tempDir !== verDir) {
        if (fs.existsSync(verDir)) fs.rmSync(verDir, { recursive: true });
        fs.renameSync(tempDir, verDir);
      }
      const createdJson = fs.readdirSync(verDir).find(f => f.endsWith('.json') && f !== newId + '.json');
      if (createdJson) {
        const jsonPath = path.join(verDir, createdJson);
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        data.id = newId;
        fs.writeFileSync(path.join(verDir, newId + '.json'), JSON.stringify(data, null, 2), 'utf8');
        fs.unlinkSync(jsonPath);
      }
      const createdJar = fs.readdirSync(verDir).find(f => f.endsWith('.jar') && f !== newId + '.jar');
      if (createdJar) {
        fs.renameSync(path.join(verDir, createdJar), path.join(verDir, newId + '.jar'));
      }
      try { fs.unlinkSync(installerPath) } catch {}
      qItems[2].progress = 100; qItems[2].status = 'done'; sendProgress(qItems, 4, 3);

      qItems[3].progress = 100; qItems[3].status = 'done'; sendProgress(qItems, 4, 4);
    }

    log('加载器安装完成: ' + newId);
    try {
      const preset = await preinstallSkinMods(newId, log);
      if (preset.installed?.length) log('预装模组完成: ' + preset.installed.join(', '));
    } catch (e) { log('预装模组失败: ' + e.message) }
    return { success: true, newVersionId: newId };
  } catch (e) {
    log('加载器安装失败: ' + e.message);
    // Clean up empty folder on failure
    try { if (fs.existsSync(verDir) && fs.readdirSync(verDir).length === 0) fs.rmdirSync(verDir) } catch {}
    return { success: false, error: e.message };
  }
}

ipcMain.handle('mc:installLoader', (_, opts) => installLoaderInternal(opts));

// ── Modrinth 整合包导入 ──
function packSafeJoin(base, rel) {
  const root = path.normalize(base);
  const target = path.normalize(path.join(root, rel));
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('整合包内包含非法路径: ' + rel);
  return target;
}

function sanitizePackId(name, version) {
  let id = (String(name || '') + '-' + String(version || '')).replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  if (!id) id = 'modpack-' + Date.now().toString(36);
  return id.slice(0, 64);
}

function uniqueVersionId(baseId) {
  let id = baseId;
  let n = 2;
  while (fs.existsSync(path.join(MINECRAFT_DIR, 'versions', id))) id = baseId + '-' + (n++);
  return id;
}

function getConfiguredJavaPath() {
  try { return JSON.parse(fs.readFileSync(path.join(MINECRAFT_DIR, 'wsl_config.json'), 'utf8')).javaPath || 'java' } catch { return 'java' }
}

function hashFile(file, algo) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const stream = fs.createReadStream(file);
    stream.on('data', d => h.update(d));
    stream.on('end', () => resolve(h.digest('hex')));
    stream.on('error', reject);
  });
}

async function mapLimit(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

async function extractOverrideEntries(zip, prefix, instanceDir, onCount) {
  let count = 0;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (!name.startsWith(prefix)) continue;
    const rel = name.slice(prefix.length);
    if (!rel) continue;
    const dest = packSafeJoin(instanceDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, entry.getData());
    // 每 20 个文件让出一次事件循环，避免大整合包写入时界面卡死
    if (++count % 20 === 0) {
      if (onCount) onCount(count);
      await new Promise(r => setImmediate(r));
    }
  }
  return count;
}

// 解析整合包内容（不下载），返回给前端展示确认清单
function readModpackInfo(filePath) {
  const zip = new AdmZip(filePath);
  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) throw new Error('不是有效的 Modrinth 整合包（缺少 modrinth.index.json）');
  let index;
  try { index = JSON.parse(indexEntry.getData().toString('utf8')) } catch { throw new Error('modrinth.index.json 解析失败') }

  const deps = index.dependencies || {};
  const mcVersion = deps.minecraft;
  if (!mcVersion) throw new Error('整合包未指定 Minecraft 版本');

  const loaderDefs = [
    ['fabric-loader', 'Fabric', 'fabric'],
    ['quilt-loader', 'Quilt', 'quilt'],
    ['forge', 'Forge', 'forge'],
    ['neoforge', 'NeoForge', 'neoforge'],
  ];
  let loader = null;
  for (const [key, name, type] of loaderDefs) {
    if (deps[key]) { loader = { name, type, version: String(deps[key]) }; break }
  }

  const files = (index.files || []).filter(f => f && f.path && (!f.env || f.env.client !== 'unsupported'));
  let overrideCount = 0;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (name.startsWith('overrides/') || name.startsWith('client-overrides/')) overrideCount++;
  }
  const totalSize = files.reduce((sum, f) => sum + (Number(f.fileSize) || 0), 0);
  return {
    name: index.name || path.basename(filePath, path.extname(filePath)),
    version: String(index.versionId || '1.0'),
    mcVersion,
    loader,
    files,
    fileCount: files.length,
    totalSize,
    overrideCount,
  };
}

ipcMain.handle('mc:parseModpack', async (_, filePath) => {
  try {
    if (!filePath) {
      const picked = await dialog.showOpenDialog(mainWindow, {
        title: '导入 Modrinth 整合包',
        properties: ['openFile'],
        filters: [{ name: 'Modrinth Modpack', extensions: ['mrpack'] }, { name: '所有文件', extensions: ['*'] }],
      });
      if (picked.canceled || !picked.filePaths?.[0]) return { success: false, canceled: true };
      filePath = picked.filePaths[0];
    }
    if (!fs.existsSync(filePath)) throw new Error('文件不存在');
    const info = readModpackInfo(filePath);
    return {
      success: true,
      filePath,
      name: info.name,
      version: info.version,
      mcVersion: info.mcVersion,
      loader: info.loader,
      fileCount: info.fileCount,
      totalSize: info.totalSize,
      overrideCount: info.overrideCount,
      files: info.files.slice(0, 500).map(f => ({ path: f.path, size: Number(f.fileSize) || 0 })),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('mc:importModpack', async (_, filePath, opts) => {
  const send = (stage, message, percent) => mainWindow?.webContents.send('mc:importProgress', { stage, message, percent: Math.max(0, Math.min(100, Math.round(percent || 0))) });
  const log = (msg) => mainWindow?.webContents.send('mc:log', msg);
  let instanceDir = null;

  try {
    if (!filePath) {
      const picked = await dialog.showOpenDialog(mainWindow, {
        title: '导入 Modrinth 整合包',
        properties: ['openFile'],
        filters: [{ name: 'Modrinth Modpack', extensions: ['mrpack'] }, { name: 'All Files', extensions: ['*'] }],
      });
      if (picked.canceled || !picked.filePaths?.[0]) return { success: false, canceled: true };
      filePath = picked.filePaths[0];
    }
    if (!fs.existsSync(filePath)) throw new Error('文件不存在');

    send('parse', '正在解析整合包...', 2);
    const zip = new AdmZip(filePath);
    const indexEntry = zip.getEntry('modrinth.index.json');
    if (!indexEntry) throw new Error('不是有效的 Modrinth 整合包（缺少 modrinth.index.json）');
    let index;
    try { index = JSON.parse(indexEntry.getData().toString('utf8')) } catch { throw new Error('modrinth.index.json 解析失败') }

    const deps = index.dependencies || {};
    const mcVersion = deps.minecraft;
    if (!mcVersion) throw new Error('整合包未指定 Minecraft 版本');

    const packName = index.name || path.basename(filePath, path.extname(filePath));
    const packVersion = String(index.versionId || '1.0');
    const packId = uniqueVersionId(sanitizePackId(packName, packVersion));
    instanceDir = path.join(MINECRAFT_DIR, 'versions', packId);
    fs.mkdirSync(instanceDir, { recursive: true });
    log('开始导入整合包: ' + packName + ' (' + packId + ')');

    const loaderDefs = [
      ['fabric-loader', 'Fabric', 'fabric'],
      ['quilt-loader', 'Quilt', 'quilt'],
      ['forge', 'Forge', 'forge'],
      ['neoforge', 'NeoForge', 'neoforge'],
    ];
    let loader = null;
    for (const [key, name, type] of loaderDefs) {
      if (deps[key]) { loader = { name, type, version: String(deps[key]) }; break }
    }

    let loaderId = mcVersion;
    if (loader) {
      send('loader', '正在安装 ' + loader.name + ' ' + loader.version + '...', 8);
      let loaderVersion = loader.version;
      let downloadUrl = '';
      if (loader.type === 'forge') {
        if (!loaderVersion.startsWith(mcVersion + '-')) loaderVersion = mcVersion + '-' + loaderVersion;
        downloadUrl = 'https://maven.minecraftforge.net/net/minecraftforge/forge/' + loaderVersion + '/forge-' + loaderVersion + '-installer.jar';
      } else if (loader.type === 'neoforge') {
        downloadUrl = 'https://maven.neoforged.net/releases/net/neoforged/neoforge/' + loaderVersion + '/neoforge-' + loaderVersion + '-installer.jar';
      }
      let javaPath = opts?.javaPath || getConfiguredJavaPath();
      if (!javaPath || javaPath === 'java' || !fs.existsSync(javaPath)) {
        const best = await chooseJava(mcVersion);
        javaPath = best?.path || javaPath;
        if (best?.path) log('使用检测到的 Java: ' + best.path);
      }
      const result = await installLoaderInternal({
        mcVersion, loaderName: loader.name, loaderType: loader.type,
        loaderVersion, downloadUrl, javaPath,
      });
      if (!result?.success && !result?.alreadyInstalled) throw new Error(loader.name + ' 安装失败: ' + (result?.error || '未知错误'));
      loaderId = result.newVersionId;
      if (result.alreadyInstalled) log('加载器版本 ' + loaderId + ' 已存在，将复用现有安装');
      send('loader', loader.name + ' 安装完成', 22);
    } else {
      send('loader', '整合包未指定加载器，使用原版 ' + mcVersion, 22);
    }

    send('profile', '正在创建独立实例...', 25);
    const packMeta = {
      id: packId,
      inheritsFrom: loaderId,
      type: 'release',
      wslPack: { name: packName, version: packVersion, source: 'Modrinth', mcVersion, loader: loader ? loader.name : 'vanilla' },
    };
    fs.writeFileSync(path.join(instanceDir, packId + '.json'), JSON.stringify(packMeta, null, 2), 'utf8');
    fs.writeFileSync(path.join(instanceDir, 'wsl-pack.json'), JSON.stringify(packMeta.wslPack, null, 2), 'utf8');
    const parentJar = path.join(MINECRAFT_DIR, 'versions', loaderId, loaderId + '.jar');
    if (fs.existsSync(parentJar)) {
      try { fs.copyFileSync(parentJar, path.join(instanceDir, packId + '.jar')) } catch {}
    }

    const files = (index.files || []).filter(f => f && f.path && (!f.env || f.env.client !== 'unsupported'));
    log('整合包内容: Minecraft ' + mcVersion + ' / ' + (loader ? loader.name + ' ' + loader.version : '原版') +
      ' / ' + files.length + ' 个文件 / ' + (Math.round(files.reduce((s, f) => s + (Number(f.fileSize) || 0), 0) / 1048576)) + ' MB');
    const failed = [];
    let finished = 0;
    const fileFrac = new Array(files.length).fill(0);
    let lastReport = 0;
    const reportMods = (force) => {
      const now = Date.now();
      if (!force && now - lastReport < 200) return;
      lastReport = now;
      const frac = fileFrac.reduce((sum, f) => sum + Math.min(f, 1), 0) / Math.max(files.length, 1);
      send('mods', '正在下载模组 ' + finished + '/' + files.length, 32 + Math.min(frac, 1) * 63);
    };
    send('mods', '正在下载模组 0/' + files.length, 32);
    await mapLimit(files, 4, async (file, idx) => {
      const dest = packSafeJoin(instanceDir, file.path);
      if (fs.existsSync(dest) && (!file.fileSize || fs.statSync(dest).size === file.fileSize)) {
        finished++;
        fileFrac[idx] = 1;
        reportMods(true);
        return;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      let ok = false;
      for (const url of (Array.isArray(file.downloads) ? file.downloads : [])) {
        let bad = false;
        const done = await downloadWithRetry(url, dest, 2, (dl, total) => {
          fileFrac[idx] = total > 0 ? dl / total : 0;
          reportMods(false);
        });
        if (!done) continue;
        if (!file.hashes) { ok = true; break }
        for (const [algo, expected] of Object.entries(file.hashes)) {
          if (algo !== 'sha1' && algo !== 'sha512') continue;
          try { bad = (await hashFile(dest, algo)).toLowerCase() !== String(expected).toLowerCase() } catch { bad = true }
          break;
        }
        if (!bad) { ok = true; break }
        try { fs.unlinkSync(dest) } catch {}
        log('校验失败，重试其它下载源: ' + file.path);
      }
      if (!ok) {
        failed.push(file.path);
        log('下载失败: ' + file.path);
      }
      finished++;
      fileFrac[idx] = 1;
      reportMods(true);
    });

    // overrides 最后写入，保证整合包自带配置优先于下载内容
    send('overrides', '正在写入整合包配置...', 95);
    const overrideTotal = await extractOverrideEntries(zip, 'overrides/', instanceDir);
    const clientOverrideTotal = await extractOverrideEntries(zip, 'client-overrides/', instanceDir);
    log('已写入整合包配置: overrides ' + overrideTotal + ' 个, client-overrides ' + clientOverrideTotal + ' 个');

    if (failed.length) {
      fs.writeFileSync(path.join(instanceDir, 'wsl-pack-failed.json'), JSON.stringify(failed, null, 2), 'utf8');
      log('有 ' + failed.length + ' 个文件下载失败，已记录到 wsl-pack-failed.json');
    }
    send('done', failed.length ? '导入完成（部分文件失败）' : '导入完成', 100);
    log('整合包导入完成: ' + packId + (failed.length ? '（' + failed.length + ' 个文件失败）' : ''));
    return { success: true, versionId: packId, name: packName, failed: failed.length };
  } catch (e) {
    send('error', e.message, 0);
    log('整合包导入失败: ' + e.message);
    if (instanceDir) {
      try { fs.rmSync(instanceDir, { recursive: true, force: true }) } catch {}
    }
    return { success: false, error: e.message };
  }
});

ipcMain.handle('mc:getResourceVersions', async (_, projectId, gameVersion) => {
  let url = `${MODRINTH_API}/project/${projectId}/version`;
  if (gameVersion) url += `?game_versions=["${gameVersion}"]`;
  try { return await httpGet(url) } catch { return [] }
});

ipcMain.handle('mc:getResourceDetail', async (_, projectId) => {
  try { return await httpGet(`${MODRINTH_API}/project/${projectId}`) } catch { return null }
});

// ── Translation ──
const translationCache = new Map();

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function splitForTranslation(text, maxLen = 450) {
  const parts = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = -1;
    for (const sep of ['\n\n', '\n', '. ', '。', '! ', '? ', '！', '？', '; ', '；', ', ', '，']) {
      const idx = rest.lastIndexOf(sep, maxLen);
      if (idx > cut) cut = idx + sep.length;
    }
    if (cut <= 0) cut = rest.lastIndexOf(' ', maxLen);
    if (cut <= 0) cut = maxLen;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}

async function translateChunkMyMemory(chunk, from, to) {
  const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(chunk) + '&langpair=' + encodeURIComponent(from + '|' + to);
  const r = await httpGet(url, null, 15000);
  const txt = r && r.responseData && r.responseData.translatedText;
  if (!txt) return null;
  const out = decodeHtmlEntities(String(txt));
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/i.test(out)) return null;
  return out;
}

async function translateChunkGoogle(chunk, from, to) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + from + '&tl=' + to + '&dt=t&q=' + encodeURIComponent(chunk);
  const r = await httpGet(url, null, 12000);
  if (Array.isArray(r) && Array.isArray(r[0])) {
    const out = r[0].map(x => (Array.isArray(x) ? x[0] : '')).filter(Boolean).join('');
    if (out) return out;
  }
  return null;
}

ipcMain.handle('mc:translateText', async (_, text, targetLang) => {
  if (!text) return '';
  const raw = String(text).replace(/\r/g, '').slice(0, 12000);
  const toZh = targetLang === 'zh-CN';
  const from = toZh ? 'en' : 'zh-CN';
  const to = toZh ? 'zh-CN' : 'en';
  const cacheKey = from + '>' + to + ':' + crypto.createHash('md5').update(raw).digest('hex');
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  const chunks = splitForTranslation(raw);
  const out = [];
  let failed = 0;
  for (const chunk of chunks) {
    if (!chunk.trim()) { out.push(chunk); continue }
    let translated = null;
    for (let attempt = 0; attempt < 2 && !translated; attempt++) {
      try { translated = await translateChunkMyMemory(chunk, from, to) } catch { translated = null }
      if (!translated) await new Promise(r => setTimeout(r, 400));
    }
    if (!translated) {
      try { translated = await translateChunkGoogle(chunk, from, to) } catch { translated = null }
    }
    if (!translated) { failed++; out.push(chunk) }
    else out.push(translated);
  }
  if (failed === chunks.length) return null;
  const result = out.join('');
  translationCache.set(cacheKey, result);
  if (translationCache.size > 200) translationCache.delete(translationCache.keys().next().value);
  return result;
});

// ── CurseForge API ──
const CF_API = 'https://api.curse.tools/v1/cf';
const CF_TYPE_MAP = { mod: 6, modpack: 4471, resourcepack: 12, shader: 6552, world: 17 };

function mapCfHit(item) {
  const logo = item.logo || {};
  return {
    project_id: String(item.id),
    title: item.name || '',
    author: item.authors && item.authors[0] ? item.authors[0].name : '',
    description: item.summary || '',
    icon_url: logo.url || '',
    project_type: Object.keys(CF_TYPE_MAP).find(k => CF_TYPE_MAP[k] === item.classId) || 'mod',
    downloads: item.downloadCount || 0,
    follows: item.downloadCount || 0,
    date_modified: item.dateModified || '',
    date_created: item.dateCreated || '',
    categories: (item.categories || []).map(c => c.name),
    client_side: 'optional',
    server_side: 'optional',
    isCurseForge: true,
  };
}

ipcMain.handle('mc:cfSearch', async (_, { query, type, limit = 40, offset = 0 }) => {
  try {
    let url = `${CF_API}/mods/search?gameId=432&pageSize=${limit}&index=${offset}`;
    if (query) url += `&searchFilter=${encodeURIComponent(query)}`;
    if (type && type !== 'all' && CF_TYPE_MAP[type]) url += `&classId=${CF_TYPE_MAP[type]}`;
    const raw = await httpGet(url);
    if (!raw || !raw.data) return [];
    return raw.data.map(mapCfHit);
  } catch { return [] }
});

ipcMain.handle('mc:cfDetail', async (_, projectId) => {
  try {
    const raw = await httpGet(`${CF_API}/mods/${projectId}`);
    if (!raw || !raw.data) return null;
    const d = raw.data;
    const logo = d.logo || {};
    return {
      project_id: String(d.id),
      title: d.name || '',
      author: d.authors && d.authors[0] ? d.authors[0].name : '',
      description: d.summary || '',
      body: d.summary || '', // cf api doesn't expose full body easily
      icon_url: logo.url || '',
      project_type: Object.keys(CF_TYPE_MAP).find(k => CF_TYPE_MAP[k] === d.classId) || 'mod',
      downloads: d.downloadCount || 0,
      follows: d.downloadCount || 0,
      published: d.dateCreated || '',
      updated: d.dateModified || '',
      categories: (d.categories || []).map(c => c.name),
      license: d.license ? { name: d.license.name || d.license.id, id: d.license.id } : null,
      client_side: 'optional',
      server_side: 'optional',
      gallery: d.screenshots && d.screenshots.length ? d.screenshots.filter(s => s.url).map(s => ({ url: s.url, title: s.title || '' })) : [],
      issues_url: d.links?.issuesUrl || '',
      source_url: d.links?.sourceUrl || '',
      wiki_url: d.links?.wikiUrl || '',
      isCurseForge: true,
    };
  } catch { return null }
});

ipcMain.handle('mc:cfVersions', async (_, projectId, gameVersion) => {
  try {
    let url = `${CF_API}/mods/${projectId}/files?pageSize=50`;
    if (gameVersion) url += `&gameVersion=${encodeURIComponent(gameVersion)}`;
    const raw = await httpGet(url);
    if (!raw || !raw.data) return [];
    return raw.data.map(f => ({
      version_number: f.displayName || f.fileName || String(f.id),
      version_type: f.releaseType === 1 ? 'release' : f.releaseType === 2 ? 'beta' : 'alpha',
      date_published: f.fileDate || '',
      loaders: (f.gameVersions || []).filter(v => ['forge','fabric','quilt','neoforge'].includes(v.toLowerCase())),
      game_versions: (f.gameVersions || []).filter(v => !['forge','fabric','quilt','neoforge'].includes(v.toLowerCase())),
      files: [{ url: f.downloadUrl || '', filename: f.fileName || '' }],
    }));
  } catch { return [] }
});

// ── Game directory helpers ──
ipcMain.handle('mc:minecraftDir', () => MINECRAFT_DIR);
ipcMain.handle('mc:fileExists', (_, p) => fs.existsSync(p));
ipcMain.handle('mc:readFile', (_, p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } });
ipcMain.handle('mc:ensureDir', (_, p) => { fs.mkdirSync(p, { recursive: true }); return true });
ipcMain.handle('mc:readDir', (_, p) => { try { return fs.readdirSync(p) } catch { return [] } });
ipcMain.handle('mc:openDir', (_, p) => { if (fs.existsSync(p)) shell.openPath(p) });
ipcMain.handle('mc:openUrl', (_, url) => { if (url) shell.openExternal(url) });
ipcMain.handle('mc:deleteFile', (_, p) => { try { if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true }); return true } } catch { return false } });

// ── 更新检查 / 反馈 ──
const GITHUB_REPO = 'wanshuang-gzs/WanshuangLauncher';
function compareVersion(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n) || 0);
  const pb = String(b).split('.').map(n => parseInt(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:checkUpdate', async () => {
  try {
    const rel = await httpGet(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { 'Accept': 'application/vnd.github+json' }, 15000);
    if (!rel || !rel.tag_name) return { success: false, error: '未找到发布版本' };
    const latest = String(rel.tag_name).replace(/^v/i, '');
    return {
      success: true,
      current: app.getVersion(),
      latest,
      hasUpdate: compareVersion(latest, app.getVersion()) > 0,
      name: rel.name || rel.tag_name,
      notes: rel.body || '',
      url: rel.html_url,
      published: rel.published_at,
      assets: (rel.assets || []).map(a => ({ name: a.name, size: a.size, url: a.browser_download_url })),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── 皮肤库 ──
function isFullSkinBuffer(buf) {
  try {
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const k = w / 64;
    if (!Number.isInteger(k) || k < 1 || k > 4) return false;
    if (h !== 64 * k && h !== 32 * k) return false;
    const img = nativeImage.createFromBuffer(buf);
    const size = img.getSize();
    if (!size.width || !size.height) return true;
    const bmp = img.getBitmap();
    let opaque = 0;
    for (let y = 20 * k; y < 32 * k; y++) {
      for (let x = 20 * k; x < 28 * k; x++) {
        if (bmp[(y * size.width + x) * 4 + 3] > 0) opaque++;
      }
    }
    return opaque > 0;
  } catch { return true }
}

ipcMain.handle('skins:list', async (_, { after } = {}) => {
  try {
    const url = 'https://api.mineskin.org/v2/skins?size=30' + (after ? '&after=' + encodeURIComponent(after) : '');
    const data = await httpGet(url, null, 20000);
    if (!data || !Array.isArray(data.skins)) return { success: false, error: '皮肤库接口无响应' };
    const skins = data.skins.map(s => ({
      uuid: s.uuid,
      name: s.name || s.shortId || '',
      texture: s.texture,
      url: 'https://textures.minecraft.net/texture/' + s.texture,
      time: s.timestamp,
    }));
    // 预取贴图并转成 data URL，同时过滤掉只有头部的皮肤（限并发 + 重试，避免被限流）
    const queue = skins.slice();
    const workers = Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const s = queue.shift();
        for (let attempt = 0; attempt < 3 && !s.dataUrl; attempt++) {
          try {
            const res = await net.fetch(s.url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 100 && buf.length < 50000) {
              s.full = isFullSkinBuffer(buf);
              if (s.full) s.dataUrl = 'data:image/png;base64,' + buf.toString('base64');
            }
            break;
          } catch {
            if (attempt < 2) await new Promise(r => setTimeout(r, 300));
          }
        }
      }
    });
    await Promise.all(workers);
    return {
      success: true,
      next: data.pagination?.next?.after || null,
      skins: skins.filter(s => s.full && s.dataUrl),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('skins:apply', async (_, payload) => {
  try {
    const { account, skinUrl, variant } = payload || {};
    if (!account || !account.name) return { success: false, error: '请先选择账号' };
    if (!skinUrl) return { success: false, error: '皮肤地址无效' };

    const skinDir = path.join(MINECRAFT_DIR, 'wsl_skins');
    fs.mkdirSync(skinDir, { recursive: true });
    const safeName = String(account.name).replace(/[\\/:*?"<>|]/g, '_');
    const skinPath = path.join(skinDir, safeName + '.png');
    if (/^data:image\/png;base64,/i.test(skinUrl)) {
      fs.writeFileSync(skinPath, Buffer.from(skinUrl.split(',')[1], 'base64'));
    } else {
      const ok = await downloadWithRetry(skinUrl, skinPath, 2);
      if (!ok || !fs.existsSync(skinPath)) throw new Error('皮肤下载失败');
    }

    const buf = fs.readFileSync(skinPath);
    if (buf.length < 100 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('下载到的文件不是有效 PNG 皮肤');
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const k = w / 64;
    if (!Number.isInteger(k) || k < 1 || k > 4 || (h !== 64 * k && h !== 32 * k)) throw new Error('皮肤尺寸必须为 64x64、64x32 或其等比例高清尺寸');
    if (account.type === 'microsoft' && (k !== 1 || h !== 64)) throw new Error('微软账号仅支持 64x64 皮肤');

    const remoteUrl = account.type === 'microsoft' ? null : await ensureRemoteSkin(buf);
    const skinMetaJson = JSON.stringify({ variant: variant === 'slim' ? 'slim' : 'classic', updatedAt: Date.now(), remoteUrl }, null, 2);
    fs.writeFileSync(path.join(skinDir, safeName + '.json'), skinMetaJson, 'utf8');
    if (skinService) skinService.cache.delete(account.name);

    // 微软账号：直接上传到 Mojang 皮肤服务
    if (account.type === 'microsoft' && account.token) {
      const form = new FormData();
      form.append('variant', variant === 'slim' ? 'slim' : 'classic');
      form.append('file', new Blob([buf], { type: 'image/png' }), 'skin.png');
      const res = await fetch('https://api.minecraftservices.com/minecraft/profile/skins', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + account.token },
        body: form,
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('登录已过期，请重新登录微软账号后再试');
        const body = await res.text().catch(() => '');
        throw new Error('皮肤上传失败 (HTTP ' + res.status + ')' + (body ? ' ' + body.slice(0, 120) : ''));
      }
      mainWindow?.webContents.send('mc:log', 'Skin uploaded for ' + account.name);
      return { success: true, mode: 'online' };
    }

    // 离线账号：写入 CustomSkinLoader 本地皮肤目录
    const cslSkins = path.join(MINECRAFT_DIR, 'CustomSkinLoader', 'LocalSkin', 'skins');
    fs.mkdirSync(cslSkins, { recursive: true });
    const cslPath = path.join(cslSkins, safeName + '.png');
    fs.copyFileSync(skinPath, cslPath);
    fs.writeFileSync(path.join(cslSkins, safeName + '.json'), skinMetaJson, 'utf8');
    mainWindow?.webContents.send('mc:log', 'Local skin saved: ' + cslPath);
    return { success: true, mode: 'local', path: cslPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── 预装模组（皮肤支持）──
function getVersionModsContext(versionId) {
  const versionDir = path.join(MINECRAFT_DIR, 'versions', versionId);
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(versionDir, versionId + '.json'), 'utf8')) } catch {}
  let pack = null;
  try {
    const packPath = path.join(versionDir, 'wsl-pack.json');
    if (fs.existsSync(packPath)) pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  } catch {}
  const ids = [versionId, meta.inheritsFrom || '', meta.jar || '', meta.id || ''].join(' ').toLowerCase();
  let loaderType = '';
  const packLoader = String(pack?.loader || '').toLowerCase();
  if (packLoader.includes('neoforge')) loaderType = 'neoforge';
  else if (packLoader.includes('fabric')) loaderType = 'fabric';
  else if (packLoader.includes('quilt')) loaderType = 'quilt';
  else if (packLoader.includes('forge')) loaderType = 'forge';
  if (!loaderType) {
    if (ids.includes('neoforge')) loaderType = 'neoforge';
    else if (ids.includes('fabric')) loaderType = 'fabric';
    else if (ids.includes('quilt')) loaderType = 'quilt';
    else if (ids.includes('forge')) loaderType = 'forge';
  }
  let mcVersion = pack?.mcVersion || '';
  if (!mcVersion) {
    const verRe = /(?:^|[-_])(1\.\d{1,2}(?:\.\d{1,2})?|\d{2}\.\d{1,2}(?:\.\d{1,2})?)(?:$|[-_])/;
    const fromParent = String(meta.inheritsFrom || '').match(verRe);
    const fromId = String(versionId).match(verRe);
    mcVersion = (fromParent && fromParent[1]) || (fromId && fromId[1]) || '';
  }
  const gameDir = pack ? versionDir : MINECRAFT_DIR;
  return { versionDir, gameDir, modsDir: path.join(gameDir, 'mods'), loaderType, mcVersion, isPack: !!pack };
}

async function fetchModrinthModFile(slug, loader, mcVersion) {
  const loaderCandidates = loader === 'neoforge' ? ['neoforge', 'forge'] : loader === 'quilt' ? ['quilt', 'fabric'] : [loader];
  for (const ld of loaderCandidates) {
    const query = 'loaders=' + encodeURIComponent(JSON.stringify([ld])) + (mcVersion ? '&game_versions=' + encodeURIComponent(JSON.stringify([mcVersion])) : '');
    try {
      const list = await httpGet(`https://api.modrinth.com/v2/project/${slug}/version?${query}`, null, 15000);
      if (!Array.isArray(list) || !list.length) continue;
      const rel = list.find(v => v.version_type === 'release') || list[0];
      const file = (rel.files || []).find(f => f.primary) || (rel.files || [])[0];
      if (file?.url) return { url: file.url, filename: path.basename(file.filename || slug + '.jar'), version: rel.version_number };
    } catch {}
  }
  return null;
}

async function preinstallSkinMods(versionId, log = () => {}) {
  const ctx = getVersionModsContext(versionId);
  if (!ctx.loaderType) return { success: true, skipped: 'no-loader', modsDir: ctx.modsDir };
  fs.mkdirSync(ctx.modsDir, { recursive: true });
  const existing = fs.readdirSync(ctx.modsDir);
  const targets = [
    { slug: 'customskinloader', name: 'CustomSkinLoader', loader: ctx.loaderType, match: /customskinloader/i },
  ];
  if (ctx.loaderType === 'fabric') targets.push({ slug: 'fabric-api', name: 'Fabric API', loader: 'fabric', match: /fabric[-_]api/i });
  const installed = [];
  for (const t of targets) {
    if (existing.some(f => t.match.test(f))) { installed.push(t.name + ' (已存在)'); continue }
    const info = await fetchModrinthModFile(t.slug, t.loader, ctx.mcVersion);
    if (!info) { log('未找到适配 ' + ctx.mcVersion + ' 的 ' + t.name); continue }
    const dest = path.join(ctx.modsDir, info.filename);
    if (fs.existsSync(dest)) { installed.push(t.name + ' (已存在)'); continue }
    const ok = await downloadWithRetry(info.url, dest);
    if (ok) { installed.push(t.name + ' ' + info.version); log('预装模组: ' + t.name + ' ' + info.version) }
    else log('预装模组失败: ' + t.name);
  }
  return { success: true, installed, modsDir: ctx.modsDir, loader: ctx.loaderType, mcVersion: ctx.mcVersion };
}

ipcMain.handle('mods:preinstall', async (_, versionId) => {
  try {
    const ctx = getVersionModsContext(versionId);
    if (!ctx.loaderType) return { success: false, error: '该版本没有安装模组加载器，无法加载皮肤模组' };
    return await preinstallSkinMods(versionId, m => mainWindow?.webContents.send('mc:log', m));
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── 无模组皮肤服务（authlib-injector + 本地 Yggdrasil）──
const AUTHLIB_INJECTOR_VERSION = '1.2.8';
const AUTHLIB_INJECTOR_URL = 'https://authlib-injector.yushi.moe/artifact/56/authlib-injector-1.2.8.jar';

let skinService = null;

function skinSha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex') }

function loadRemoteSkinCache() {
  try { return JSON.parse(fs.readFileSync(path.join(MINECRAFT_DIR, 'wsl_skins', '.remote.json'), 'utf8')) } catch { return {} }
}
function saveRemoteSkinCache(cache) {
  try {
    fs.mkdirSync(path.join(MINECRAFT_DIR, 'wsl_skins'), { recursive: true });
    fs.writeFileSync(path.join(MINECRAFT_DIR, 'wsl_skins', '.remote.json'), JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}

function uploadSkinToMineSkin(buf) {
  return new Promise((resolve) => {
    try {
      const boundary = '----WSL' + crypto.randomBytes(8).toString('hex');
      const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="skin.png"\r\nContent-Type: image/png\r\n\r\n`);
      const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([head, buf, tail]);
      const req = https.request({
        hostname: 'api.mineskin.org', path: '/generate/upload', method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': body.length,
          'User-Agent': 'WanshuangLauncher/3.0',
        },
        timeout: 20000,
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(d);
            const url = j?.data?.texture?.url;
            resolve(url && /^https:\/\//.test(url) ? url : null);
          } catch { resolve(null) }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null) });
      req.write(body);
      req.end();
    } catch { resolve(null) }
  });
}

async function ensureRemoteSkin(buf) {
  if (!buf) return null;
  const cache = loadRemoteSkinCache();
  const hash = skinSha1(buf);
  if (cache[hash]?.url) return cache[hash].url;
  const url = await uploadSkinToMineSkin(buf);
  if (url) {
    cache[hash] = { url, at: Date.now() };
    saveRemoteSkinCache(cache);
  }
  return url;
}

function readLocalSkin(name) {
  const safe = String(name).replace(/[\\/:*?"<>|]/g, '_');
  const dirs = [
    path.join(MINECRAFT_DIR, 'wsl_skins'),
    path.join(MINECRAFT_DIR, 'CustomSkinLoader', 'LocalSkin', 'skins'),
  ];
  for (const dir of dirs) {
    const p = path.join(dir, safe + '.png');
    if (!fs.existsSync(p)) continue;
    try {
      const buf = fs.readFileSync(p);
      if (buf.length < 100 || buf.readUInt32BE(0) !== 0x89504e47) continue;
      let model = 'classic';
      let remoteUrl = null;
      const metaPath = path.join(dir, safe + '.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          if (meta.variant === 'slim') model = 'slim';
          if (typeof meta.remoteUrl === 'string' && /^https:\/\//.test(meta.remoteUrl)) remoteUrl = meta.remoteUrl;
        } catch {}
      }
      return { buf, model, remoteUrl };
    } catch {}
  }
  return null;
}

async function fetchLittleSkinSkin(name) {
  try {
    const res = await net.fetch('https://littleskin.cn/csl/' + encodeURIComponent(name) + '.json');
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.textures?.skin?.url;
    if (!url) return null;
    const skinRes = await net.fetch(url);
    if (!skinRes.ok) return null;
    const buf = Buffer.from(await skinRes.arrayBuffer());
    if (buf.length < 100 || buf.readUInt32BE(0) !== 0x89504e47) return null;
    return { buf, model: data.textures.skin.model === 'slim' ? 'slim' : 'classic' };
  } catch { return null }
}

async function resolvePlayerSkin(name) {
  if (skinService?.cache.has(name)) return skinService.cache.get(name);
  let skin = readLocalSkin(name);
  if (!skin) skin = await fetchLittleSkinSkin(name);
  if (skin && skinService) skinService.cache.set(name, skin);
  return skin;
}

async function ensureSkinService(sendLog) {
  if (skinService) return skinService;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const cache = new Map();
  let player = null;

  const server = http.createServer(async (req, res) => {
    const sendJson = (obj, code = 200) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(obj));
    };
    try {
      const u = new URL(req.url, 'http://127.0.0.1');
      const p = u.pathname;
      if (p === '/' || p === '/api/yggdrasil') {
        return sendJson({
          meta: { serverName: 'Wanshuang Launcher', implementationName: 'wanshuang-skin-service', implementationVersion: '1.2.2' },
          skinDomains: ['127.0.0.1', 'localhost'],
          signaturePublickey: publicPem,
        });
      }
      const pm = p.match(/^\/(?:sessionserver\/session|session)\/minecraft\/profile\/([0-9a-fA-F-]+)$/);
      if (pm) {
        const id = pm[1].replace(/-/g, '').toLowerCase();
        if (!player || id !== String(player.uuid).replace(/-/g, '').toLowerCase()) return sendJson({ error: 'Not found' }, 404);
        const skin = await resolvePlayerSkin(player.name);
        if (!skin) {
          sendLog?.('Skin service: no skin for ' + player.name);
          return sendJson({ id, name: player.name, properties: [] });
        }
        const remoteUrl = skin.remoteUrl || await ensureRemoteSkin(skin.buf);
        const textures = {
          timestamp: Date.now(),
          profileId: id,
          profileName: player.name,
          signatureRequired: true,
          textures: { SKIN: { url: remoteUrl || `${skinService.url}/skins/${encodeURIComponent(player.name)}.png`, metadata: { model: skin.model } } },
        };
        const value = Buffer.from(JSON.stringify(textures)).toString('base64');
        const signature = crypto.createSign('SHA1').update(value).sign(privateKey, 'base64');
        sendLog?.('Skin service: profile served for ' + player.name);
        return sendJson({ id, name: player.name, properties: [{ name: 'textures', value, signature }] });
      }
      if (p.startsWith('/skins/')) {
        const name = decodeURIComponent(p.slice(7)).replace(/\.png$/i, '');
        const skin = await resolvePlayerSkin(name);
        if (skin) {
          sendLog?.('Skin service: skin served for ' + name);
          res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' });
          return res.end(skin.buf);
        }
        res.writeHead(404); return res.end();
      }
      sendJson({ error: 'Not found' }, 404);
    } catch (e) {
      try { sendJson({ error: e.message }, 500) } catch {}
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  skinService = {
    server,
    url: 'http://127.0.0.1:' + server.address().port,
    cache,
    setPlayer(p) { player = p },
  };
  sendLog?.('Skin service started on ' + skinService.url);
  return skinService;
}

function isValidJar(p) {
  try {
    if (!fs.existsSync(p) || fs.statSync(p).size < 100000) return false;
    const fd = fs.openSync(p, 'r');
    const head = Buffer.alloc(2);
    fs.readSync(fd, head, 0, 2, 0);
    fs.closeSync(fd);
    if (head.toString('latin1') !== 'PK') return false;
    return !!new AdmZip(p).getEntry('META-INF/MANIFEST.MF');
  } catch { return false }
}

async function ensureAuthlibInjector(sendLog) {
  const dir = path.join(app.getPath('userData'), 'skin-agent');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'authlib-injector-' + AUTHLIB_INJECTOR_VERSION + '.jar');
  if (isValidJar(dest)) return dest;
  try { fs.unlinkSync(dest) } catch {}
  for (let attempt = 1; attempt <= 2; attempt++) {
    sendLog?.('Downloading authlib-injector ' + AUTHLIB_INJECTOR_VERSION + '... (第 ' + attempt + ' 次)');
    const ok = await downloadWithRetry(AUTHLIB_INJECTOR_URL, dest, 2);
    if (ok && isValidJar(dest)) return dest;
    // 下载到的是错误页/截断文件时删掉重试，绝不能让 JVM 带上损坏的 -javaagent 启动
    try { fs.unlinkSync(dest) } catch {}
  }
  throw new Error('authlib-injector 下载失败或文件损坏');
}

// ── Game Launch ──
async function resolveVersion(versionId) {
  const localPath = path.join(MINECRAFT_DIR, 'versions', versionId, versionId + '.json');
  let meta;
  if (fs.existsSync(localPath)) {
    meta = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  } else {
    const manifest = await httpGet(mirrorUrl('/mc/game/version_manifest_v2.json'));
    const entry = manifest?.versions?.find(v => v.id === versionId);
    if (!entry) throw new Error('Version not found: ' + versionId);
    meta = await httpGet(entry.url);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(meta, null, 2), 'utf8');
  }
  // Resolve inheritsFrom (Fabric/Quilt loader profiles)
  if (meta.inheritsFrom) {
    const parent = await resolveVersion(meta.inheritsFrom);
    meta = mergeVersionMeta(parent, meta);
  }
  return meta;
}

function mergeVersionMeta(parent, child) {
  const result = { ...parent };
  for (const key of Object.keys(child)) {
    if (key === 'inheritsFrom') continue;
    if (key === 'libraries') {
      const childIds = new Set(child.libraries.map(l => l.name));
      result.libraries = [...(parent.libraries || []).filter(l => !childIds.has(l.name)), ...(child.libraries || [])];
    } else if (key === 'arguments') {
      result.arguments = { ...parent.arguments, ...child.arguments };
      if (parent.arguments?.game && child.arguments?.game) result.arguments.game = [...(parent.arguments.game || []), ...(child.arguments.game || [])];
      if (parent.arguments?.jvm && child.arguments?.jvm) result.arguments.jvm = [...(parent.arguments.jvm || []), ...(child.arguments.jvm || [])];
    } else if (key === 'mainClass') {
      result.mainClass = child.mainClass;
    } else {
      result[key] = child[key];
    }
  }
  return result;
}

function ruleMatches(lib) {
  if (!lib.rules || lib.rules.length === 0) return true;
  const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
  for (const rule of lib.rules) {
    let match = true;
    if (rule.os) { if (rule.os.name && rule.os.name !== osName) match = false; if (rule.os.arch && rule.os.arch !== process.arch) match = false }
    if (rule.features && rule.features.is_demo_user) match = false;
    if (match) return rule.action !== 'disallow';
  }
  return false;
}

function mavenCoordsToPath(name) {
  const parts = name.split(':');
  if (parts.length < 3) return null;
  const [group, artifact, version] = parts;
  const ext = parts.length > 3 ? parts[3] : 'jar';
  return group.replace(/\./g, '/') + '/' + artifact + '/' + version + '/' + artifact + '-' + version + '.' + ext;
}
function getLibraryPath(lib) {
  const p = lib.downloads?.artifact?.path;
  if (p) return path.join(MINECRAFT_DIR, 'libraries', p.replace(/\//g, '\\'));
  if (lib.name) { const mp = mavenCoordsToPath(lib.name); if (mp) return path.join(MINECRAFT_DIR, 'libraries', mp.replace(/\//g, '\\')) }
  return null;
}
function getLibraryUrl(lib) {
  const u = lib.downloads?.artifact?.url;
  if (u) return u;
  if (lib.name && lib.url) { const mp = mavenCoordsToPath(lib.name); if (mp) return lib.url.replace(/\/+$/, '') + '/' + mp }
  return null;
}
function getNativeKey(lib) {
  if (!lib.downloads?.classifiers) return null;
  const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
  const is64 = process.arch === 'x64' || process.arch.endsWith('64');
  const classifiers = lib.downloads.classifiers;
  const exact = `natives-${osName}${is64 ? '-64' : ''}`;
  if (classifiers[exact]) return exact;
  const generic = `natives-${osName}`;
  if (classifiers[generic]) return generic;
  return null;
}
function isNative(lib) { return getNativeKey(lib) !== null }
function getNativeDownload(lib) { const key = getNativeKey(lib); return key ? lib.downloads?.classifiers?.[key] : null }

async function resolveLibraries(versionMeta, onLog, onProgress) {
  const classpath = [];
  const libs = (versionMeta.libraries || []).filter(lib => ruleMatches(lib) && !isNative(lib) && getLibraryPath(lib));
  const clientPath = path.join(MINECRAFT_DIR, 'versions', versionMeta.id, versionMeta.id + '.jar');
  const total = libs.length + 1;
  let done = 0;
  const tick = () => { done++; if (onProgress) onProgress(done, total) };
  for (const lib of libs) {
    const libPath = getLibraryPath(lib);
    if (fs.existsSync(libPath)) { classpath.push(libPath) }
    else { const url = getLibraryUrl(lib); if (url) { onLog('Downloading library: ' + lib.name); const ok = await downloadWithRetry(url, libPath); if (ok) classpath.push(libPath) } }
    tick();
  }
  if (fs.existsSync(clientPath)) { classpath.push(clientPath) }
  else if (versionMeta.downloads?.client?.url) { onLog('Downloading client: ' + versionMeta.id); await downloadWithRetry(versionMeta.downloads.client.url, clientPath); classpath.push(clientPath) }
  tick();
  return classpath;
}

async function extractNatives(versionMeta, onLog) {
  const nativesDir = path.join(MINECRAFT_DIR, 'natives', versionMeta.id);
  if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true });
  let found = 0, extracted = 0;
  for (const lib of (versionMeta.libraries || [])) {
    try {
      if (!ruleMatches(lib)) continue;
      const native = getNativeDownload(lib);
      if (!native) continue;
      found++;
      if (!native.path) { onLog('Warning: native library ' + (lib.name || 'unknown') + ' missing path'); continue }
      const nativePath = path.join(MINECRAFT_DIR, 'libraries', native.path.replace(/\//g, '\\'));
      if (!fs.existsSync(nativePath)) {
        if (native.url) { onLog('Downloading natives: ' + (lib.name || native.path)); await downloadWithRetry(native.url, nativePath) }
        else { onLog('Warning: native library ' + (lib.name || native.path) + ' has no download URL'); continue }
      }
      if (fs.existsSync(nativePath)) {
        try {
          execSync(`"${process.env.WINDIR}\\System32\\tar" -xf "${nativePath}" -C "${nativesDir}" 2>nul`, { timeout: 15000 });
          extracted++;
        } catch (tarErr) {
          onLog('tar extract failed for ' + (lib.name || native.path) + ': ' + tarErr.message);
          try {
            execSync(`powershell -c "Expand-Archive -Path '${nativePath}' -DestinationPath '${nativesDir}' -Force 2>$null"`, { timeout: 30000 });
            extracted++;
          } catch (psErr) {
            onLog('PowerShell extract also failed for ' + (lib.name || native.path) + ': ' + psErr.message);
          }
        }
      }
    } catch (e) {
      onLog('Error processing native library ' + (lib?.name || 'unknown') + ': ' + (e?.message || String(e)));
      if (e?.stack) onLog(e.stack.split('\n').slice(0, 3).join(' | '));
    }
  }
  if (found === 0) onLog('No native libraries found for this version, skip extraction');
  else onLog('Native extraction: ' + extracted + '/' + found + ' done');
  return nativesDir;
}

async function getAssetIndex(versionMeta, onLog) {
  const assetIndex = versionMeta.assetIndex;
  if (!assetIndex) return null;
  const indexPath = path.join(MINECRAFT_DIR, 'assets', 'indexes', assetIndex.id + '.json');
  if (!fs.existsSync(indexPath)) { onLog('Downloading asset index: ' + assetIndex.id); await downloadWithRetry(assetIndex.url, indexPath) }
  try { return JSON.parse(fs.readFileSync(indexPath, 'utf8')) } catch { return null }
}

const ASSET_CACHE_PATH = path.join(MINECRAFT_DIR, 'wsl_asset_cache.json');
function getCachedAssetIndex() { try { return JSON.parse(fs.readFileSync(ASSET_CACHE_PATH, 'utf8')) } catch { return {} } }
function saveCachedAssetIndex(index) { try { fs.writeFileSync(ASSET_CACHE_PATH, JSON.stringify(index), 'utf8') } catch {} }

async function resolveAssets(assetIndexData, onLog, onProgress) {
  if (!assetIndexData?.objects) return;
  const objects = assetIndexData.objects;
  const keys = Object.keys(objects);
  const total = keys.length;
  const cached = getCachedAssetIndex();
  if (cached.id === assetIndexData.id && cached.total === total) { onLog('Assets already verified (' + total + ' files)'); if (onProgress) onProgress(total, total); return true }
  let downloaded = 0, checked = 0;
  onLog('Verifying ' + total + ' assets...');
  for (let i = 0; i < total; i += 20) {
    const batch = keys.slice(i, i + 20);
    await Promise.all(batch.map(async (key) => {
      const hash = objects[key].hash; const assetPath = path.join(MINECRAFT_DIR, 'assets', 'objects', hash.substring(0, 2), hash);
      if (!fs.existsSync(assetPath)) { const ok = await downloadWithRetry('https://resources.download.minecraft.net/' + hash.substring(0, 2) + '/' + hash, assetPath); if (ok) downloaded++ }
    }));
    checked += batch.length;
    if (checked % 500 === 0 || checked === total) { mainWindow?.webContents.send('mc:progress', Math.round((checked / total) * 100)) }
    if (onProgress) onProgress(checked, total);
  }
  saveCachedAssetIndex({ id: assetIndexData.id, total });
  if (downloaded > 0) onLog('Assets: ' + downloaded + ' downloaded');
  onLog('Assets OK (' + total + ' files)');
  return true;
}

function resolveMinecraftArgs(versionMeta, subs, quickPlay) {
  if (versionMeta.arguments?.game) {
    const result = [];
    for (const a of versionMeta.arguments.game) {
      if (typeof a === 'string') {
        if (a.startsWith('--quickPlay') || a === '--server') continue;
        result.push(a.replace(/\$\{(\w+)\}/g, (_, k) => subs[k] || ''));
      }
      else if (a.rules && a.value) {
        let match = false;
        for (const rule of a.rules) {
          let ok = true;
          if (rule.os) { const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'; if (rule.os.name && rule.os.name !== osName) ok = false; if (rule.os.arch && rule.os.arch !== process.arch) ok = false }
          if (rule.features) {
            if (rule.features.is_demo_user) ok = false;
            if (!quickPlay) {
              if (rule.features.is_quick_play_singleplayer) ok = false;
              if (rule.features.is_quick_play_multiplayer) ok = false;
              if (rule.features.is_quick_play_realms) ok = false;
            }
          }
          if (ok) { match = rule.action !== 'disallow'; break }
        }
        if (match) { const vals = Array.isArray(a.value) ? a.value : [a.value]; result.push(...vals.map(v => v.replace(/\$\{(\w+)\}/g, (_, k) => subs[k] || ''))) }
      }
    }
    return result.filter(Boolean);
  }
  if (versionMeta.minecraftArguments) { return versionMeta.minecraftArguments.replace(/\$\{(\w+)\}/g, (_, k) => subs[k] || '').split(/\s+/).filter(Boolean) }
  return [];
}

function resolveJvmArgs(versionMeta, subs) {
  if (versionMeta.arguments?.jvm) {
    const result = [];
    for (const a of versionMeta.arguments.jvm) {
      if (typeof a === 'string') {
        result.push(a.replace(/\$\{(\w+)\}/g, (_, k) => subs[k] || ''));
      } else if (a.rules && a.value) {
        let match = false;
        for (const rule of a.rules) {
          let ok = true;
          if (rule.os) { const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'; if (rule.os.name && rule.os.name !== osName) ok = false; if (rule.os.arch && rule.os.arch !== process.arch) ok = false }
          if (rule.features) {
            if (rule.features.is_demo_user) ok = false;
          }
          if (ok) { match = rule.action !== 'disallow'; break }
        }
        if (match) { const vals = Array.isArray(a.value) ? a.value : [a.value]; result.push(...vals.map(v => v.replace(/\$\{(\w+)\}/g, (_, k) => subs[k] || ''))) }
      }
    }
    return result.filter(Boolean);
  }
  return [];
}

function cleanLaunchArgs(args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--quickPlayPath' || a === '--quickPlayMultiplayer' || a === '--quickPlaySingleplayer' || a === '--quickPlayRealms') {
      i++; continue
    }
    if (a === '--server' || a === '--port') { i++; continue }
    if (a.startsWith('--quickPlay')) continue;
    if ((a === '--width' || a === '--height') && (i + 1 >= args.length || !/^\d+$/.test(args[i + 1]))) continue;
    result.push(a);
  }
  return result;
}

function prepareOptionsTxt(gameDir, sendLog) {
  try {
    if (!fs.existsSync(gameDir)) { sendLog('Warning: gameDir not found, skip options.txt'); return }
    const optionsPath = path.join(gameDir, 'options.txt');
    const options = {};
    if (fs.existsSync(optionsPath)) {
      const content = fs.readFileSync(optionsPath, 'utf8');
      for (const line of content.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) { const k = line.substring(0, idx).trim(); const v = line.substring(idx + 1).trim(); if (k) options[k] = v }
      }
    }
    options.narrator = 'off';
    options.skipAccessibilityOnboarding = 'true';
    options.lang = 'zh_cn';
    fs.writeFileSync(optionsPath, Object.entries(options).map(([k, v]) => `${k}:${v}`).join('\n'), 'utf8');
    sendLog('Pre-configured options.txt: narrator=off, skipAccessibilityOnboarding=true, lang=zh_cn');
  } catch (e) { sendLog('Warning: could not prepare options.txt: ' + e.message) }
}

ipcMain.handle('mc:launch', async (_, config) => {
  const { version, javaPath, username, jvmArgs, minRam, maxRam, resWidth, resHeight, account } = config;
  const sendLog = (msg) => mainWindow?.webContents.send('mc:log', msg);
  try {
    sendLog('Resolving version: ' + version);
    const versionMeta = await resolveVersion(version);
    // 优先使用版本 JSON 声明的 Java 主版本（如 26.2 需要 Java 25）
    const requiredMajor = Number(versionMeta?.javaVersion?.majorVersion) || requiredJavaMajor(baseGameVersionOf(version));
    let java = javaPath;
    let configuredMajor = 0;
    if (java && java !== 'java' && fs.existsSync(java)) {
      configuredMajor = (await probeJavaMajor(java)) || javaMajorFromPath(java);
    }
    if (requiredMajor && (!configuredMajor || configuredMajor < requiredMajor)) {
      const match = await chooseJavaForMajor(requiredMajor);
      if (match) { java = match.path; sendLog('Using Java ' + match.major + ': ' + java) }
      else {
        sendLog('Missing Java ' + requiredMajor + ' required by this version');
        return { success: false, needJava: requiredMajor, error: '此版本需要 Java ' + requiredMajor + '，当前未安装，请先下载' };
      }
    } else if (requiredMajor && configuredMajor !== requiredMajor) {
      // 版本声明的 Java 与当前选择不一致（如 1.20.1 需要 17 却用了 26），优先切换到本地匹配版本
      const match = await chooseJavaForMajor(requiredMajor);
      if (match && match.major === requiredMajor) {
        java = match.path;
        sendLog('此版本需要 Java ' + requiredMajor + '（当前 Java ' + configuredMajor + '），已切换: ' + java);
      } else {
        sendLog('未找到 Java ' + requiredMajor + '，正在自动下载...');
        const installed = await installJavaRuntime({ major: requiredMajor, exact: true }, sendLog,
          (pct, speed, name) => mainWindow?.webContents.send('mc:javaDlProgress', { pct, speed, filename: name }));
        if (installed?.success && installed.path) {
          java = installed.path;
          sendLog('已安装 Java ' + installed.major + ': ' + java);
        } else {
          sendLog('警告：此版本需要 Java ' + requiredMajor + '，当前为 Java ' + configuredMajor + '，可能出现兼容问题');
        }
      }
    } else if (!configuredMajor) {
      const best = await chooseJava(baseGameVersionOf(version));
      if (best?.path) java = best.path;
    }
    if (!java) java = 'java';
    sendLog('Checking libraries...');
    const classpath = await resolveLibraries(versionMeta, sendLog);
    sendLog('Checking asset index...');
    const assetIndexData = await getAssetIndex(versionMeta, sendLog);
    await resolveAssets(assetIndexData, sendLog);
    sendLog('Extracting natives...');
    const nativesDir = await extractNatives(versionMeta, sendLog);
    const cp = classpath.join(';');
    const mainClass = versionMeta.mainClass || 'net.minecraft.client.main.Main';
    // 整合包实例使用独立目录，普通版本仍使用全局 .minecraft
    const versionDir = path.join(MINECRAFT_DIR, 'versions', version);
    const gameDir = fs.existsSync(path.join(versionDir, 'wsl-pack.json')) ? versionDir : MINECRAFT_DIR;
    const assetIndex = versionMeta.assetIndex?.id || 'legacy';
    const assetsDir = path.join(MINECRAFT_DIR, 'assets');
    const uuid = account?.uuid || '00000000-0000-0000-0000-000000000000';
    const token = account?.token || 'offline';
    const userType = account?.type === 'microsoft' ? 'msa' : 'legacy';
    const versionType = 'release';
    const extraJvmArgs = jvmArgs ? jvmArgs.split(' ').filter(Boolean) : [];
    const rw = parseInt(resWidth); const rh = parseInt(resHeight);
    const subs = { auth_player_name: username, version_name: version, game_directory: gameDir, assets_root: assetsDir, assets_index_name: assetIndex, auth_uuid: uuid, auth_access_token: token, user_type: userType, version_type: versionType, auth_session: token, game_assets: assetsDir, user_properties: '{}', natives_directory: nativesDir, library_directory: path.join(MINECRAFT_DIR, 'libraries'), classpath_separator: path.delimiter, classpath: cp, launcher_name: 'wanshuang', launcher_version: '3.0', resolution_width: rw > 0 && !isNaN(rw) ? String(rw) : '854', resolution_height: rh > 0 && !isNaN(rh) ? String(rh) : '480' };
    const mcArgs = cleanLaunchArgs(resolveMinecraftArgs(versionMeta, subs, false));
    const profileJvmArgs = resolveJvmArgs(versionMeta, subs);
    const forgeTargets = ['forgeclient', 'forge_client', 'forgeserver', 'forge_server'];
    const forgeLaunchTarget = mcArgs.find(a => forgeTargets.includes(a));
    if (forgeLaunchTarget && !mcArgs.includes('--launchTarget')) {
      mcArgs.splice(mcArgs.indexOf(forgeLaunchTarget), 0, '--launchTarget');
    }
    // 离线账号：authlib-injector + 本地皮肤服务（无需安装模组）
    let skinAgentArg = null;
    if (account?.type !== 'microsoft') {
      try {
        const agentPath = await ensureAuthlibInjector(sendLog);
        const svc = await ensureSkinService(sendLog);
        svc.setPlayer({ name: username, uuid });
        svc.cache.delete(username);
        skinAgentArg = '-javaagent:' + agentPath + '=' + svc.url;
        sendLog('Skin agent: ' + svc.url);
      } catch (e) {
        sendLog('Skin service disabled: ' + e.message);
      }
    }
    prepareOptionsTxt(gameDir, sendLog);
    const jvmArgsFinal = [`-Xmx${maxRam}M`, `-Xms${minRam}M`, `-Djava.library.path=${nativesDir}`, '-Dminecraft.launcher.brand=wanshuang', '-Dminecraft.launcher.version=' + app.getVersion(), '-Dlog4j.configurationFile=log4j2.xml', ...profileJvmArgs, ...(skinAgentArg ? [skinAgentArg] : []), '-cp', cp, ...extraJvmArgs, mainClass, ...mcArgs].filter(Boolean);
    sendLog('Launching: ' + java);
    sendLog('JVM: -Xmx' + maxRam + 'M -Xms' + minRam + 'M -Djava.library.path=' + nativesDir + (profileJvmArgs.length ? ' | profile JVM: ' + profileJvmArgs.join(' ') : ''));
    sendLog('Main class: ' + mainClass);
    sendLog('MC args: ' + mcArgs.join(' '));
    const proc = spawn(java, jvmArgsFinal, { cwd: gameDir, stdio: ['ignore', 'pipe', 'pipe'] });
    sendLog('Full command: ' + java + ' ' + jvmArgsFinal.map(a => a.includes(' ') ? '"' + a + '"' : a).join(' ').substring(0, 800));
    proc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) sendLog(t) });
    proc.stderr.on('data', (d) => { const t = d.toString().trim(); if (t) sendLog(t) });
    proc.on('exit', (code) => { sendLog('Game exited with code: ' + code); mainWindow?.webContents.send('mc:exit', code) });
    sendLog('Game started (PID: ' + proc.pid + ')');
    return { success: true, pid: proc.pid };
  } catch (e) { sendLog('Launch error: ' + e.message); return { success: false, error: e.message } }
});

// ── Java Download ──
// 多线程分块下载，避免单连接被限速（镜像一般支持 Range）
function probeTotalSize(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Range': 'bytes=0-0', 'User-Agent': 'wanshuang-launcher' }, timeout: 15000 }, (res) => {
      const cr = res.headers['content-range'] || '';
      const m = /bytes\s+\d+-\d+\/(\d+)/i.exec(cr);
      const len = parseInt(res.headers['content-length'] || '0');
      res.resume();
      if (res.statusCode === 206 && m) resolve(parseInt(m[1]));
      else if (res.statusCode === 200 && len > 0) resolve(len);
      else reject(new Error('HTTP ' + res.statusCode));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function fetchRange(url, start, end, partPath, onBytes) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Range': `bytes=${start}-${end}`, 'User-Agent': 'wanshuang-launcher' }, timeout: 30000 }, (res) => {
      if (res.statusCode !== 206 && res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return }
      const file = fs.createWriteStream(partPath);
      res.on('data', c => onBytes(c.length));
      res.on('error', (e) => { try { file.destroy() } catch {}; reject(e) });
      res.pipe(file);
      file.on('finish', () => { try { file.close() } catch {}; resolve() });
      file.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function downloadParallel(url, dest, onProgress, connections = 6) {
  let total = 0;
  try { total = await probeTotalSize(url) } catch { return false }
  if (!total || total < 4 * 1024 * 1024) return false;
  const chunk = Math.ceil(total / connections);
  const parts = [];
  let received = 0;
  const report = (n) => { received += n; if (onProgress) onProgress(Math.min(received, total), total) };
  try {
    await Promise.all(Array.from({ length: connections }, (_, i) => {
      const start = i * chunk;
      if (start >= total) return Promise.resolve();
      const end = Math.min(total - 1, start + chunk - 1);
      const partPath = dest + '.part' + i;
      parts.push({ partPath, start, end });
      return (async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try { await fetchRange(url, start, end, partPath, report); return } catch (e) {
            try { const s = fs.statSync(partPath).size; received -= s } catch {}
            try { fs.unlinkSync(partPath) } catch {}
            if (attempt === 3) throw e;
          }
        }
      })();
    }));
    const fd = fs.openSync(dest, 'w');
    try { for (const { partPath } of parts) fs.writeSync(fd, fs.readFileSync(partPath)) } finally { fs.closeSync(fd) }
    parts.forEach(({ partPath }) => { try { fs.unlinkSync(partPath) } catch {} });
    return fs.statSync(dest).size === total;
  } catch {
    parts.forEach(({ partPath }) => { try { fs.unlinkSync(partPath) } catch {} });
    try { fs.unlinkSync(dest) } catch {}
    return false;
  }
}

// 清华镜像目录中取最新的 JRE zip
async function findTunaJavaZip(major, arch) {
  try {
    const html = await httpGet(`https://mirrors.tuna.tsinghua.edu.cn/Adoptium/${major}/jre/${arch}/windows/`, null, 15000);
    if (typeof html !== 'string') return null;
    const files = (html.match(/OpenJDK\d+U-jre_[^"'<>\s]+\.zip/g) || []);
    if (!files.length) return null;
    const unique = [...new Set(files)].sort();
    return `https://mirrors.tuna.tsinghua.edu.cn/Adoptium/${major}/jre/${arch}/windows/${unique[unique.length - 1]}`;
  } catch { return null }
}

async function installJavaRuntime(opts, sendLog, sendProgress) {
  const mcVersion = typeof opts === 'string' ? opts : opts?.mcVersion;
  const exactOnly = !!(opts && typeof opts === 'object' && opts.exact);
  const requestedMajor = (opts && typeof opts === 'object' && opts.major) ? Number(opts.major) : 0;
  const major = requestedMajor || requiredJavaMajor(mcVersion) || 17;
  try {
    // 已有可用的 Java 时直接复用
    const existing = await chooseJavaForMajor(major);
    const reusable = existing && (exactOnly ? existing.major === major : (major === 8 ? existing.major === 8 : true));
    if (reusable) {
      sendLog('Reuse existing Java ' + existing.major + ': ' + existing.path);
      return { success: true, path: existing.path, major: existing.major, reused: true };
    }

    const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
    const urls = [];
    const tuna = await findTunaJavaZip(major, arch);
    if (tuna) urls.push(tuna);
    urls.push(`https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/${arch}/jre/hotspot/normal/eclipse?project=jdk`);

    sendLog('Downloading Java ' + major + ' ...');
    if (!fs.existsSync(JAVA_RUNTIME_DIR)) fs.mkdirSync(JAVA_RUNTIME_DIR, { recursive: true });
    const zipPath = path.join(JAVA_RUNTIME_DIR, 'java-' + major + '.zip');

    let downloaded = false;
    for (const url of urls) {
      sendLog('Java source: ' + url);
      let lastTime = Date.now(); let lastBytes = 0; let lastLog = 0;
      const onProg = (dl, total) => {
        const pct = total > 0 ? Math.round((dl / total) * 100) : 0;
        const now = Date.now();
        let speedText = '';
        if (now - lastTime >= 500) {
          const bps = (dl - lastBytes) / ((now - lastTime) / 1000);
          speedText = bps > 1024 * 1024 ? (bps / 1024 / 1024).toFixed(1) + ' MB/s' : Math.max(1, Math.round(bps / 1024)) + ' KB/s';
          lastTime = now; lastBytes = dl;
        }
        if (now - lastLog >= 2000) {
          lastLog = now;
          sendLog('Java ' + major + ' 下载中: ' + pct + '% ' + speedText + (total > 0 ? ' (' + (total / 1024 / 1024).toFixed(0) + ' MB)' : ''));
        }
        sendProgress(Math.min(pct, 99), speedText, 'Java ' + major);
      };
      let ok = await downloadParallel(url, zipPath, onProg, 6);
      if (!ok) {
        sendLog('多线程下载不可用，改用单连接');
        ok = await downloadWithRetry(url, zipPath, 2, onProg);
      }
      if (ok && fs.existsSync(zipPath) && fs.statSync(zipPath).size > 1024 * 1024) { downloaded = true; break }
      try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath) } catch {}
    }
    if (!downloaded) throw new Error('Java 下载失败，请检查网络后重试');

    sendProgress(100, '', '正在解压...');
    sendLog('Extracting Java ' + major + ' ...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(JAVA_RUNTIME_DIR, true);
    try { fs.unlinkSync(zipPath) } catch {}

    let javaBin = '';
    for (const entry of fs.readdirSync(JAVA_RUNTIME_DIR)) {
      const dir = path.join(JAVA_RUNTIME_DIR, entry);
      try {
        if (!fs.statSync(dir).isDirectory()) continue;
        const bin = path.join(dir, 'bin', 'javaw.exe');
        if (fs.existsSync(bin) && entry.includes(String(major))) { javaBin = bin; break }
      } catch {}
    }
    if (!javaBin) {
      for (const entry of fs.readdirSync(JAVA_RUNTIME_DIR)) {
        const bin = path.join(JAVA_RUNTIME_DIR, entry, 'bin', 'javaw.exe');
        if (fs.existsSync(bin)) { javaBin = bin; break }
      }
    }
    if (javaBin && fs.existsSync(javaBin)) {
      sendLog('Java installed: ' + javaBin);
      sendProgress(100, '完成', 'Java ' + major);
      return { success: true, path: javaBin, major };
    }
    return { success: false, error: '解压失败，未找到 javaw.exe' };
  } catch (e) {
    sendLog('Java download error: ' + e.message);
    return { success: false, error: e.message };
  }
}

ipcMain.handle('mc:downloadJava', async (_, opts) => {
  const sendLog = (msg) => mainWindow?.webContents.send('mc:log', msg);
  const sendProgress = (pct, speed, filename) => mainWindow?.webContents.send('mc:javaDlProgress', { pct, speed, filename });
  return installJavaRuntime(opts, sendLog, sendProgress);
});

// ── Speed Test ──
ipcMain.handle('mc:speedTest', async () => {
  const results = [];
  for (const { name, url } of MIRRORS) {
    const start = Date.now();
    try {
      const proxyUrl = url + '/mc/game/version_manifest_v2.json';
      const result = await Promise.race([
        httpGet(proxyUrl),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))
      ]);
      results.push({ name, ping: Date.now() - start + 'ms', ok: true });
    } catch {
      const elapsed = Date.now() - start;
      results.push({ name, ping: elapsed > 9000 ? 'timeout' : elapsed + 'ms', ok: false });
    }
  }
  return results;
});

// ── Mods ──
ipcMain.handle('mc:listMods', (_, version) => {
  const modsDir = version ? path.join(MINECRAFT_DIR, 'versions', version, 'mods') : path.join(MINECRAFT_DIR, 'mods');
  if (!fs.existsSync(modsDir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(modsDir)) {
    let filename = entry, enabled = true;
    if (entry.endsWith('.disabled')) { filename = entry.slice(0, -9); enabled = false }
    if (!filename.endsWith('.jar')) continue;
    const jarPath = path.join(modsDir, entry);
    let name = filename.replace('.jar', ''), version = '?', description = '';
    try {
      const out = execSync(`cd /d "${modsDir}" && "${process.env.WINDIR}\\System32\\tar" -xf "${filename}" fabric.mod.json -O 2>nul`, { encoding: 'utf8', timeout: 5000 });
      if (out) { const meta = JSON.parse(out); name = meta.name || name; version = meta.version || version; description = (meta.description || '').substring(0, 100) }
    } catch {}
    if (!description) {
      try {
        const out = execSync(`cd /d "${modsDir}" && "${process.env.WINDIR}\\System32\\tar" -xf "${filename}" mcmod.info -O 2>nul`, { encoding: 'utf8', timeout: 5000 });
        if (out) { const arr = JSON.parse(out); if (arr[0]) { name = arr[0].name || name; version = arr[0].version || version; description = (arr[0].description || '').substring(0, 100) } }
      } catch {}
    }
    results.push({ name, version, enabled, filename: entry, description });
  }
  return results;
});

ipcMain.handle('mc:toggleMod', (_, filename) => {
  const modsDir = path.join(MINECRAFT_DIR, 'mods');
  const filePath = path.join(modsDir, filename);
  if (filename.endsWith('.disabled')) { const newPath = filePath.slice(0, -9); if (fs.existsSync(filePath)) { fs.renameSync(filePath, newPath); return true } }
  else { const newPath = filePath + '.disabled'; if (fs.existsSync(filePath)) { fs.renameSync(filePath, newPath); return true } }
  return false;
});

// ── Terracotta 陶瓦联机 ──
let tcProcess = null;
let tcPort = null;
let tcPollTimer = null;
let tcState = { state: 'idle' };
const TC_BIN = app.isPackaged
  ? path.join(process.resourcesPath, 'terracotta', 'terracotta.exe')
  : path.join(__dirname, 'terracotta-bin', 'terracotta.exe');

const CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function tcFetch(url) {
  return new Promise((resolve, reject) => {
    const h = require('http').get(url, { timeout: 5000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    h.on('error', reject);
    h.setTimeout(5000, () => { h.destroy(); reject(new Error('timeout')) });
  });
}

ipcMain.handle('et:start', () => {
  return fs.existsSync(TC_BIN);
});

ipcMain.handle('et:host', async (_, playerName) => {
  if (tcProcess) { tcStop() }

  const tmpFile = path.join(require('os').tmpdir(), 'wsl-terracotta-' + process.pid + '.json');
  try { fs.unlinkSync(tmpFile) } catch {}

  tcProcess = spawn(TC_BIN, ['--hmcl2', tmpFile], {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true
  });
  tcProcess.stderr.on('data', d => console.error('[TC]', d.toString()));
  tcProcess.on('exit', (c) => {
    console.error('[TC] exited:', c);
    tcProcess = null; tcPort = null;
    tcSendStatus({ running: false, connected: false, state: 'idle' });
  });

  // 等待 --hmcl2 文件出现（获取端口）
  let port = null;
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (tcProcess && tcProcess.killed) break;
    try {
      const content = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
      if (content.port) { port = content.port; break }
    } catch {}
  }
  if (!port || !tcProcess) {
    return { ok: false, error: '启动陶瓦联机失败' };
  }
  tcPort = port;

  // 发起扫描 (host)
  let scanUrl = `http://127.0.0.1:${port}/state/scanning`;
  if (playerName) scanUrl += `?player=${encodeURIComponent(playerName)}`;
  try { await tcFetch(scanUrl) } catch (e) { return { ok: false, error: '扫描失败: ' + e.message } }

  // 轮询状态直到 host-ok
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const s = JSON.parse(await tcFetch(`http://127.0.0.1:${port}/state/`));
      tcState = s;
      if (s.state === 'host-ok') {
        // 转轮询保活
        tcStartPolling();
        return { ok: true, code: s.room };
      }
      if (s.state === 'exception') {
        return { ok: false, error: '房间创建失败 (' + s.type + ')' };
      }
    } catch {}
  }
  return { ok: false, error: '房间创建超时' };
});

ipcMain.handle('et:join', async (_, roomCode, playerName) => {
  if (!roomCode) return { ok: false, error: '无效的房间码' };
  if (tcProcess) { tcStop() }

  const tmpFile = path.join(require('os').tmpdir(), 'wsl-terracotta-' + process.pid + '.json');
  try { fs.unlinkSync(tmpFile) } catch {}

  tcProcess = spawn(TC_BIN, ['--hmcl2', tmpFile], {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true
  });
  tcProcess.stderr.on('data', d => console.error('[TC]', d.toString()));
  tcProcess.on('exit', (c) => {
    console.error('[TC] exited:', c);
    tcProcess = null; tcPort = null;
    tcSendStatus({ running: false, connected: false, state: 'idle' });
  });

  let port = null;
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (tcProcess && tcProcess.killed) break;
    try {
      const content = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
      if (content.port) { port = content.port; break }
    } catch {}
  }
  if (!port || !tcProcess) {
    return { ok: false, error: '启动陶瓦联机失败' };
  }
  tcPort = port;

  // 加入房间
  let guestUrl = `http://127.0.0.1:${port}/state/guesting?room=${encodeURIComponent(roomCode)}`;
  if (playerName) guestUrl += `&player=${encodeURIComponent(playerName)}`;
  try { await tcFetch(guestUrl) } catch (e) { return { ok: false, error: '加入失败: ' + e.message } }

  // 轮询状态直到 guest-ok
  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const s = JSON.parse(await tcFetch(`http://127.0.0.1:${port}/state/`));
      tcState = s;
      if (s.state === 'guest-ok') {
        tcStartPolling();
        return { ok: true, url: s.url };
      }
      if (s.state === 'exception') {
        return { ok: false, error: '加入失败 (' + s.type + ')' };
      }
    } catch {}
  }
  return { ok: false, error: '加入超时' };
});

function tcStop() {
  if (tcPollTimer) { clearInterval(tcPollTimer); tcPollTimer = null }
  if (tcPort) {
    // 请求和平关闭
    try {
      require('http').get(`http://127.0.0.1:${tcPort}/panic?peaceful=true`, { timeout: 2000 }).on('error', () => {})
    } catch {}
  }
  if (tcProcess) { try { tcProcess.kill() } catch {} tcProcess = null }
  tcPort = null;
  tcState = { state: 'idle' };
}

function tcStartPolling() {
  if (tcPollTimer) clearInterval(tcPollTimer);
  tcPollTimer = setInterval(async () => {
    if (!tcPort || !tcProcess || tcProcess.killed) {
      tcSendStatus({ running: false, connected: false, state: 'idle' });
      return;
    }
    try {
      const s = JSON.parse(await tcFetch(`http://127.0.0.1:${tcPort}/state/`));
      tcState = s;
      tcSendStatus({
        running: true,
        connected: s.state === 'host-ok' || s.state === 'guest-ok',
        state: s.state,
        room: s.room,
        url: s.url
      });
    } catch {
      tcSendStatus({ running: true, connected: false, state: tcState.state || 'unknown' });
    }
  }, 3000);
}

function tcSendStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('et:status', status);
  }
}

ipcMain.handle('et:stop', () => {
  tcStop();
  return true;
});

ipcMain.handle('et:status', () => {
  if (tcProcess && !tcProcess.killed && tcPort) {
    return { running: true, connected: tcState.state === 'host-ok' || tcState.state === 'guest-ok', state: tcState.state };
  }
  return { running: false, connected: false, state: 'idle' };
});

ipcMain.handle('et:qr', async (_, text) => {
  try {
    const QRCode = require('qrcode');
    return await QRCode.toDataURL(text, { width: 280, margin: 1 });
  } catch { return null }
});

// ── Music Search ──
ipcMain.handle('music:search', async (_, { query, platform }) => {
  if (!query) return [];
  const hdrs = { 'User-Agent': 'Mozilla/5.0' };
  let url;
  try {
    let data;
    if (platform === 'bilibili') {
      data = await new Promise((resolve, reject) => {
        const req = net.request(`https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodeURIComponent(query)}`);
        req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        req.setHeader('Referer', 'https://www.bilibili.com');
        let d = '';
        req.on('response', (res) => { res.setEncoding('utf8'); res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)) } catch { reject(new Error('parse fail')) } }) });
        req.on('error', reject);
        req.end();
      });
      if (data && data.code === 0 && data.data && data.data.result) {
        const videos = data.data.result.find(r => r.type === 'video');
        if (videos && videos.data) {
          return videos.data.slice(0, 10).map(v => ({
            id: v.aid || v.bvid, name: (v.title || '').replace(/<[^>]+>/g, ''), artist: v.author || '', album: '', duration: v.duration || 0, platform: 'bilibili',
          }));
        }
      }
    } else {
      data = await new Promise((resolve, reject) => {
        const req = net.request(`https://music.163.com/api/search/get?s=${encodeURIComponent(query)}&type=1&limit=10&offset=0`);
        req.setHeader('User-Agent', 'Mozilla/5.0');
        req.setHeader('Referer', 'https://music.163.com');
        let d = '';
        req.on('response', (res) => { res.setEncoding('utf8'); res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)) } catch { reject(new Error('parse fail')) } }) });
        req.on('error', reject);
        req.end();
      });
      if (data && data.result && data.result.songs) {
        return data.result.songs.slice(0, 10).map(s => ({
          id: s.id, name: s.name, artist: (s.artists || []).map(a => a.name).join(', '), album: s.album ? s.album.name : '', duration: s.duration || 0, platform: 'netease',
        }));
      }
    }
  } catch {}
  return [];
});

// ── Music Module ──
let musicPollTimer = null;

function getMediaSessionPath() {
  const pkg = path.join(process.resourcesPath || '', 'media-session', 'media-session.exe');
  const dev = path.join(app.getAppPath(), 'media-session', 'media-session.exe');
  return fs.existsSync(pkg) ? pkg : dev;
}

function pollMediaSessions() {
  const exe = getMediaSessionPath();
  if (!fs.existsSync(exe)) return;
  try {
    const out = execSync(`"${exe}"`, { encoding: 'utf8', timeout: 5000 });
    const sessions = [];
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('NONE')) continue;
      const p = t.split('|');
      if (p[0] === 'S' && p.length >= 8) {
        sessions.push({
          sourceId: p[7] || '',
          title: p[1] || '',
          artist: p[2] || '',
          album: p[3] || '',
          status: p[4] || 'Unknown',
          position: parseFloat(p[5]) || 0,
          endTime: parseFloat(p[6]) || 0,
        });
      }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('music:info', { sessions });
    }
  } catch (e) {
    console.error('[music] poll error:', e.message);
  }
}

ipcMain.handle('music:start', () => {
  if (musicPollTimer) return;
  pollMediaSessions();
  musicPollTimer = setInterval(pollMediaSessions, 2000);
});

ipcMain.handle('music:stop', () => {
  if (musicPollTimer) {
    clearInterval(musicPollTimer);
    musicPollTimer = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('music:info', { sessions: [] });
  }
});

ipcMain.handle('music:control', async (_, action) => {
  const exe = getMediaSessionPath();
  if (!fs.existsSync(exe)) return false;
  try {
    execSync(`"${exe}" --control "${action}"`, { encoding: 'utf8', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
});

// ══════════════════════════ IM Module ══════════════════════════
let imSocket = null;
let imToken = null;
let imMe = null;

function imSendToRenderer(event, data) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('im:' + event, data);
}

function imConnect() {
  if (imSocket) { try { imSocket.disconnect() } catch {} }
  imSocket = io(IM_SERVER_URL, { auth: { token: imToken }, reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 2000 });

  imSocket.on('connect', () => imSendToRenderer('connected', {}));
  imSocket.on('disconnect', () => imSendToRenderer('disconnected', {}));
  imSocket.on('connect_error', (e) => imSendToRenderer('error', { message: e.message }));
  imSocket.on('kicked', () => imSendToRenderer('kicked', {}));

  for (const ev of ['friends:status', 'friend:status', 'friend:new', 'friend:removed', 'chat:message', 'chat:unread']) {
    imSocket.on(ev, (d) => imSendToRenderer(ev, d));
  }
}

function imSaveToken(token, me) {
  imToken = token; imMe = me;
  try { fs.writeFileSync(IM_TOKEN_FILE, JSON.stringify({ token, me }), 'utf8') } catch {}
}

function imLoadToken() {
  try {
    const d = JSON.parse(fs.readFileSync(IM_TOKEN_FILE, 'utf8'));
    imToken = d.token; imMe = d.me;
    return d;
  } catch { return null }
}

ipcMain.handle('im:register', async (_, { username, password }) => {
  try {
    const res = await new Promise((resolve, reject) => {
      const req = net.request({ method: 'POST', url: IM_SERVER_URL + '/api/register' });
      req.setHeader('Content-Type', 'application/json');
      let d = '';
      req.on('response', (r) => { r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)) } catch { reject(new Error(d)) } }) });
      req.on('error', reject);
      req.end(JSON.stringify({ username, password }));
    });
    if (res.ok) imSaveToken(res.token, { id: res.id, username: res.username });
    return res;
  } catch (e) { return { ok: false, error: e.message } }
});

ipcMain.handle('im:login', async (_, { username, password }) => {
  try {
    const res = await new Promise((resolve, reject) => {
      const req = net.request({ method: 'POST', url: IM_SERVER_URL + '/api/login' });
      req.setHeader('Content-Type', 'application/json');
      let d = '';
      req.on('response', (r) => { r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)) } catch { reject(new Error(d)) } }) });
      req.on('error', reject);
      req.end(JSON.stringify({ username, password }));
    });
    if (res.ok) imSaveToken(res.token, { id: res.id, username: res.username });
    return res;
  } catch (e) { return { ok: false, error: e.message } }
});

ipcMain.handle('im:logout', () => {
  imToken = null; imMe = null;
  if (imSocket) { try { imSocket.disconnect() } catch {}; imSocket = null }
  try { fs.unlinkSync(IM_TOKEN_FILE) } catch {}
  return true;
});

ipcMain.handle('im:connect', () => {
  const saved = imLoadToken();
  if (!saved || !saved.token) return { ok: false, error: '未登录' };
  imConnect();
  return { ok: true, me: imMe };
});

ipcMain.handle('im:me', () => imMe);
ipcMain.handle('im:disconnect', () => { if (imSocket) { imSocket.disconnect(); imSocket = null } return true });

function imCall(event, data) {
  return new Promise((resolve) => {
    if (!imSocket || !imSocket.connected) return resolve({ ok: false, error: '未连接' });
    const timeout = setTimeout(() => resolve({ ok: false, error: '超时' }), 8000);
    imSocket.emit(event, data, (res) => { clearTimeout(timeout); resolve(res) });
  });
}

ipcMain.handle('im:friends:list', async () => await imCall('friends:list'));
ipcMain.handle('im:friends:search', async (_, username) => await imCall('friends:search', { username }));
ipcMain.handle('im:friends:add', async (_, username) => await imCall('friends:add', { username }));
ipcMain.handle('im:friends:remove', async (_, id) => await imCall('friends:remove', { id }));
ipcMain.handle('im:chat:send', async (_, { to, text }) => await imCall('chat:send', { to, text }));
ipcMain.handle('im:chat:history', async (_, withId) => await imCall('chat:history', { with: withId }));
ipcMain.handle('im:chat:read', async (_, withId) => await imCall('chat:read', { with: withId }));
ipcMain.handle('im:chat:unread', async () => await imCall('chat:unread'));

