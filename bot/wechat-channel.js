const EventEmitter = require('events')
const https = require('https')
const http = require('http')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const QRCode = require('qrcode')

const ILINK_BASE = 'https://ilinkai.weixin.qq.com'

class WeChatChannel extends EventEmitter {
  constructor(manager) {
    super()
    this.manager = manager
    this._enabled = false
    this._connected = false
    this._expectedClose = false
    this.bridgeProcess = null
    this._buf = ''
    this.uuid = ''
  }

  isEnabled() { return this._enabled }
  isConnected() { return this._connected }

  setEnabled(on) {
    this._enabled = on
    if (on) this._start()
    else this._stop()
  }

  _start() {
    this._expectedClose = false
    this._startBridgeProcess()
  }

  _stop() {
    this._expectedClose = true
    this._connected = false
    if (this.bridgeProcess && !this.bridgeProcess.killed) {
      try { this.bridgeProcess.kill() } catch {}
      this.bridgeProcess = null
    }
    this.emit('status', { connected: false })
    this.emit('log', '微信已断开')
  }

  _startBridgeProcess() {
    const bridgeJs = this._generateBridgeScript()
    const tmpFile = path.join(require('electron')?.app?.getPath('userData') || __dirname, 'wx-bridge.tmp.js')

    try { fs.writeFileSync(tmpFile, bridgeJs, 'utf8') } catch (e) {
      this.emit('log', `桥接脚本写入失败: ${e.message}`)
      return
    }

    this.emit('log', '微信 ClawBot 桥接启动中...')

    this.bridgeProcess = spawn('node', [tmpFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    this.bridgeProcess.stdin.on('error', () => {})

    this.bridgeProcess.stdout.on('data', (d) => {
      this._buf += d.toString()
      const lines = this._buf.split('\n')
      this._buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        if (line.startsWith('QR:')) {
          const qrContent = line.slice(3).trim()
          this.emit('log', '正在生成二维码...')
          QRCode.toDataURL(qrContent, { width: 250, margin: 2 }).then(dataUrl => {
            this.emit('qrcode', dataUrl)
            this.emit('log', '微信二维码已生成，请用手机扫码 (有效期5分钟)')
          }).catch(e => this.emit('log', `二维码生成失败: ${e.message}`))
        } else if (line.startsWith('JSON:')) {
          try {
            const msg = JSON.parse(line.slice(5))
            this._handleBridgeMsg(msg)
          } catch {}
        } else if (line.startsWith('LOG:')) {
          this.emit('log', `[桥接] ${line.slice(4)}`)
        } else if (line.startsWith('ERR:')) {
          this.emit('log', `[桥接] ${line.slice(4)}`)
        }
      }
    })

    this.bridgeProcess.stderr.on('data', (d) => {
      this.emit('log', `[桥接] ${d.toString().trim()}`)
    })

    this.bridgeProcess.on('exit', (code) => {
      this.emit('log', `桥接进程退出 (${code})`)
      this.bridgeProcess = null
      if (!this._expectedClose) {
        this._connected = false
        this.emit('status', { connected: false })
        this.emit('log', '10秒后自动重连...')
        setTimeout(() => { if (this._enabled && !this._expectedClose) this._startBridgeProcess() }, 10000)
      }
    })

    this.bridgeProcess.on('error', (e) => {
      this.emit('log', `桥接启动失败: ${e.message}`)
      this.bridgeProcess = null
      if (!this._expectedClose) {
        this.emit('log', '10秒后自动重连...')
        setTimeout(() => { if (this._enabled && !this._expectedClose) this._startBridgeProcess() }, 10000)
      }
    })
  }

  _handleBridgeMsg(msg) {
    if (msg.type === 'ready') {
      this._connected = true
      this.emit('status', { connected: true, user: msg.user || '' })
      this.emit('log', `微信已登录${msg.user ? ` (${msg.user})` : ''}`)
    } else if (msg.type === 'message') {
      this._onMessage(msg)
    } else if (msg.type === 'error') {
      this.emit('log', `[微信] ${msg.text}`)
    }
  }

  async _onMessage(msg) {
    const { from, text, contextToken } = msg
    if (!text) return
    this.emit('log', `[微信私聊] ${from || '未知'}: ${text}`)
    if (!this.manager?.aiChat) return

    try {
      const result = await this.manager.aiChat.sendMessage(text)
      if (result.error) { this._sendMsg(from, `AI 出错了: ${result.error}`, contextToken); return }
      if (result.text) this._sendMsg(from, result.text, contextToken)
      if (result.actions && result.actions.length > 0) {
        for (const a of result.actions) {
          if (this.manager) this.manager._executeCommand(a.cmd, a.args, from)
        }
        const desc = result.actions.map(a => `!${a.cmd} ${a.args.join(' ')}`).join(', ')
        this._sendMsg(from, `已执行: ${desc}`, contextToken)
      }
    } catch (e) {
      this._sendMsg(from, `处理失败: ${e.message}`, contextToken)
    }
  }

  _sendMsg(to, message, contextToken) {
    if (this.bridgeProcess && this.bridgeProcess.stdin.writable) {
      try {
        this.bridgeProcess.stdin.write(JSON.stringify({ type: 'send', to, text: message, contextToken }) + '\n')
      } catch {}
    }
  }

  _generateBridgeScript() {
    return `
const https = require('https');
const http = require('http');
const BASE = '${ILINK_BASE}';
let botToken = '';
let wxData = {};
let pollTimer = null;
let failCount = 0;
let msgLoopRunning = false;

function pfx(tag, msg) { console.log(tag + msg); }
function out(msg) { console.log('JSON:' + JSON.stringify(msg)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function post(url, body) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = mod.request(opts, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function startLogin() {
  try {
    const raw = await get(BASE + '/ilink/bot/get_bot_qrcode?bot_type=3&_=' + Date.now());
    let data;
    try { data = JSON.parse(raw); } catch { pfx('ERR:', '获取二维码失败: ' + raw.slice(0, 200)); return; }
    if (!data.qrcode_img_content) { pfx('ERR:', '二维码数据异常: ' + JSON.stringify(data).slice(0, 200)); return; }
    pfx('QR:', data.qrcode_img_content);
    wxData.qrcodeKey = data.qrcode;
    pfx('LOG:', '二维码已获取，等待扫码...');
    pollStatus();
  } catch (e) { pfx('ERR:', '获取二维码失败: ' + e.message); }
}

async function pollStatus() {
  const key = wxData.qrcodeKey;
  if (!key) { pfx('ERR:', '无二维码key'); return; }
  let retries = 150;
  while (retries-- > 0) {
    await sleep(2000);
    try {
      const raw = await get(BASE + '/ilink/bot/get_qrcode_status?qrcode=' + encodeURIComponent(key) + '&_=' + Date.now());
      let data;
      try { data = JSON.parse(raw); } catch { continue; }
      if (data.status === 1) { pfx('LOG:', '已扫码，确认中...'); }
      if (data.status === 2) {
        pfx('LOG:', '登录成功');
        botToken = data.bot_token || data.token || '';
        if (!botToken) { pfx('ERR:', '未获取到bot_token'); return; }
        wxData.botToken = botToken;
        if (data.nickname) wxData.nick = data.nickname;
        out({ type: 'ready', user: wxData.nick || 'WeChat' });
        startMsgLoop();
        return;
      }
    } catch {}
  }
  pfx('ERR:', '二维码已过期，请重新生成');
}

async function startMsgLoop() {
  if (msgLoopRunning) return;
  msgLoopRunning = true;
  let lastUpdateId = 0;
  failCount = 0;
  const loop = async () => {
    try {
      const body = JSON.stringify({ bot_token: wxData.botToken, last_update_id: lastUpdateId, timeout: 30 });
      const res = await post(BASE + '/ilink/bot/getupdates', body);
      if (res) {
        failCount = 0;
        if (res.messages) {
          for (const msg of res.messages) {
            if (msg.update_id) lastUpdateId = msg.update_id;
            if (msg.msg_type === 1 && msg.content) {
              out({ type: 'message', from: msg.from_user || msg.from, text: msg.content, contextToken: msg.context_token || '' });
            }
          }
        }
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
    if (failCount >= 10) {
      pfx('LOG:', '连接不稳定，尝试重新登录...');
      msgLoopRunning = false;
      setTimeout(startLogin, 3000);
      return;
    }
    setTimeout(loop, 1000);
  };
  loop();
}

async function sendMsg(to, text, contextToken) {
  if (!wxData.botToken) return;
  try {
    await post(BASE + '/ilink/bot/sendmessage', JSON.stringify({
      bot_token: wxData.botToken,
      to_user: to,
      content: text,
      context_token: contextToken || '',
    }));
  } catch {}
}

const stdin = process.stdin;
stdin.setEncoding('utf8');
let stdinBuf = '';
stdin.on('data', (chunk) => {
  stdinBuf += chunk;
  const lines = stdinBuf.split('\\n');
  stdinBuf = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'send') sendMsg(msg.to, msg.text, msg.contextToken);
    } catch {}
  }
});

startLogin();
`.trim()
  }

  destroy() { this._expectedClose = true; this._enabled = false; this._stop() }
}

module.exports = WeChatChannel