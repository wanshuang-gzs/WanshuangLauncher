const EventEmitter = require('events')
const WebSocket = require('ws')

const BASE_URL = 'https://api.sgroup.qq.com'
const SANDBOX_URL = 'https://sandbox.api.sgroup.qq.com'

class QQChannel extends EventEmitter {
  constructor(manager) {
    super()
    this.manager = manager
    this.ws = null
    this.token = null
    this._intents = 0
    this._seq = 0
    this._heartbeatTimer = null
    this._reconnectTimer = null
    this._reconnectAttempts = 0
    this._maxReconnect = 5
    this._expectedClose = false
    this._enabled = false
    this._connected = false
    this.appId = ''
    this.appSecret = ''
    this.sandbox = false
  }

  isEnabled() { return this._enabled }
  isConnected() { return this._connected }

  setEnabled(on) {
    this._enabled = on
    if (on) { this._reconnectAttempts = 0; this._start() }
    else { this._stop() }
  }

  setConfig(appId, appSecret, sandbox) {
    this.appId = appId
    this.appSecret = appSecret
    this.sandbox = sandbox || false
    if (this._enabled) { this._stop(); this._start() }
  }

  async _start() {
    if (!this.appId || !this.appSecret) {
      this.emit('log', 'QQ 机器人：未配置 AppID 和 AppSecret')
      return
    }
    try {
      await this._getToken()
      await this._connectGateway()
    } catch (e) {
      this.emit('log', `QQ 机器人启动失败: ${e.message}`)
    }
  }

  _stop() {
    this._expectedClose = true
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null }
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null }
    if (this.ws) { try { this.ws.close() } catch {}; this.ws = null }
    this._connected = false
    this.emit('status', { connected: false })
    this.emit('log', 'QQ 机器人已断开')
  }

  async _getToken() {
    const base = this.sandbox ? SANDBOX_URL : BASE_URL
    const url = `${base}/v2/apps/${this.appId}/token`
    this.emit('log', 'QQ 机器人：获取 token...')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: this.appId, clientSecret: this.appSecret }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`获取 token 失败 HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    this.token = data.access_token
    this._intents = (1 << 10) | (1 << 28)
    this.emit('log', 'QQ 机器人：token 获取成功')
  }

  async _connectGateway() {
    const base = this.sandbox ? SANDBOX_URL : BASE_URL
    const url = `${base}/gateway/bot`
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${this.appId}.${this.token}` },
    })
    if (!res.ok) throw new Error(`获取网关失败 HTTP ${res.status}`)
    const data = await res.json()
    const wsUrl = data.url
    if (!wsUrl) throw new Error('网关地址为空')

    this.emit('log', `QQ 机器人：连接网关...`)
    this.ws = new WebSocket(wsUrl)
    this.ws.on('open', () => this._onWsOpen())
    this.ws.on('message', (d) => this._onWsMessage(d))
    this.ws.on('close', (c) => this._onWsClose(c))
    this.ws.on('error', (e) => this.emit('log', `QQ WS 错误: ${e.message}`))
  }

  _onWsOpen() {
    this.emit('log', 'QQ 机器人：WebSocket 已连接')
    this._expectedClose = false
  }

  _onWsMessage(data) {
    try {
      const payload = JSON.parse(data.toString())
      const { op, t: type, s: seq, d: d2 } = payload

      if (seq) this._seq = seq

      switch (op) {
        case 10: // Hello
          this._startHeartbeat(d2.heartbeat_interval)
          this._identify()
          break
        case 0: // Dispatch
          if (type === 'READY') {
            this._connected = true
            this._reconnectAttempts = 0
            this.emit('status', { connected: true })
            this.emit('log', `QQ 机器人：已就绪 (${d2.user?.username || ''})`)
          } else if (type === 'C2C_MESSAGE_CREATE') {
            this._onPrivateMsg(d2)
          } else if (type === 'AT_MESSAGE_CREATE') {
            this._onPrivateMsg(d2)
          }
          break
        case 7: // Reconnect
          this.emit('log', 'QQ 机器人：要求重连')
          this._reconnect()
          break
        case 9: // Invalid Session
          this.emit('log', 'QQ 机器人：会话失效')
          this._reconnect()
          break
      }
    } catch {}
  }

  _onWsClose(code) {
    this._connected = false
    this.emit('status', { connected: false })
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null }
    this.ws = null
    if (!this._expectedClose) {
      this.emit('log', `QQ 机器人：连接断开 (${code})，重连中...`)
      this._reconnect()
    }
  }

  _identify() {
    if (!this.ws) return
    const payload = {
      op: 2,
      d: {
        token: `Bot ${this.appId}.${this.token}`,
        intents: this._intents,
        shard: [0, 1],
        properties: { $os: 'windows', $device: 'launcher', $app: 'wanshuang' },
      },
    }
    try { this.ws.send(JSON.stringify(payload)) } catch {}
  }

  _startHeartbeat(interval) {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer)
    this._heartbeatTimer = setInterval(() => {
      if (!this.ws) return
      try { this.ws.send(JSON.stringify({ op: 1, d: this._seq })) } catch {}
    }, interval)
  }

  _reconnect() {
    if (this._reconnectAttempts >= this._maxReconnect) {
      this.emit('log', `QQ 机器人：重连${this._maxReconnect}次失败，停止`)
      return
    }
    this._reconnectAttempts++
    const delay = 2000 * this._reconnectAttempts
    this._reconnectTimer = setTimeout(() => {
      if (this.ws) { try { this.ws.close() } catch {}; this.ws = null }
      this._start()
    }, delay)
  }

  async _onPrivateMsg(msg) {
    const userId = msg.author?.id || msg.user?.id
    const content = msg.content || ''
    const clean = content.replace(/<[^>]+>/g, '').trim()
    if (!clean) return

    this.emit('log', `[QQ私聊] ${userId}: ${clean}`)

    const aiChat = this.manager?.aiChat
    if (!aiChat) return

    try {
      const result = await aiChat.sendMessage(clean)
      if (result.error) {
        this._sendMsg(userId, `AI 出错了: ${result.error}`)
        return
      }
      if (result.text) this._sendMsg(userId, result.text)
      if (result.actions && result.actions.length > 0) {
        for (const a of result.actions) {
          if (this.manager) this.manager._executeCommand(a.cmd, a.args, String(userId))
        }
        const desc = result.actions.map(a => `!${a.cmd} ${a.args.join(' ')}`).join(', ')
        this._sendMsg(userId, `已执行: ${desc}`)
      }
    } catch (e) {
      this._sendMsg(userId, `处理失败: ${e.message}`)
    }
  }

  async _sendMsg(userId, message) {
    const base = this.sandbox ? SANDBOX_URL : BASE_URL
    const url = `${base}/users/${userId}/messages`
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${this.appId}.${this.token}`,
        },
        body: JSON.stringify({ content: message, msg_type: 0 }),
      })
    } catch {}
  }

  destroy() {
    this._expectedClose = true
    this._enabled = false
    this._stop()
  }
}

module.exports = QQChannel