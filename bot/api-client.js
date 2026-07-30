const https = require('https')
const http = require('http')

function buildMessages(systemPrompt, history) {
  const msgs = []
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt })
  for (const m of history) {
    msgs.push({ role: m.role, content: m.content })
  }
  return msgs
}

async function testConnection(provider) {
  if (!provider || !provider.apiKey) return { ok: false, error: 'API Key 未配置' }
  try {
    if (provider.type === 'claude') {
      return await testClaude(provider)
    }
    return await testOpenAICompatible(provider)
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function testOpenAICompatible(provider) {
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const body = JSON.stringify({ model: provider.model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 })
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
    body,
  }, 15000)
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true, latency: 'ok' }
}

async function testClaude(provider) {
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/messages`
  const body = JSON.stringify({ model: provider.model, max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] })
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' },
    body,
  }, 15000)
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true, latency: 'ok' }
}

async function chat(provider, systemPrompt, history, onStream) {
  if (!provider || !provider.apiKey) throw new Error('API Key 未配置')
  const messages = buildMessages(systemPrompt, history)

  if (provider.type === 'claude') {
    return chatClaude(provider, messages, onStream)
  }
  return chatOpenAICompatible(provider, messages, onStream)
}

async function chatOpenAICompatible(provider, messages, onStream) {
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const body = JSON.stringify({ model: provider.model, messages, stream: !!onStream, max_tokens: 4096 })

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
    body,
  }, 120000)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${provider.type} ${res.status}: ${text.slice(0, 300)}`)
  }

  if (onStream) {
    return streamSSE(res, onStream)
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content || ''
}

async function chatClaude(provider, messages, onStream) {
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/messages`
  const systemMsg = messages.find(m => m.role === 'system')
  const body = JSON.stringify({
    model: provider.model,
    max_tokens: 4096,
    system: systemMsg?.content || '',
    messages: messages.filter(m => m.role !== 'system'),
    stream: !!onStream,
  })

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' },
    body,
  }, 120000)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API Claude ${res.status}: ${text.slice(0, 300)}`)
  }

  if (onStream) {
    return streamSSEClaude(res, onStream)
  }

  const json = await res.json()
  return json.content?.[0]?.text || ''
}

async function streamSSE(res, onStream) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.text || ''
        if (content) {
          full += content
          onStream(content)
        }
      } catch {}
    }
  }
  return full
}

async function streamSSEClaude(res, onStream) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      try {
        const json = JSON.parse(data)
        if (json.type === 'content_block_delta' && json.delta?.text) {
          full += json.delta.text
          onStream(json.delta.text)
        }
      } catch {}
    }
  }
  return full
}

function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const mod = url.startsWith('https') ? https : http
    fetch(url, { ...options, signal: controller.signal })
      .then(res => { clearTimeout(timer); resolve(res) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}

async function chatDirect(provider, messages, onStream) {
  if (!provider || !provider.apiKey) throw new Error('API Key 未配置')
  if (provider.type === 'claude') {
    return chatClaude(provider, messages, onStream)
  }
  return chatOpenAICompatible(provider, messages, onStream)
}

module.exports = { testConnection, chat, chatDirect }
