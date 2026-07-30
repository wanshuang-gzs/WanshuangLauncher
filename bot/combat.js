const Config = require('./config')

class CombatAI {
  constructor(bot, brain) {
    this.bot = bot
    this.brain = brain
    this._stop = false
    this.target = null
    this._lastHeal = 0
    this._lastEat = 0
    this._lastPotion = 0
  }

  stop() {
    this._stop = true
    this.target = null
    try { this.bot.pvp.stop() } catch {}
  }

  tick() {
    if (this._stop) return
    const cfg = Config.get('combat')
    if (!cfg.enabled) return

    this._handleHealing(cfg)
    if (this._stop) return

    const target = this._findTarget(cfg)
    if (!target) {
      if (this.brain.mode === 'fighting') {
        this.brain.setSub('idle')
        this.brain.emit('progress', 'combat', 0, 0, '无目标')
      }
      this.target = null
      return
    }

    this.target = target
    this._engage(target, cfg)
  }

  _findTarget(cfg) {
    const range = cfg.range || 16
    const pos = this.bot.entity.position
    let best = null
    let bestDist = range

    for (const id in this.bot.entities) {
      const e = this.bot.entities[id]
      if (!e || e === this.bot.entity) continue
      const dist = e.position.distanceTo(pos)
      if (dist > range) continue
      if (e.type === 'mob') {
        if (cfg.targetHostile && this._isHostile(e)) {
          if (!best || dist < bestDist) { best = e; bestDist = dist }
        }
        if (cfg.targetPassive && !this._isHostile(e)) {
          if (!best || dist < bestDist) { best = e; bestDist = dist }
        }
      }
      if (cfg.targetPlayers && e.type === 'player' && e.username !== this.bot.username) {
        if (!best || dist < bestDist) { best = e; bestDist = dist }
      }
    }
    return best
  }

  _isHostile(entity) {
    const hostiles = new Set([
      'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
      'witch', 'phantom', 'drowned', 'husk', 'stray',
      'cave_spider', 'slime', 'blaze', 'ghast', 'hoglin',
      'piglin', 'piglin_brute', 'zombified_piglin', 'zoglin',
      'evoker', 'vindicator', 'pillager', 'ravager', 'vex',
      'warden', 'breeze', 'bogged', 'creaking'
    ])
    const name = entity.name || entity.username
    return hostiles.has(name)
  }

  _engage(target, cfg) {
    const pos = this.bot.entity.position
    const dist = target.position.distanceTo(pos)
    const health = this.bot.health * 5

    if (health <= cfg.fleeHealth) {
      this.brain.setSub('fleeing')
      this._flee(target)
      return
    }

    this.brain.setSub('attacking')
    this.brain.emit('progress', 'combat', 1, 1, '战斗中: ' + (target.name || target.username))

    if (cfg.mode === 'ranged' || (cfg.preferBow && this._hasBow())) {
      this._rangedAttack(target, dist)
    } else {
      this._meleeAttack(target, dist)
    }
  }

  _meleeAttack(target, dist) {
    if (dist > 4) {
      this.brain.setSub('approaching')
      const { GoalFollow } = require('mineflayer-pathfinder').goals
      this.bot.pathfinder.setGoal(new GoalFollow(target, 2), true)
    } else {
      this.bot.pvp.attack(target)
      this.bot.lookAt(target.position.offset(0, 1, 0))
    }
  }

  _rangedAttack(target, dist) {
    this.bot.lookAt(target.position.offset(0, 1, 0))
    if (dist < 4) {
      this.brain.setSub('approaching')
      const p = target.position
      this.bot.pathfinder.setGoal(
        new (require('mineflayer-pathfinder').goals.GoalNear)(p.x, p.y, p.z, 5)
      )
    } else if (dist <= 24) {
      this.bot.hold('bow', (err) => {
        if (!err) this.bot.attack(target)
      })
    }
  }

  _handleHealing(cfg) {
    const health = this.bot.health * 5
    const food = this.bot.food
    const now = Date.now()

    if (health <= cfg.fleeHealth) {
      this._flee(null)
      return
    }

    if (cfg.autoEat && food < cfg.eatHealth && now - this._lastEat > 2000) {
      this._lastEat = now
      this.brain.setSub('healing')
      this._eatFood()
    }

    if (cfg.usePotions && health < 12 && now - this._lastPotion > 3000) {
      this._lastPotion = now
      this._drinkHealingPotion()
    }
  }

  _eatFood() {
    const items = this.bot.inventory.items()
    const food = items.find(i => i.foodPoints > 0)
    if (food) {
      this.bot.equip(food, 'hand', () => {
        this.bot.consume()
      })
    }
  }

  _drinkHealingPotion() {
    const items = this.bot.inventory.items()
    const potion = items.find(i => i.name && i.name.includes('potion') && i.effects && i.effects.some(e => e.id === 6))
    if (potion) {
      this.bot.equip(potion, 'hand', () => {
        this.bot.activateItem()
      })
    }
  }

  _flee(target) {
    const { GoalNear } = require('mineflayer-pathfinder').goals
    const pos = this.bot.entity.position
    const dir = target ? pos.minus(target.position).normalize() : new (require('vec3').Vec3)(1, 0, 0)
    const fleePos = pos.plus(dir.scaled(20))
    this.bot.pathfinder.setGoal(new GoalNear(fleePos.x, fleePos.y, fleePos.z, 3))
    try { setTimeout(() => this.bot.pvp.stop(), 100) } catch {}
  }

  _hasBow() {
    const items = this.bot.inventory.items()
    return items.some(i => i.name && i.name.includes('bow'))
  }
}

module.exports = CombatAI
