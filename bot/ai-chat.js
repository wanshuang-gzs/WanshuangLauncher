const apiClient = require('./api-client')
const apiConfig = require('./api-config')

const SYSTEM_PROMPT_BASE = `你是 Minecraft 游戏 AI 伴侣，对标 Player2 AI NPC，依托 mineflayer 运行。严格遵守输出格式规则！
【硬性输出规范】
输出分为两部分：自然中文对话，发送至聊天窗口和玩家互动；需要执行游戏动作，必须单独另起一行输出标准指令。
动作指令统一格式：! 指令名 参数
仅有普通文字，没有！开头指令 = 仅聊天，不执行任何游戏操作。
玩家下达新任务时，自动输出！stop 终止当前所有任务，避免冲突。
不存在的任务直接文字告知玩家无法完成，禁止编造指令。
可用全部指令清单：
!mine [方块 id] [数量] 寻找并采集对应方块（示例！mine oak_log 10）
!follow [玩家 ID] 持续跟随指定玩家
!stay 原地待命，停止移动
!stop 终止机器人所有任务
!find village 启动漫游模式搜寻村庄
!build small_house 建造预制小型木屋
!build warehouse 建造储物仓库
!attack [生物名称] 主动猎杀指定生物
!defend 开启自动防御，攻击靠近的敌对生物
!inventory check 查看机器人背包物品
!status 查询机器人当前任务、位置状态
!deposit chest 将背包资源存入附近箱子
!summon bot 生成 AI 机器人
!dismiss bot 移除当前 AI 机器人
示范案例：
玩家：帮我采集 10 个橡木
你的输出：
没问题，我这就去收集橡木！
!mine oak_log 10
玩家：跟着我一起下矿
你的输出：
收到，我会紧紧跟随保护你！
!follow wanshuang0v0
玩家：停下来，在这里等我
你的输出：
好的，我原地待命。
!stay
额外核心规则：
游戏内玩家发送【跟着我】，程序自动捕获发送者用户名填入！follow，禁止再弹窗、询问玩家手动输入 ID！`

class AIChat {
  constructor(manager) {
    this.manager = manager
    this.history = []
    this.maxHistory = 30
    this._personalityPrompt = ''
  }

  setPersonalityPrompt(prompt) {
    this._personalityPrompt = prompt ? `【性格设定】${prompt}\n\n` : ''
  }

  buildMessages(userMessage) {
    const msgs = []
    const fullPrompt = this._personalityPrompt ? this._personalityPrompt + SYSTEM_PROMPT_BASE : SYSTEM_PROMPT_BASE
    msgs.push({ role: 'system', content: fullPrompt })
    for (const h of this.history) {
      msgs.push({ role: h.role, content: h.content })
    }
    msgs.push({ role: 'user', content: userMessage })
    return msgs
  }

  async sendMessage(userMessage, onStream) {
    const provider = apiConfig.getActiveProvider()
    if (!provider) return { error: '未配置 AI 模型' }

    this.history.push({ role: 'user', content: userMessage })
    if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory)

    try {
      let fullResponse = ''
      const streamCb = onStream ? (chunk) => { fullResponse += chunk; onStream(chunk) } : undefined
      const result = await apiClient.chatDirect(provider, this.buildMessages(userMessage), streamCb)
      const text = onStream ? fullResponse : result
      this.history.push({ role: 'assistant', content: text })

      const lines = text.split('\n')
      const chatLines = []
      const actions = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('!')) {
          const parts = trimmed.slice(1).split(/\s+/)
          actions.push({ cmd: parts[0].toLowerCase(), args: parts.slice(1) })
        } else if (trimmed) {
          chatLines.push(trimmed)
        }
      }
      return { text: chatLines.join('\n'), actions }
    } catch (e) {
      return { error: `AI 请求失败: ${e.message}`, actions: [] }
    }
  }

  async sendMessageAndReplyToGame(userMessage, onStream) {
    const result = await this.sendMessage(userMessage, onStream)
    if (result.text && this.manager?.bot && this.manager._loginComplete) {
      this.manager.bot.chat(result.text)
    }
    return result
  }

  clearHistory() { this.history = [] }
  getHistory() { return this.history }
}

module.exports = AIChat
module.exports.SYSTEM_PROMPT_BASE = SYSTEM_PROMPT_BASE
