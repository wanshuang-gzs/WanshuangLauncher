const { ipcMain } = require('electron')
const BotManager = require('./manager')
const apiConfig = require('./api-config')
const apiClient = require('./api-client')

let instance = null
let win = null

function emitStatus(msg) { try { win?.webContents.send('bot:status', msg) } catch {} }
function emitProgress(data) { try { win?.webContents.send('bot:progress', data) } catch {} }
function emitDebug(msg) { try { win?.webContents.send('bot:debug', msg) } catch {} }

function get() {
  if (!instance) {
    instance = new BotManager()
    instance.onStatus(emitStatus)
    instance.onProgress(emitProgress)
    instance.onDebug(emitDebug)
  }
  return instance
}

const PERSONALITIES = {
  default: { prompt: '你是一个友好可靠的Minecraft AI游戏伴侣，说话简洁直接。' },
  friendly: { prompt: '你是一个热情开朗的AI伙伴，喜欢用语气词，经常鼓励玩家，说话可爱活泼。' },
  cool: { prompt: '你是一个高冷但靠谱的AI搭档，话少，言简意赅，不讲废话。' },
  humorous: { prompt: '你是一个幽默风趣的AI队友，喜欢开玩笑和吐槽，但做事认真不耽误干活。' },
}

let currentPersonality = 'default'

function register(mainWindow) {
  win = mainWindow

  // ── Bot Core ──
  ipcMain.handle('bot:connect', async (_, opts) => {
    try {
      await get().connect(opts.host, opts.port, opts.username, opts.auth)
      emitStatus('已连接')
      return { ok: true }
    } catch (e) {
      emitStatus('连接失败: ' + e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('bot:disconnect', () => { get().disconnect(); return { ok: true } })
  ipcMain.handle('bot:status', () => get().getStatus())
  ipcMain.handle('bot:exec', async (_, action) => get().execAction(action))
  ipcMain.handle('bot:chat', (_, msg) => { get().chat(msg); return { ok: true } })

  ipcMain.handle('bot:config:get', () => get().getConfig())
  ipcMain.handle('bot:config:set', (_, kv) => {
    for (const key in kv) get().setConfig(key, kv[key])
    return { ok: true }
  })
  ipcMain.handle('bot:config:reset', () => { if (instance) instance.setConfig(null); return { ok: true } })

  ipcMain.handle('bot:mode:set', (_, mode) => {
    const { brain } = get()
    if (brain) { brain.setMode(mode); if (mode === 'idle') brain.pause(); else brain.resume() }
    return { ok: true }
  })

  apiConfig.load()
  ipcMain.handle('bot:api:get', () => apiConfig.get())
  ipcMain.handle('bot:api:presets', () => ({ presets: apiConfig.PRESETS, labels: apiConfig.PROVIDER_LABELS }))
  ipcMain.handle('bot:api:save', (_, cfg) => {
    if (cfg.providers) apiConfig.setProviders(cfg.providers)
    if (cfg.selectedProviderId) apiConfig.setSelected(cfg.selectedProviderId)
    if (cfg.systemPrompt !== undefined) apiConfig.setSystemPrompt(cfg.systemPrompt)
    return { ok: true }
  })
  ipcMain.handle('bot:api:test', async (_, provider) => {
    return await apiClient.testConnection(provider)
  })
  ipcMain.handle('bot:api:chat', async (event, userMessage) => {
    const bot = get()
    const streamCb = (chunk) => { try { win?.webContents.send('bot:chat:stream', chunk) } catch {} }
    return await bot.aiChat.sendMessageAndReplyToGame(userMessage, streamCb)
  })
  ipcMain.handle('bot:chat:clear', () => { get().aiChatClear(); return { ok: true } })
  ipcMain.handle('bot:chat:history', () => get().aiChatGetHistory())

  // ── Personality ──
  ipcMain.handle('bot:personality:get', () => ({
    current: currentPersonality,
    list: Object.keys(PERSONALITIES),
    prompt: PERSONALITIES[currentPersonality].prompt,
  }))
  ipcMain.handle('bot:personality:set', (_, name) => {
    if (PERSONALITIES[name]) {
      currentPersonality = name
      get().aiChat.setPersonalityPrompt(PERSONALITIES[name].prompt)
      return { ok: true, name }
    }
    return { ok: false, error: '未知性格' }
  })

  // ── Summon / Dismiss ──
  ipcMain.handle('bot:summon', async (_, opts) => {
    const b = get()
    if (b.getStatus().loginComplete) {
      emitDebug('[召唤] AI伴侣已在线')
      return { ok: true, message: 'AI伴侣已在游戏中' }
    }
    try {
      await b.connect(opts.host, opts.port, opts.username, opts.auth)
      emitDebug('[召唤] AI伴侣已进入世界')
      return { ok: true, message: 'AI伴侣已召唤' }
    } catch (e) {
      emitDebug('[召唤] 失败: ' + e.message)
      return { ok: false, error: e.message }
    }
  })
  ipcMain.handle('bot:dismiss', () => {
    const b = get()
    b.disconnect()
    emitDebug('[解散] AI伴侣已离线')
    return { ok: true, message: 'AI伴侣已解散' }
  })

  // ── State Persistence ──
  const path = require('path')
  const fs = require('fs')
  const STATE_PATH = path.join(require('electron').app.getPath('userData'), 'ai-companion-state.json')
  ipcMain.handle('bot:state:save', () => {
    try {
      const b = get()
      const brain = b.brain
      const state = {
        timestamp: Date.now(),
        personality: currentPersonality,
        position: brain?.bot?.entity?.position ? { x: brain.bot.entity.position.x, y: brain.bot.entity.position.y, z: brain.bot.entity.position.z } : null,
        inventory: brain?.bot?.inventory?.items()?.map(i => ({ name: i.name, count: i.count, slot: i.slot })) || [],
        health: brain?.bot?.health,
        food: brain?.bot?.food,
        dimension: brain?.bot?.game?.dimension,
      }
      fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
      return { ok: true }
    } catch (e) { return { ok: false, error: e.message } }
  })
  ipcMain.handle('bot:state:load', () => {
    try {
      if (fs.existsSync(STATE_PATH)) return { ok: true, state: JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) }
      return { ok: true, state: null }
    } catch (e) { return { ok: false, error: e.message } }
  })

}

module.exports = { register, get }
