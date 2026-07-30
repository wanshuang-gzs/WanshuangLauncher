const { app, BrowserWindow, ipcMain, Menu, dialog, shell, nativeImage, net } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const { Auth } = require('./src/vendor/auth');

app.setAppUserModelId('com.wanshuang.launcher');

const MINECRAFT_DIR = path.join(process.env.APPDATA || process.env.HOME, '.minecraft');
const MIRRORS = [
  { name: 'Official', url: 'https://piston-meta.mojang.com' },
  { name: 'BMCLAPI', url: 'https://bmclapi2.bangbang93.com' },
  { name: 'MCBBS', url: 'https://download.mcbbs.net' },
  { name: 'MCIM', url: 'https://download.mcimirror.top' },
  { name: 'MC-SDK', url: 'https://mc-sdk.xinghai.dev' },
];
const MODRINTH_API = 'https://api.modrinth.com/v2';
let mainWindow = null;
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
  const splashWin = new BrowserWindow({
    width: 620, height: 340,
    frame: false, resizable: false,
    transparent: false,
    backgroundColor: '#05050a',
    icon: path.join(__dirname, 'public', 'app.ico'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWin.loadFile(splashPath);
  splashWin.center();
  splashWin.on('closed', () => {
    if (!mainWindow) createWindow();
  });
  setTimeout(() => {
    if (!splashWin.isDestroyed()) {
      splashWin.close();
      if (!mainWindow) createWindow();
    }
  }, 7000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 780,
    minWidth: 880, minHeight: 660,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, 'public', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } });
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
ipcMain.handle('java:detect', () => {
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
    for (const dir of ['Java', 'Eclipse Adoptium', 'BellSoft', 'Amazon Corretto', 'Zulu']) {
      const p = path.join(base, dir);
      if (fs.existsSync(p)) { for (const entry of fs.readdirSync(p)) { const bin = path.join(p, entry, 'bin', 'java.exe'); if (fs.existsSync(bin)) candidates.push(bin) } }
    }
  }
  if (process.env.JAVA_HOME) { const bin = path.join(process.env.JAVA_HOME, 'bin\\java.exe'); if (fs.existsSync(bin)) candidates.push(bin) }
  try { const out = execSync('where java 2>nul', { encoding: 'utf8', timeout: 3000 }); for (const line of out.split('\n')) { const p = line.trim(); if (p && fs.existsSync(p)) candidates.push(p) } } catch {}
  return candidates.length > 0 ? [...new Set(candidates)][0] : null;
});

ipcMain.handle('java:detectAll', () => {
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
    for (const dir of ['Java', 'Eclipse Adoptium', 'BellSoft', 'Amazon Corretto', 'Zulu']) {
      const p = path.join(base, dir);
      if (fs.existsSync(p)) { for (const entry of fs.readdirSync(p)) { const bin = path.join(p, entry, 'bin', 'java.exe'); if (fs.existsSync(bin)) candidates.push(bin) } }
    }
  }
  if (process.env.JAVA_HOME) { const bin = path.join(process.env.JAVA_HOME, 'bin\\java.exe'); if (fs.existsSync(bin)) candidates.push(bin) }
  try { const out = execSync('where java 2>nul', { encoding: 'utf8', timeout: 3000 }); for (const line of out.split('\n')) { const p = line.trim(); if (p && fs.existsSync(p)) candidates.push(p) } } catch {}
  return [...new Set(candidates)];
});

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
        let total = 0, dl = 0;
        req.on('response', (res) => { total = parseInt(res.headers['content-length'] || '0'); res.on('data', c => { dl += c.length; if (total > 0 && onProgress) onProgress(dl, total) }); res.pipe(file) });
        file.on('finish', () => { file.close(); resolve() });
        req.on('error', reject);
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

