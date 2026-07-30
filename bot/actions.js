const { GoalNear, GoalFollow } = require('mineflayer-pathfinder').goals
const Config = require('./config')

class BotActions {
  constructor(bot) {
    this.bot = bot
  }

  async follow() {
    const target = this.bot.nearestEntity(e => e.type === 'player')
    if (!target) return { error: '附近没有玩家' }
    this.bot.pathfinder.setGoal(new GoalFollow(target, 3), true)
    return { ok: true, desc: '跟随 ' + target.username }
  }

  stop() {
    this.bot.pathfinder.stop()
    this.bot.pvp.stop()
    return { ok: true, desc: '已停止' }
  }

  async come() {
    const target = this.bot.nearestEntity(e => e.type === 'player')
    if (!target) return { error: '附近没有玩家' }
    const p = target.position
    this.bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 2))
    return { ok: true, desc: '前往玩家位置' }
  }

  async mine(blockType) {
    const type = blockType || 'dirt'
    const block = this.bot.findBlock({ matching: b => b.name === type, maxDistance: 64 })
    if (!block) return { error: '附近找不到 ' + type }
    await this.bot.collectBlock.collect(block)
    return { ok: true, desc: '已采集 ' + type }
  }

  async goto(x, z) {
    this.bot.pathfinder.setGoal(new GoalNear(x, this.bot.entity.position.y, z, 2))
    return { ok: true, desc: '前往 ' + x + ', ' + z }
  }

  async attack() {
    const mob = this.bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(this.bot.entity.position) < 16)
    if (!mob) return { error: '附近没有敌对生物' }
    this.bot.pvp.attack(mob)
    return { ok: true, desc: '攻击怪物' }
  }

  async collect() {
    const items = Object.values(this.bot.entities).filter(e => e.type === 'object' && e.position.distanceTo(this.bot.entity.position) < 16)
    if (items.length === 0) return { error: '附近没有掉落物' }
    for (const item of items.slice(0, 5)) {
      await this.bot.pathfinder.goto(new GoalNear(item.position.x, item.position.y, item.position.z, 1))
    }
    return { ok: true, desc: '已收集物品' }
  }

  chat(msg) {
    this.bot.chat(msg || '...')
    return { ok: true, desc: '已发送消息' }
  }

  async exec(action) {
    try {
      switch (action.action) {
        case 'FOLLOW': return await this.follow()
        case 'STOP': return this.stop()
        case 'COME': return await this.come()
        case 'MINE': return await this.mine(action.params?.blockType)
        case 'GOTO': return await this.goto(action.params?.x || 0, action.params?.z || 0)
        case 'ATTACK': return await this.attack()
        case 'COLLECT': return await this.collect()
        case 'CHAT': return this.chat(action.params?.message)
        default: return { error: '未知操作 ' + action.action }
      }
    } catch (e) {
      return { error: e.message }
    }
  }
}

module.exports = BotActions
