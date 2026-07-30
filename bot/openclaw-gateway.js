const EventEmitter = require('events')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

class OpenClawGateway extends EventEmitter {
  constructor() {
    super()
    this.process = null
    this._port = 0
    this._running = false
    this._expectedStop = false
    this._healthTimer = null
  }

  get port() { return this._port }
  get running() { return this._running }

  async start() {
    if (this._running) return true
    this._expectedStop = false

    const serverJs = this._generateServer()
    const tmpFile = path.join(require('electron')?.app?.getPath('userData') || __dirname, 'gateway-server.tmp.js')

    try { fs.writeFileSync(tmpFile, serverJs, 'utf8') } catch (e) {
      this.emit('log', `网关脚本写入失败: ${e.message}`)
      return false
    }

    this.emit('log', 'OpenClaw 网关启动中...')

    this.process = spawn('node', [tmpFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, GATEWAY_PORT: '0' },
    })

    this.process.stdout.on('data', (d) => {
      const lines = d.toString().trim().split('\n')
      for (const line of lines) {
        const t = line.trim()
        if (t.startsWith('PORT:')) {
          this._port = parseInt(t.slice(5))
          this._running = true
          this.emit('status', { running: true, port: this._port })
          this.emit('log', `OpenClaw 网关已启动 (端口 ${this._port})`)
          this._startHealthCheck()
        } else if (t.startsWith('LOG:')) {
          this.emit('log', `[网关] ${t.slice(4)}`)
        } else if (t.startsWith('ERR:')) {
          this.emit('log', `[网关] ${t.slice(4)}`)
        }
      }
    })

    this.process.stderr.on('data', (d) => {
      this.emit('log', `[网关] ${d.toString().trim()}`)
    })

    this.process.on('exit', (code) => {
      this._running = false
      this._port = 0
      this._stopHealthCheck()
      this.emit('status', { running: false })
      if (!this._expectedStop) {
        this.emit('log', `网关进程退出 (${code})，5秒后自动重启`)
        setTimeout(() => { if (!this._expectedStop) this.start() }, 5000)
      }
    })

    this.process.on('error', (e) => {
      this.emit('log', `网关启动失败: ${e.message}`)
      this._running = false
    })

    return true
  }

  stop() {
    this._expectedStop = true
    this._running = false
    this._stopHealthCheck()
    if (this.process && !this.process.killed) {
      try { this.process.kill() } catch {}
      this.process = null
    }
    this.emit('log', 'OpenClaw 网关已停止')
    this.emit('status', { running: false })
  }

  _startHealthCheck() {
    this._stopHealthCheck()
    this._healthTimer = setInterval(() => {
      if (!this._running || !this._port) return
      const req = http.get(`http://127.0.0.1:${this._port}/health`, { timeout: 3000 }, (res) => {
        res.resume()
      })
      req.on('error', () => {
        if (this._running) {
          this.emit('log', '网关无响应，尝试重启...')
          this.stop()
          if (!this._expectedStop) setTimeout(() => this.start(), 2000)
        }
      })
      req.end()
    }, 10000)
  }

  _stopHealthCheck() {
    if (this._healthTimer) { clearInterval(this._healthTimer); this._healthTimer = null }
  }

  async sendMessage(channel, userId, text) {
    if (!this._running || !this._port) return null
    return new Promise((resolve) => {
      const body = JSON.stringify({ channel, user_id: userId, text })
      const req = http.request({
        hostname: '127.0.0.1', port: this._port, path: '/message',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(null) } })
      })
      req.on('error', () => resolve(null))
      req.write(body)
      req.end()
    })
  }

  _generateServer() {
    const manager = this
    return `
const http = require('http');
const portEnv = parseInt(process.env.GATEWAY_PORT) || 0;

const server = http.createServer((req, res) => {
  const cors = () => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type') };
  if (req.method === 'OPTIONS') { cors(); res.writeHead(204); res.end(); return }
  cors();

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (req.method === 'POST' && req.url === '/message') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('LOG:收到消息 [' + data.channel + '] <' + data.user_id + '> ' + data.text.slice(0, 60));
        console.log('JSON:' + JSON.stringify({ type: 'message', channel: data.channel, userId: data.user_id, text: data.text }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.log('ERR:JSON解析失败: ' + e.message);
        res.writeHead(400); res.end('bad request');
      }
    });
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(portEnv, '127.0.0.1', () => {
  const port = server.address().port;
  console.log('PORT:' + port);
  console.log('LOG:网关HTTP服务已启动');
});
`.trim()
  }

  destroy() { this.stop() }
}

module.exports = OpenClawGateway