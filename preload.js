const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wsl', {
  minimize: () => ipcRenderer.invoke('win:minimize'),
  maximize: () => ipcRenderer.invoke('win:maximize'),
  close: () => ipcRenderer.invoke('win:close'),

  loginMicrosoft: (refreshToken) => refreshToken ? ipcRenderer.invoke('auth:microsoftRefresh', refreshToken) : ipcRenderer.invoke('auth:microsoft'),
  logoutMicrosoft: () => ipcRenderer.invoke('auth:logout'),

  browseJava: () => ipcRenderer.invoke('java:browse'),
  detectJava: () => ipcRenderer.invoke('java:detect'),
  detectAllJava: () => ipcRenderer.invoke('java:detectAll'),

  getVersions: (mirror) => ipcRenderer.invoke('mc:fetchVersions', mirror),
  getLocalVersions: () => ipcRenderer.invoke('mc:getLocalVersions'),
  getVersionMeta: (id) => ipcRenderer.invoke('mc:getVersionMeta', id),

  launchGame: (config) => ipcRenderer.invoke('mc:launch', config),

  getMirrors: () => ipcRenderer.invoke('mc:getMirrors'),
  setMirror: (val) => ipcRenderer.invoke('mc:setMirror', val),
  speedTest: () => ipcRenderer.invoke('mc:speedTest'),

  getLoaders: (versionId) => ipcRenderer.invoke('mc:getLoaders', versionId),
  installLoader: (opts) => ipcRenderer.invoke('mc:installLoader', opts),
  searchResources: (opts) => ipcRenderer.invoke('mc:searchResources', opts),
  getResourceDetail: (id) => ipcRenderer.invoke('mc:getResourceDetail', id),
  getResourceVersions: (projId, ver) => ipcRenderer.invoke('mc:getResourceVersions', projId, ver),
  translateText: (text, targetLang) => ipcRenderer.invoke('mc:translateText', text, targetLang),
  cfSearch: (opts) => ipcRenderer.invoke('mc:cfSearch', opts),
  cfDetail: (id) => ipcRenderer.invoke('mc:cfDetail', id),
  cfVersions: (projId, ver) => ipcRenderer.invoke('mc:cfVersions', projId, ver),

  queueDownload: (items) => ipcRenderer.invoke('mc:queueDownload', items),
  cancelQueue: (id) => ipcRenderer.invoke('mc:cancelQueue', id),

  minecraftDir: () => ipcRenderer.invoke('mc:minecraftDir'),
  fileExists: (p) => ipcRenderer.invoke('mc:fileExists', p),
  readFile: (p) => ipcRenderer.invoke('mc:readFile', p),
  ensureDir: (p) => ipcRenderer.invoke('mc:ensureDir', p),
  readDir: (p) => ipcRenderer.invoke('mc:readDir', p),
  downloadFile: (url, dest) => ipcRenderer.invoke('mc:downloadFile', url, dest),
  openDir: (p) => ipcRenderer.invoke('mc:openDir', p),
  deleteFile: (p) => ipcRenderer.invoke('mc:deleteFile', p),

  getLogo: () => ipcRenderer.invoke('app:logo'),

  onLog: (cb) => { ipcRenderer.on('mc:log', (_, m) => cb(m)) },
  onExit: (cb) => { ipcRenderer.on('mc:exit', (_, c) => cb(c)) },
  onProgress: (cb) => { ipcRenderer.on('mc:progress', (_, p) => cb(p)) },
  onStatus: (cb) => { ipcRenderer.on('mc:status', (_, s) => cb(s)) },
  onDownloadProgress: (cb) => { ipcRenderer.on('mc:downloadProgress', (_, d) => cb(d)) },
  onQueueProgress: (cb) => { ipcRenderer.on('mc:queueProgress', (_, d) => cb(d)) },
  listMods: (version) => ipcRenderer.invoke('mc:listMods', version),
  toggleMod: (filename) => ipcRenderer.invoke('mc:toggleMod', filename),
  downloadJava: () => ipcRenderer.invoke('mc:downloadJava'),
  onJavaDlProgress: (cb) => { ipcRenderer.on('mc:javaDlProgress', (_, d) => cb(d)) },

  // ── AI Game Companion ──
  botConnect: (opts) => ipcRenderer.invoke('bot:connect', opts),
  botDisconnect: () => ipcRenderer.invoke('bot:disconnect'),
  botStatus: () => ipcRenderer.invoke('bot:status'),
  botExec: (action) => ipcRenderer.invoke('bot:exec', action),
  botChat: (msg) => ipcRenderer.invoke('bot:chat', msg),
  onBotStatus: (cb) => { ipcRenderer.on('bot:status', (_, d) => cb(d)) },
  onBotProgress: (cb) => { ipcRenderer.on('bot:progress', (_, d) => cb(d)) },
  botConfigGet: () => ipcRenderer.invoke('bot:config:get'),
  botConfigSet: (kv) => ipcRenderer.invoke('bot:config:set', kv),
  botConfigReset: () => ipcRenderer.invoke('bot:config:reset'),
  botModeSet: (mode) => ipcRenderer.invoke('bot:mode:set', mode),

  botApiGet: () => ipcRenderer.invoke('bot:api:get'),
  botApiPresets: () => ipcRenderer.invoke('bot:api:presets'),
  botApiSave: (cfg) => ipcRenderer.invoke('bot:api:save', cfg),
  botApiTest: (provider) => ipcRenderer.invoke('bot:api:test', provider),
  botApiChat: (msg) => ipcRenderer.invoke('bot:api:chat', msg),
  onBotChatStream: (cb) => { ipcRenderer.on('bot:chat:stream', (_, d) => cb(d)) },
  botChatClear: () => ipcRenderer.invoke('bot:chat:clear'),
  botChatHistory: () => ipcRenderer.invoke('bot:chat:history'),
  onBotDebug: (cb) => { ipcRenderer.on('bot:debug', (_, d) => cb(d)) },

  // Personality
  botPersonality: () => ipcRenderer.invoke('bot:personality:get'),
  botPersonalitySet: (name) => ipcRenderer.invoke('bot:personality:set', name),

  // Summon / Dismiss
  botSummon: (opts) => ipcRenderer.invoke('bot:summon', opts),
  botDismiss: () => ipcRenderer.invoke('bot:dismiss'),

  // Persistence
  botSaveState: () => ipcRenderer.invoke('bot:state:save'),
  botLoadState: () => ipcRenderer.invoke('bot:state:load'),

  // ── EasyTier 联机 (直接内核) ──
  etStart: () => ipcRenderer.invoke('et:start'),
  etHost: (playerName) => ipcRenderer.invoke('et:host', playerName),
  etJoin: (code, playerName) => ipcRenderer.invoke('et:join', code, playerName),
  etStop: () => ipcRenderer.invoke('et:stop'),
  etStatus: () => ipcRenderer.invoke('et:status'),
  etQR: (text) => ipcRenderer.invoke('et:qr', text),
  onEtStatus: (cb) => { ipcRenderer.on('et:status', (_, s) => cb(s)) },
});