ipcMain.handle('mc:installLoader', async (_, { mcVersion, loaderName, loaderType, loaderVersion, downloadUrl, javaPath: jp }) => {
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

      qItems[0].status = 'downloading'; sendProgress(qItems, 4, 0);
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
      const versionsDir = path.join(MINECRAFT_DIR, 'versions');
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const versionsBefore = new Set(fs.readdirSync(versionsDir));
      const cmd = loaderType === 'forge' ? '--installClient' : '--install-client';
      try {
        execSync(`"${javaPath}" -jar "${installerPath}" ${cmd} 2>&1`, { timeout: 180000, cwd: MINECRAFT_DIR });
      } catch (e) {
        try { fs.unlinkSync(installerPath) } catch {}
        throw new Error(loaderName + ' 安装器运行失败: ' + (e.stderr || e.message || '').substring(0, 200));
      }
      qItems[1].progress = 100; qItems[1].status = 'done'; sendProgress(qItems, 4, 2);

      qItems[2].status = 'downloading'; sendProgress(qItems, 4, 2);
      const versionsAfter = fs.readdirSync(versionsDir);
      const created = versionsAfter.find(f => !versionsBefore.has(f));
      if (!created) throw new Error(loaderName + ' 安装器运行完毕但未生成版本文件夹');
      log('安装器生成的版本: ' + created);
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
    return { success: true, newVersionId: newId };
  } catch (e) {
    log('加载器安装失败: ' + e.message);
    // Clean up empty folder on failure
    try { if (fs.existsSync(verDir) && fs.readdirSync(verDir).length === 0) fs.rmdirSync(verDir) } catch {}
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

ipcMain.handle('mc:translateText', async (_, text, targetLang) => {
  if (!text) return '';
  const t = text.slice(0, 2000);
  const to = targetLang === 'zh-CN' ? 'zh-Hans' : 'en';
  const from = targetLang === 'zh-CN' ? 'en' : 'auto';

  // Microsoft Translator (Edge 接口，国内可访问)
  for (let retry = 0; retry < 2; retry++) {
    try {
      const token = await new Promise((resolve, reject) => {
        https.get('https://edge.microsoft.com/translate/auth', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')) });
      });
      if (!token) continue;
      const result = await new Promise((resolve, reject) => {
        const body = JSON.stringify([{ Text: t }]);
        const u = new URL(`https://api-edge.cognitive.microsofttranslator.com/translate?from=${from}&to=${to}&api-version=3.0`);
        const opts = {
          hostname: u.hostname, port: 443, path: u.pathname + u.search,
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': 'Mozilla/5.0',
          },
          timeout: 10000,
        };
        const req = https.request(opts, (res) => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => {
            try { resolve(JSON.parse(d)) } catch { resolve(null) }
          });
        });
        req.on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')) });
        req.write(body); req.end();
      });
      if (result && Array.isArray(result) && result[0] && result[0].translations && result[0].translations[0]) {
        return result[0].translations[0].text;
      }
    } catch {}
  }

  return null;
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
ipcMain.handle('mc:deleteFile', (_, p) => { try { if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true }); return true } } catch { return false } });

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

