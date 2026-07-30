const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const collectBlock = require('mineflayer-collectblock').plugin
const pvp = require('mineflayer-pvp').plugin
const net = require('net')
const mcp = require('minecraft-protocol')
const BotBrain = require('./brain')
const BotActions = require('./actions')
const AIChat = require('./ai-chat')
const Config = require('./config')
const { exec } = require('child_process')
const fs = require('fs')
const pathModule = require('path')

class BotManager {
  constructor() {
    this.bot = null
    this.brain = null
    this.aiChat = new AIChat(this)
    this.actions = null
    this.connected = false
    this.statusCb = null
    this.progressCb = null
    this.debugCb = null
    this._resolved = false
    this._disconnecting = false
    this._tcpConnected = false
    this._loginComplete = false
    this._handshakeTimer = null
    this._currentTask = null
    this._chatDedup = new Map()
    this._taskTimeout = null
    this._defending = false
  }

  onStatus(cb) { this.statusCb = cb }
  onProgress(cb) { this.progressCb = cb }
  onDebug(cb) { this.debugCb = cb }

  _emit(msg) { if (this.statusCb) this.statusCb(msg) }
  _debug(msg) { if (this.debugCb) this.debugCb(msg); console.log(msg) }

  _emitProgress(type, current, total, desc) {
    if (this.progressCb) this.progressCb({ type, current, total, desc })
  }

  _hookPacketLog(client) {
    if (!client) return
    client.on('state', (newState, oldState) => this._debug(`[状态] ${oldState} → ${newState}`))
    client.on('error', (e) => this._debug(`[错误] ${e?.message || e}`))
    client.on('end', (reason) => this._debug(`[断开] ${reason || 'unknown'}`))
  }

  _isUnsupportedVersion(version) {
    if (!version) return false
    const base = version.split('-')[0].split('_')[0]
    return /^26/.test(base)
  }

  startTask(name, timeoutMs = 60000) {
    this.stopTask()
    this._currentTask = name
    if (this.bot && this._loginComplete) this._debug(`[任务] 开始: ${name}`)
    if (timeoutMs > 0) {
      this._taskTimeout = setTimeout(() => {
        if (this._currentTask === name) {
          this.stopTask()
          if (this.bot && this._loginComplete) this.bot.chat(`任务 ${name} 执行超时，已自动停止`)
        }
      }, timeoutMs)
    }
  }

  stopTask() {
    this._currentTask = null
    if (this._taskTimeout) { clearTimeout(this._taskTimeout); this._taskTimeout = null }
    if (this.brain) this.brain.stopAll()
    if (this.bot) {
      try { this.bot.pathfinder.stop() } catch {}
      try { this.bot.pvp.stop() } catch {}
    }
  }

