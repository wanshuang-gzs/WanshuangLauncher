const fs = require('fs')
const path = require('path')

let _configPath = null
function getConfigPath() {
  if (!_configPath) {
    try { _configPath = path.join(require('electron').app.getPath('userData'), 'ai-providers.json') } catch { _configPath = path.join(__dirname, 'ai-providers.json') }
  }
  return _configPath
}

const PRESETS = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-405b-instruct' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  baidu: { baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat', model: 'ernie-4.0' },
  aliyun: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
}

const PROVIDER_LABELS = {
  openai: 'OpenAI', deepseek: 'DeepSeek', nvidia: 'NVIDIA NIM', minimax: 'MiniMax',
  claude: 'Claude', siliconflow: 'SiliconFlow', moonshot: 'Moonshot',
  zhipu: '智谱AI', baidu: '百度文心', aliyun: '阿里通义千问',
}

const DEFAULT_PROVIDERS = [
  { id: 'openai-1', name: 'OpenAI', type: 'openai', baseUrl: PRESETS.openai.baseUrl, apiKey: '', model: PRESETS.openai.model, enabled: false },
  { id: 'deepseek-1', name: 'DeepSeek', type: 'deepseek', baseUrl: PRESETS.deepseek.baseUrl, apiKey: '', model: PRESETS.deepseek.model, enabled: false },
  { id: 'siliconflow-1', name: 'SiliconFlow', type: 'siliconflow', baseUrl: PRESETS.siliconflow.baseUrl, apiKey: '', model: PRESETS.siliconflow.model, enabled: false },
  { id: 'claude-1', name: 'Claude', type: 'claude', baseUrl: PRESETS.claude.baseUrl, apiKey: '', model: PRESETS.claude.model, enabled: false },
  { id: 'nvidia-1', name: 'NVIDIA NIM', type: 'nvidia', baseUrl: PRESETS.nvidia.baseUrl, apiKey: '', model: PRESETS.nvidia.model, enabled: false },
]

let config = null

function load() {
  const p = getConfigPath()
  try {
    if (fs.existsSync(p)) {
      config = JSON.parse(fs.readFileSync(p, 'utf8'))
      if (!config.providers) config.providers = DEFAULT_PROVIDERS
    } else {
      config = { providers: DEFAULT_PROVIDERS, selectedProviderId: 'openai-1', systemPrompt: '' }
      save()
    }
  } catch {
    config = { providers: DEFAULT_PROVIDERS, selectedProviderId: 'openai-1', systemPrompt: '' }
    save()
  }
  return config
}

function save() {
  const p = getConfigPath()
  try {
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf8')
  } catch (e) { console.error('[ApiConfig] save error:', e.message) }
}

function get() {
  if (!config) load()
  return config
}

function setProviders(providers) {
  config.providers = providers
  save()
}

function setSelected(providerId) {
  config.selectedProviderId = providerId
  save()
}

function setSystemPrompt(prompt) {
  config.systemPrompt = prompt
  save()
}

function getActiveProvider() {
  const cfg = get()
  const provider = cfg.providers.find(p => p.id === cfg.selectedProviderId)
  return provider && provider.enabled && provider.apiKey ? provider : null
}

module.exports = { load, get, save, setProviders, setSelected, setSystemPrompt, getActiveProvider, getConfigPath, PRESETS, PROVIDER_LABELS }
