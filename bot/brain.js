const EventEmitter = require('events')
const mining = require('./mining')
const building = require('./building')

class BotBrain extends EventEmitter {
  constructor(bot) {
    super()
    this.bot = bot
    this._stopped = false
    this.followTarget = null
    this._livingTick = null
    this._lastEat = 0
    this._lookTimer = null
  }

  isCreative() {
    return this.bot.game?.gameMode === 'creative'
  }

  stopAll() {
    this._stopped = true
    this.followTarget = null
    if (this._livingTick) { clearInterval(this._livingTick); this._livingTick = null }
    if (this._lookTimer) { clearInterval(this._lookTimer); this._lookTimer = null }
    try { this.bot.pathfinder.stop() } catch {}
    try { this.bot.pvp.stop() } catch {}
  }

  stop() { this.stopAll() }

  setMode(mode) { this._mode = mode }
  pause() { this.stopAll() }
  resume() {
    this._stopped = false
    this._startLiving()
  }

  isActive() { return !this._stopped }

  // ── Living routines ──
  startLiving() {
    this._startLiving()
  }

  _startLiving() {
    if (this._livingTick) return

    // Auto-eat every 3s when hungry
    this._livingTick = setInterval(() => {
      if (this._stopped || !this.bot || !this.bot.entity) return
      try {
        if (this.bot.food < 18 && this.isCreative()) {
          this.bot.chat('/feed me')
          return
        }
        if (this.bot.food < 10) {
          const now = Date.now()
          if (now - this._lastEat > 3000) {
            this._lastEat = now
            this._eatFood()
          }
        }
      } catch {}
    }, 3000)

    // Idle look-around every 5-10s
    this._lookTimer = setInterval(() => {
      if (this._stopped || !this.bot || !this.bot.entity) return
      try {
        this.bot.look(
          this.bot.entity.yaw + (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 0.8,
          true
        )
      } catch {}
    }, 5000 + Math.random() * 5000)
  }

  _eatFood() {
    const items = this.bot.inventory?.items()
    if (!items) return
    const food = items.find(i => i.foodPoints > 0)
    if (food) {
      this.bot.equip(food, 'hand', () => {
        this.bot.consume().catch(() => {})
      })
    }
  }

  // ── !mine ──
  async startMining(blockId, onDone, count = 0) {
    this._stopped = false
    this.emit('status', `[挖掘] 寻找 ${blockId}${count ? ' x' + count : ''}`)

    try {
      await mining.mineBlock(this.bot, blockId, {
        onProgress: (msg) => this.emit('status', msg),
        isStopped: () => this._stopped,
        targetCount: count,
      })
    } catch (e) {
      if (!this._stopped) this.emit('status', `[挖掘] 出错: ${e.message}`)
    } finally {
      if (!this._stopped && onDone) onDone()
    }
  }

  // ── !follow ──
  async startFollow(targetName) {
    this._stopped = false
    this.followTarget = targetName

    const mcData = require('minecraft-data')(this.bot.version)
    const Movements = require('mineflayer-pathfinder').Movements
    const { goals } = require('mineflayer-pathfinder')

    const movements = new Movements(this.bot, mcData)
    this.bot.pathfinder.setMovements(movements)

    const followLoop = () => {
      if (this._stopped || !this.followTarget) return
      const player = this.bot.players[this.followTarget]
      if (!player || !player.entity) {
        this.emit('status', `[跟随] 丢失目标 ${this.followTarget}`)
        this.bot.pathfinder.stop()
        setTimeout(followLoop, 2000)
        return
      }
      const goal = new goals.GoalFollow(player.entity, 2)
      this.bot.pathfinder.setGoal(goal, true)
      setTimeout(followLoop, 1000)
    }
    followLoop()
  }

  // ── !find village ──
  async startFindVillage(onDone) {
    this._stopped = false
    const mcData = require('minecraft-data')(this.bot.version)
    const Movements = require('mineflayer-pathfinder').Movements
    const { goals } = require('mineflayer-pathfinder')

    const movements = new Movements(this.bot, mcData)
    this.bot.pathfinder.setMovements(movements)

    let attempts = 0
    const maxAttempts = 5

    const wander = async () => {
      if (this._stopped || attempts >= maxAttempts) {
        if (onDone) onDone()
        return
      }
      attempts++
      this.emit('status', `[探索] 搜寻中 (${attempts}/${maxAttempts})`)

      const x = this.bot.entity.position.x + (Math.random() - 0.5) * 160
      const z = this.bot.entity.position.z + (Math.random() - 0.5) * 160

      try {
        await this.bot.pathfinder.goto(new goals.GoalNearXZ(x, z, 3))
        const village = this.bot.findBlock({ matching: block => block.name === 'village' || block.name === 'bell' })
        if (village) {
          this.emit('status', `[探索] 发现村庄！`)
          if (this.bot) this.bot.chat('我找到了一个村庄！')
          if (onDone) onDone()
          return
        }
      } catch {}
      setTimeout(wander, 1000)
    }
    wander()
  }

  // ── !build ──
  async startBuilding(blueprint, onDone) {
    this._stopped = false
    try {
      await building.build(this.bot, blueprint, {
        onProgress: (msg) => this.emit('status', msg),
        isStopped: () => this._stopped,
      })
    } catch (e) {
      if (!this._stopped) this.emit('status', `[建造] 出错: ${e.message}`)
    } finally {
      if (!this._stopped && onDone) onDone()
    }
  }

  // ── !attack ──
  async startAttacking(onDone, mobName = '') {
    this._stopped = false
    const loop = () => {
      if (this._stopped) { if (onDone) onDone(); return }
      const mob = this.bot.nearestEntity(e => {
        if (e.type !== 'mob') return false
        if (mobName && !(e.name || '').includes(mobName.toLowerCase().replace(/ /g, '_'))) return false
        return e.position?.distanceTo(this.bot.entity.position) < 16
      })
      if (mob) {
        this.bot.pvp.attack(mob)
        this.emit('status', `[战斗] 攻击 ${mob.name || mob.type}`)
        setTimeout(loop, 2000)
      } else {
        this.emit('status', `[战斗] ${mobName ? '找不到 ' + mobName : '附近无怪物'}`)
        if (onDone) onDone()
      }
    }
    loop()
  }

  // ── !collect ──
  async startCollecting(onDone) {
    this._stopped = false
    const items = Object.values(this.bot.entities).filter(e =>
      e.type === 'object' && e.position?.distanceTo(this.bot.entity.position) < 16
    )
    if (items.length === 0) { this.emit('status', '[收集] 附近无掉落物'); if (onDone) onDone(); return }
    const { goals } = require('mineflayer-pathfinder')
    for (const item of items.slice(0, 8)) {
      if (this._stopped) break
      try {
        await this.bot.pathfinder.goto(new goals.GoalNear(item.position.x, item.position.y, item.position.z, 1))
      } catch {}
    }
    this.emit('status', `[收集] 捡起 ${items.length} 个掉落物`)
    if (onDone) onDone()
  }

  // ── !farm ──
  async startFarming(crop, onDone) {
    this._stopped = false
    this.emit('status', `[种植] 寻找 ${crop} 种子...`)
    try {
      const { goals } = require('mineflayer-pathfinder')
      const plantable = this.bot.findBlock({ matching: b => b.name.includes('farmland') || b.name.includes('dirt'), maxDistance: 16 })
      if (!plantable) { this.emit('status', '[种植] 附近无耕地'); if (onDone) onDone(); return }
      await this.bot.pathfinder.goto(new goals.GoalNear(plantable.position.x, plantable.position.y, plantable.position.z, 2))
      const seeds = this.bot.inventory.items().find(i => i.name.includes('seed') || i.name.includes(crop))
      if (seeds) {
        await this.bot.equip(seeds, 'hand')
        await this.bot.activateBlock(plantable)
        this.emit('status', `[种植] 种下 ${crop}`)
      } else {
        this.emit('status', `[种植] 无种子`)
      }
    } catch (e) { this.emit('status', `[种植] 出错: ${e.message}`) }
    if (onDone) onDone()
  }

  // ── !fish ──
  async startFishing(onDone) {
    this._stopped = false
    try {
      const rod = this.bot.inventory.items().find(i => i.name.includes('fishing_rod'))
      if (!rod) { this.emit('status', '[钓鱼] 没有鱼竿'); if (onDone) onDone(); return }
      await this.bot.equip(rod, 'hand')
      this.emit('status', '[钓鱼] 开始钓鱼...')
      this.bot.fish().then(() => { this.emit('status', '[钓鱼] 钓到鱼了！'); if (onDone) onDone() }).catch(e => { this.emit('status', `[钓鱼] 中断: ${e.message}`); if (onDone) onDone() })
    } catch (e) { this.emit('status', `[钓鱼] 出错: ${e.message}`); if (onDone) onDone() }
  }

  // ── !deposit chest ──
  async startDepositChest(onDone) {
    this._stopped = false
    const chest = this.bot.findBlock({ matching: b => b.name === 'chest' || b.name.includes('chest'), maxDistance: 8 })
    if (!chest) { this.emit('status', '[存储] 附近无箱子'); if (onDone) onDone(); return }
    const mcData = require('minecraft-data')(this.bot.version)
    const { goals } = require('mineflayer-pathfinder')
    try {
      await this.bot.pathfinder.goto(new goals.GoalNear(chest.position.x, chest.position.y, chest.position.z, 2))
      const container = await this.bot.openContainer(chest)
      const items = this.bot.inventory.items().filter(i => i.name !== 'air')
      if (items.length === 0) { this.emit('status', '[存储] 背包无物品可存'); container.close(); if (onDone) onDone(); return }
      let deposited = 0
      for (const item of items) {
        if (this._stopped) break
        try { await container.deposit(item.type, null, item.count); deposited += item.count } catch {}
      }
      container.close()
      this.emit('status', `[存储] 存入 ${deposited} 个物品到箱子`)
    } catch (e) { this.emit('status', `[存储] 出错: ${e.message}`) }
    if (onDone) onDone()
  }

  // ── !status ──
  getStatus() {
    if (!this.bot || !this.bot.entity) return { health: 0, food: 0, position: null, mode: '离线' }
    return {
      health: Math.round(this.bot.health || 0),
      food: this.bot.food || 0,
      position: this.bot.entity.position ? {
        x: Math.round(this.bot.entity.position.x),
        y: Math.round(this.bot.entity.position.y),
        z: Math.round(this.bot.entity.position.z),
      } : null,
      mode: this.bot.game?.gameMode || '生存',
      followTarget: this.followTarget,
    }
  }
}

module.exports = BotBrain