  _setupChatHandler() {
    if (!this.bot) return
    this.bot._client?.on('playerChat', (data) => {
      try {
        const senderName = data.senderName
          ? (() => { try { return JSON.parse(data.senderName)?.text || data.senderName } catch { return data.senderName } })()
          : data.sender
        const message = data.plainMessage || data.formattedMessage
        if (!message || senderName === this.bot.username) return
        this._onChatMessage(senderName, message)
      } catch (e) { this._debug(`[聊天] 解析错误: ${e.message}`) }
    })
    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return
      this._onChatMessage(username, message)
    })
    this.bot.on('whisper', (username, message) => {
      if (username === this.bot.username) return
      this._debug(`[私聊] <${username}> ${message}`)
      this._emit(`[私聊] <${username}> ${message}`)
    })
  }

  _isDuplicate(username, message) {
    const key = `${username}|${message}`
    const now = Date.now()
    if (this._chatDedup.has(key) && now - this._chatDedup.get(key) < 2000) return true
    this._chatDedup.set(key, now)
    if (this._chatDedup.size > 50) {
      const oldest = [...this._chatDedup.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10)
      oldest.forEach(([k]) => this._chatDedup.delete(k))
    }
    return false
  }

  _onChatMessage(username, message) {
    if (!username || !message) return
    if (this._isDuplicate(username, message)) return
    this._debug(`[聊天] <${username}> ${message}`)
    this._emit(`[聊天] <${username}> ${message}`)
    const trimmed = message.trim()

    if (/^跟(着|随)?我/.test(trimmed.toLowerCase())) {
      this._executeCommand('follow', [username], username)
      return
    }

    if (trimmed.startsWith('!')) {
      const parts = trimmed.slice(1).split(/\s+/)
      this._executeCommand(parts[0].toLowerCase(), parts.slice(1), username)
      return
    }

    if (this.aiChat && require('./api-config').getActiveProvider()) {
      this._debug(`[AI] 请求 AI 模型...`)
      this.aiChat.sendMessage(trimmed).then(result => {
        if (result.error) { this._debug(`[AI] 错误: ${result.error}`); return }
        if (result.text && this.bot && this._loginComplete) this.bot.chat(result.text)
        if (result.actions) {
          for (const a of result.actions) {
            this._executeCommand(a.cmd, a.args, username)
          }
        }
      }).catch(e => this._debug(`[AI] 异常: ${e.message}`))
    }
  }

  _executeCommand(cmd, args, username) {
    this._debug(`[命令] ${cmd} ${args.join(' ')}`)
    const say = (msg) => { if (this.bot && this._loginComplete) this.bot.chat(msg) }

    switch (cmd) {
      case 'mine': {
        const blockId = args[0]; const count = parseInt(args[1]) || 0
        if (!blockId) { say('请指定方块ID，例如: !mine oak_log 10'); return }
        this.startTask('mine', 120000)
        this.brain?.startMining(blockId, () => this.stopTask(), count)
        break
      }
      case 'follow': {
        const targetName = args[0] || username
        const player = this.bot?.players[targetName]
        if (!player?.entity) { say('找不到你'); return }
        this.startTask('follow', 0)
        this.brain?.startFollow(targetName)
        say(`已跟随 ${targetName}`)
        break
      }
      case 'stay': {
        this.stopTask()
        this._defending = false
        say('原地待命中')
        break
      }
      case 'stop': {
        this.stopTask()
        this._defending = false
        say('已停止所有任务')
        break
      }
      case 'come': {
        this.startTask('come')
        this.brain?.startFollow(username)
        say('我过来了！')
        break
      }
      case 'goto': {
        const x = parseFloat(args[0]); const z = parseFloat(args[1])
        if (isNaN(x) || isNaN(z)) { say('格式: !goto x z'); return }
        this.startTask('goto')
        this.bot.pathfinder.setGoal(new (require('mineflayer-pathfinder').goals.GoalNear)(x, this.bot.entity.position.y, z, 2))
        this.stopTask()
        say(`前往 (${x}, ${z})`)
        break
      }
      case 'find': {
        const target = args[0]
        if (target === 'village') {
          this.startTask('find_village', 120000)
          this.brain?.startFindVillage(() => this.stopTask())
          say('开始搜寻村庄')
        } else { say(`未知: ${target}`) }
        break
      }
      case 'build': {
        const blueprint = args[0]
        if (blueprint === 'small_house' || blueprint === 'warehouse') {
          this.startTask(`build_${blueprint}`, 180000)
          this.brain?.startBuilding(blueprint, () => this.stopTask())
          say(`开始建造${blueprint === 'small_house' ? '小屋' : '仓库'}`)
        } else { say(`未知蓝图: ${blueprint}`) }
        break
      }
      case 'attack': {
        const mobName = args.join(' ')
        this.startTask('attack')
        this.brain?.startAttacking(() => this.stopTask(), mobName)
        say(`开始猎杀${mobName || '敌对生物'}`)
        break
      }
      case 'defend': {
        this._defending = true
        say('自动防御已开启，我来保护你！')
        this._startDefenseLoop()
        break
      }
      case 'inventory': {
        if (args[0] === 'check') {
          if (!this.bot?.inventory) { say('无法查看背包'); return }
          const items = this.bot.inventory.items().map(i => `${i.name}x${i.count}`).join(', ') || '空的'
          say(`背包: ${items}`)
        } else { say('用法: !inventory check') }
        break
      }
      case 'deposit': {
        if (args[0] === 'chest') {
          this.startTask('deposit', 30000)
          this.brain?.startDepositChest(() => this.stopTask())
          say('正在寻找附近箱子...')
        } else { say('用法: !deposit chest') }
        break
      }
      case 'summon': {
        this._emit('[系统] AI伴侣已在线')
        say('我就在这儿呢！')
        break
      }
      case 'dismiss': {
        this._emit('[系统] AI伴侣离线')
        this.disconnect()
        break
      }
      case 'status': {
        if (!this.brain) { say('机器人未就绪'); break }
        const s = this.brain.getStatus()
        const pos = s.position ? `(${s.pos.x},${s.position.y},${s.position.z})` : '未知'
        const taskStr = this._currentTask ? ` 任务:${this._currentTask}` : ''
        const followStr = s.followTarget ? ` 跟随:${s.followTarget}` : ''
        const held = this.bot?.heldItem?.name || '空手'
        const defStr = this._defending ? ' [防御中]' : ''
        say(`血量:${s.health??'?'} 饱食:${s.food??'?'} 位置:${pos} 手持:${held}${taskStr}${followStr}${defStr}`)
        break
      }

      // ── 系统指令 ──
      case 'shell': {
        const command = args.join(' ')
        if (!command) { this._emit('[系统] 请输入命令'); break }
        exec(command, { timeout: 15000, windowsHide: true }, (err, stdout, stderr) => {
          if (err) { this._emit(`[系统] 失败: ${err.message.slice(0,200)}`); return }
          const out = stdout.trim().slice(0, 500)
          if (out) this._emit(`[系统] ${out}`)
          if (stderr.trim()) this._emit(`[系统] ${stderr.trim().slice(0,200)}`)
        })
        break
      }
      case 'open': {
        const target = args.join(' ')
        if (!target) { this._emit('[系统] 请输入路径'); break }
        exec(`start "" "${target}"`, { windowsHide: true }, (err) => {
          if (err) this._emit(`[系统] 打开失败: ${err.message}`)
        })
        break
      }
      case 'workspace': {
        const name = args[0] || 'my-workspace'
        const wsPath = pathModule.join(process.cwd(), name)
        try {
          fs.mkdirSync(pathModule.join(wsPath, 'src'), { recursive: true })
          fs.mkdirSync(pathModule.join(wsPath, 'docs'), { recursive: true })
          fs.writeFileSync(pathModule.join(wsPath, 'README.md'), `# ${name}\n\nAuto-generated workspace\n`, 'utf8')
          this._emit(`[系统] ✅ 已创建: ${wsPath}\n  src/ docs/ README.md`)
        } catch (e) { this._emit(`[系统] 创建失败: ${e.message}`) }
        break
      }
      case 'screenshot': {
        const outPath = pathModule.join(process.cwd(), `screenshot-${Date.now()}.png`)
        exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $s=[Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object Drawing.Bitmap $s.Width,$s.Height; $g=[Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($s.X,$s.Y,0,0,$s.Size); $bmp.Save('${outPath}'); $g.Dispose(); $bmp.Dispose()"`, { timeout: 10000 }, (err) => {
          if (err) this._emit(`[系统] 截图失败: ${err.message}`)
          else this._emit(`[系统] ✅ 已保存: ${outPath}`)
        })
        break
      }
      default:
        this._emit(`[命令] 未知: ${cmd}`)
    }
  }

  _startDefenseLoop() {
    if (!this._defending || !this.bot) return
    const mob = this.bot.nearestEntity(e =>
      e.type === 'mob' && e.position?.distanceTo(this.bot.entity.position) < 10 && this._isHostile(e)
    )
    if (mob) {
      this.bot.pvp.attack(mob)
      this._debug(`[防御] 攻击 ${mob.name || mob.type}`)
    }
    setTimeout(() => this._startDefenseLoop(), 1500)
  }

  _isHostile(e) {
    const hostiles = new Set([
      'zombie','skeleton','creeper','spider','enderman','witch','phantom',
      'drowned','husk','stray','cave_spider','slime','blaze','ghast','hoglin',
      'piglin','piglin_brute','zombified_piglin','zoglin','evoker','vindicator',
      'pillager','ravager','vex','warden','breeze','bogged','creaking'
    ])
    return hostiles.has(e.name || e.username)
  }

  async connect(host, port, username, auth) {
    if (this.bot) this.disconnect()
    this._resolved = false; this._tcpConnected = false; this._loginComplete = false; this._defending = false
    Config.reset()

    const addr = host || 'localhost'; const prt = port || 25565; const name = username || 'AI_Teammate'
    this._debug(`[连接] ${addr}:${prt} 用户名=${name}`)

    const portOpen = await this._checkPort(addr, prt)
    if (!portOpen) {
      const err = `端口 ${addr}:${prt} 无响应`
      this._emit('[错误] ' + err); return Promise.reject(new Error(err))
    }

    try {
      const pingResult = await mcp.ping({ host: addr, port: prt })
      const serverVersion = pingResult?.version?.name
      if (serverVersion && this._isUnsupportedVersion(serverVersion)) {
        const err = `AI 队友暂不支持 ${serverVersion} 版本`
        this._emit('[版本限制] ' + err); return Promise.reject(new Error(err))
      }
    } catch { this._debug('[版本] ping 跳过') }

    return new Promise((resolve, reject) => {
      try {
        this.bot = mineflayer.createBot({
          host: addr, port: prt, username: name, auth: auth || 'offline', plugins: {},
        })
        if (!this.bot || !this.bot._client) { reject(new Error('实例启动失败')); return }

        this.bot.loadPlugin(pathfinder)
        this.bot.loadPlugin(collectBlock)
        this.bot.loadPlugin(pvp)

        this.bot.on('connect', () => {
          this._tcpConnected = true
          this._emit('[TCP] 通道已连通')
          this._handshakeTimer = setTimeout(() => {
            if (!this._loginComplete) {
              const err = '握手超时(30s)'
              this._emit('[错误] ' + err); this.cleanup()
              if (!this._resolved) { this._resolved = true; reject(new Error(err)) }
            }
          }, 30000)
        })
        this.bot.on('login', () => {
          this._loginComplete = true
          if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
          this._emit('[MC] 协议握手成功')
          this.connected = true
        })
        this.bot.on('spawn', () => {
          this._resolved = true
          if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
          const mcData = require('minecraft-data')(this.bot.version)
          this.bot.pathfinder.setMovements(new Movements(this.bot, mcData))
          this.brain = new BotBrain(this.bot)
          this.brain.on('status', msg => this._emit(msg))
          this.brain.startLiving()
          this.actions = new BotActions(this.bot)
          resolve(true)
        })
        this.bot.on('kicked', r => {
          const reason = typeof r === 'string' ? r : (r?.reason || JSON.stringify(r))
          this._emit('[断开] 被踢: ' + reason); this.cleanup()
          if (!this._resolved) { this._resolved = true; reject(new Error('被踢: ' + reason)) }
        })
        this.bot.on('end', (reason) => {
          const why = typeof reason === 'string' ? reason : '连接关闭'
          if (!this._tcpConnected) this._emit('[错误] TCP 连接失败')
          else if (!this._loginComplete) this._emit('[错误] 协议握手失败')
          else this._emit('[断开] ' + why)
          this.cleanup()
          if (!this._resolved) { this._resolved = true; reject(new Error(why)) }
        })
        this.bot.on('error', e => {
          const msg = e?.message || String(e)
          const tag = !this._tcpConnected ? '[错误] TCP' : (!this._loginComplete ? '[错误] 协议' : '[错误]')
          this._emit(tag + ': ' + msg)
          if (!this._resolved) { this._resolved = true; reject(new Error(msg)) }
        })
        this._setupChatHandler()
        this.bot.on('death', () => this._emit('[游戏] 死亡'))
        this.bot.on('respawn', () => this._emit('[游戏] 重生'))
        this.bot.on('entityHurt', (e) => {
          if (this._defending && e === this.bot.entity) {
            const attacker = this.bot.nearestEntity(ent =>
              ent.type === 'mob' && ent.position?.distanceTo(this.bot.entity.position) < 12
            )
            if (attacker) {
              this.bot.pvp.attack(attacker)
              this._debug('[防御] 反击攻击者')
            }
          }
        })

        setTimeout(() => {
          if (!this._resolved && !this.connected) {
            this._resolved = true; reject(new Error('连接超时(30s)'))
          }
        }, 30000)
      } catch (e) { this._debug('[异常] ' + (e?.message || e)); reject(e) }
    })
  }

  disconnect() {
    if (this._disconnecting) return
    this._disconnecting = true
    this._defending = false
    this.stopTask()
    if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
    if (this.brain) { this.brain.stop(); this.brain = null }
    if (this.bot) { this.bot.end(); this.bot = null }
    this.cleanup(); this._emit('[断开] 已断开')
    this._disconnecting = false
  }

  cleanup() {
    this.connected = false; this._tcpConnected = false; this._loginComplete = false; this._defending = false
    this.stopTask()
    if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
    if (this.brain) { this.brain.stop(); this.brain = null }
  }

  chat(msg) { if (this.bot && this._loginComplete) this.bot.chat(msg) }

  async execAction(action) {
    if (this.actions) return await this.actions.exec(action)
    return { error: 'bot 未就绪' }
  }

  aiChatClear() { this.aiChat?.clearHistory() }
  aiChatGetHistory() { return this.aiChat?.getHistory() || [] }

  getConfig() { return Config.get() }
  setConfig(key, value) { Config.set(key, value); return { ok: true } }
  getStatus() {
    return {
      connected: this._loginComplete, tcpConnected: this._tcpConnected,
      loginComplete: this._loginComplete, currentTask: this._currentTask,
      defending: this._defending,
    }
  }

  async _checkPort(host, port) {
    return new Promise((resolve) => {
      const sock = new net.Socket()
      sock.setTimeout(2000)
      sock.on('connect', () => { sock.destroy(); resolve(true) })
      sock.on('error', () => { sock.destroy(); resolve(false) })
      sock.on('timeout', () => { sock.destroy(); resolve(false) })
      sock.connect(port, host)
    })
  }
}

module.exports = BotManager