async function resolveLibraries(versionMeta, onLog) {
  const classpath = [];
  for (const lib of (versionMeta.libraries || [])) {
    if (!ruleMatches(lib) || isNative(lib)) continue;
    const libPath = getLibraryPath(lib);
    if (!libPath) continue;
    if (fs.existsSync(libPath)) { classpath.push(libPath) }
    else { const url = getLibraryUrl(lib); if (url) { onLog('Downloading library: ' + lib.name); const ok = await downloadWithRetry(url, libPath); if (ok) classpath.push(libPath) } }
  }
  const clientPath = path.join(MINECRAFT_DIR, 'versions', versionMeta.id, versionMeta.id + '.jar');
  if (fs.existsSync(clientPath)) { classpath.push(clientPath) }
  else if (versionMeta.downloads?.client?.url) { onLog('Downloading client: ' + versionMeta.id); await downloadWithRetry(versionMeta.downloads.client.url, clientPath); classpath.push(clientPath) }
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

async function resolveAssets(assetIndexData, onLog) {
  if (!assetIndexData?.objects) return;
  const objects = assetIndexData.objects;
  const keys = Object.keys(objects);
  const total = keys.length;
  const cached = getCachedAssetIndex();
  if (cached.id === assetIndexData.id && cached.total === total) { onLog('Assets already verified (' + total + ' files)'); return true }
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
  const java = javaPath || 'java';
  const sendLog = (msg) => mainWindow?.webContents.send('mc:log', msg);
  try {
    sendLog('Resolving version: ' + version);
    const versionMeta = await resolveVersion(version);
    sendLog('Checking libraries...');
    const classpath = await resolveLibraries(versionMeta, sendLog);
    sendLog('Checking asset index...');
    const assetIndexData = await getAssetIndex(versionMeta, sendLog);
    await resolveAssets(assetIndexData, sendLog);
    sendLog('Extracting natives...');
    const nativesDir = await extractNatives(versionMeta, sendLog);
    const cp = classpath.join(';');
    const mainClass = versionMeta.mainClass || 'net.minecraft.client.main.Main';
    const gameDir = MINECRAFT_DIR;
    const assetIndex = versionMeta.assetIndex?.id || 'legacy';
    const assetsDir = path.join(MINECRAFT_DIR, 'assets');
    const uuid = account?.uuid || '00000000-0000-0000-0000-000000000000';
    const token = account?.token || 'offline';
    const userType = account?.type === 'microsoft' ? 'msa' : 'offline';
    const versionType = 'release';
    const extraJvmArgs = jvmArgs ? jvmArgs.split(' ').filter(Boolean) : [];
    const rw = parseInt(resWidth); const rh = parseInt(resHeight);
    const subs = { auth_player_name: username, version_name: version, game_directory: gameDir, assets_root: assetsDir, assets_index_name: assetIndex, auth_uuid: uuid, auth_access_token: token, user_type: userType, version_type: versionType, auth_session: token, game_assets: assetsDir, user_properties: '{}', natives_directory: nativesDir, classpath: cp, launcher_name: 'wanshuang', launcher_version: '3.0', resolution_width: rw > 0 && !isNaN(rw) ? String(rw) : '854', resolution_height: rh > 0 && !isNaN(rh) ? String(rh) : '480' };
    const mcArgs = cleanLaunchArgs(resolveMinecraftArgs(versionMeta, subs, false));
    const profileJvmArgs = resolveJvmArgs(versionMeta, subs);
    const forgeLaunchTarget = mcArgs.find(a => a === 'forge_client' || a === 'forge_server');
    if (forgeLaunchTarget && !mcArgs.includes('--launchTarget')) {
      mcArgs.unshift('--launchTarget', forgeLaunchTarget);
    }
    prepareOptionsTxt(gameDir, sendLog);
    const jvmArgsFinal = [`-Xmx${maxRam}M`, `-Xms${minRam}M`, `-Djava.library.path=${nativesDir}`, '-Dminecraft.launcher.brand=wanshuang', '-Dminecraft.launcher.version=3.0', '-Dlog4j.configurationFile=log4j2.xml', ...profileJvmArgs, '-cp', cp, ...extraJvmArgs, mainClass, ...mcArgs].filter(Boolean);
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
const JAVA_RUNTIME_DIR = path.join(__dirname, 'runtime', 'java');
ipcMain.handle('mc:downloadJava', async (event) => {
  const sendLog = (msg) => mainWindow?.webContents.send('mc:log', msg);
  const sendProgress = (pct, speed, filename) => mainWindow?.webContents.send('mc:javaDlProgress', { pct, speed, filename });
  try {
    const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'aarch64' : 'x64';
    const javaUrl = `https://api.adoptium.net/v3/binary/latest/17/ga/windows/${arch}/jre/hotspot/normal/eclipse?project=jdk`;
    sendLog('Downloading Java 17 from Adoptium...');
    if (!fs.existsSync(JAVA_RUNTIME_DIR)) fs.mkdirSync(JAVA_RUNTIME_DIR, { recursive: true });
    const zipPath = path.join(JAVA_RUNTIME_DIR, 'java.zip');
    await downloadWithRetry(javaUrl, zipPath, 3, (pct) => sendProgress(pct, '', ''));
    sendProgress(100, '', '正在解压...');
    execSync(`powershell -c "Expand-Archive -Path '${zipPath}' -DestinationPath '${JAVA_RUNTIME_DIR}' -Force 2>$null"`, { timeout: 60000 });
    fs.unlinkSync(zipPath);
    const dirs = fs.readdirSync(JAVA_RUNTIME_DIR).filter(d => fs.statSync(path.join(JAVA_RUNTIME_DIR, d)).isDirectory());
    const javaBin = dirs.length > 0 ? path.join(JAVA_RUNTIME_DIR, dirs[0], 'bin', 'javaw.exe') : '';
    if (javaBin && fs.existsSync(javaBin)) {
      sendLog('Java installed: ' + javaBin);
      return { success: true, path: javaBin };
    }
    return { success: false, error: 'Extraction failed' };
  } catch (e) {
    sendLog('Java download error: ' + e.message);
    return { success: false, error: e.message };
  }
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




