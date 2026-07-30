const Vec3 = require('vec3').Vec3
const crafting = require('./crafting')

const BLUEPRINTS = {
  small_house: {
    name: '小型木屋',
    materials: {
      'oak_planks': 30,
      'oak_stairs': 8,
      'glass': 4,
      'oak_door': 1,
      'oak_fence': 4,
    },
    build: buildSmallHouse,
  },
}

async function build(bot, blueprintName, callbacks) {
  const bp = BLUEPRINTS[blueprintName]
  if (!bp) {
    if (callbacks.onProgress) callbacks.onProgress(`[建造] 未知蓝图: ${blueprintName}`)
    return
  }

  const mcData = require('minecraft-data')(bot.version)
  const isCreative = bot.game.gameMode === 'creative'

  if (isCreative) {
    if (callbacks.onProgress) callbacks.onProgress(`[建造] 创造模式，直接建造 ${bp.name}`)
  } else {
    if (callbacks.onProgress) callbacks.onProgress(`[建造] 生存模式，准备材料: ${bp.name}`)
    for (const [itemName, needed] of Object.entries(bp.materials)) {
      if (callbacks.isStopped && callbacks.isStopped()) return
      const ok = await crafting.ensureItemCount(bot, itemName, needed, mcData, callbacks)
      if (!ok) {
        const item = mcData.itemsByName[itemName]
        const have = item ? bot.inventory.count(item.id, null) : 0
        if (have < needed) {
          if (callbacks.onProgress) callbacks.onProgress(`[建造] 材料 ${itemName} 不足 (缺${needed - have})，跳过`)
          if (bot) bot.chat(`材料 ${itemName} 不够 (缺${needed - have})，无法建造`)
          return
        }
      }
    }
    if (callbacks.onProgress) callbacks.onProgress(`[建造] 材料已备齐，开始建造`)
  }

  await bp.build(bot, mcData, { isCreative, callbacks })
  if (callbacks.onProgress) callbacks.onProgress(`[建造] ${bp.name} 完成！`)
}

async function buildSmallHouse(bot, mcData, ctx) {
  const { isCreative, callbacks } = ctx
  const { goals } = require('mineflayer-pathfinder')

  const blocks = mcData.blocksByName
  const items = mcData.itemsByName

  const planksBlockId = blocks['oak_planks']?.id
  const planksItemId = items['oak_planks']?.id
  const stairsBlockId = blocks['oak_stairs']?.id
  const stairsItemId = items['oak_stairs']?.id
  const glassBlockId = blocks['glass']?.id
  const glassItemId = items['glass']?.id
  const doorItemId = items['oak_door']?.id
  const fenceBlockId = blocks['oak_fence']?.id
  const fenceItemId = items['oak_fence']?.id

  const pos = bot.entity.position.floored()
  const origin = new Vec3(pos.x + 3, pos.y, pos.z + 3)

  async function placeAt(targetPos, blockId, itemId) {
    if (callbacks.isStopped && callbacks.isStopped()) return
    const existing = bot.blockAt(targetPos)
    if (existing && existing.name !== 'air') return

    if (isCreative) {
      try {
        await bot.creative.setBlock(targetPos, blockId)
      } catch {}
    } else {
      try {
        await bot.pathfinder.goto(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2))
        const item = bot.inventory.findInventoryItem(itemId)
        if (!item) return
        await bot.equip(item, 'hand')
        const ref = targetPos.offset(0, -1, 0)
        await bot.lookAt(ref, true)
        await bot.placeBlock(bot.blockAt(ref), new Vec3(0, 0, 0))
      } catch {}
    }
  }

  // Floor 5x5
  for (let x = 0; x < 5; x++) {
    for (let z = 0; z < 5; z++) {
      await placeAt(origin.offset(x, 0, z), planksBlockId, planksItemId)
    }
  }

  // Walls 3-high
  for (let y = 1; y <= 3; y++) {
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        if (callbacks.isStopped && callbacks.isStopped()) return
        if (x > 0 && x < 4 && z > 0 && z < 4) continue
        if (z === 4 && (x === 2 || x === 3) && y <= 2) continue
        const isWindow = (x === 0 || x === 4) && (z === 1 || z === 3) && y === 2
        await placeAt(origin.offset(x, y, z), isWindow ? glassBlockId : planksBlockId, isWindow ? glassItemId : planksItemId)
      }
    }
  }

  // Roof
  for (let x = 0; x < 5; x++) {
    for (let z = 0; z < 5; z++) {
      if (callbacks.isStopped && callbacks.isStopped()) return
      const dist = Math.max(Math.abs(x - 2), Math.abs(z - 2))
      if (dist <= 1) {
        await placeAt(origin.offset(x, 4, z), stairsBlockId, stairsItemId)
      }
    }
  }

  // Door
  const doorPos = origin.offset(2, 1, 4)
  if (isCreative) {
    try { await bot.creative.setBlock(doorPos, mcData.blocksByName['oak_door']?.id) } catch {}
  } else {
    try {
      await bot.pathfinder.goto(new goals.GoalNear(doorPos.x, doorPos.y, doorPos.z, 2))
      const doorItem = bot.inventory.findInventoryItem(doorItemId)
      if (doorItem) {
        await bot.equip(doorItem, 'hand')
        const ref = doorPos.offset(0, 0, 1)
        await bot.lookAt(ref, true)
        await bot.placeBlock(bot.blockAt(ref), new Vec3(0, 0, 0))
      }
    } catch {}
  }

  // Fence perimeter
  for (let x = -1; x <= 5; x++) {
    for (let z = -1; z <= 5; z++) {
      if (callbacks.isStopped && callbacks.isStopped()) return
      if (x >= 0 && x < 5 && z >= 0 && z < 5) continue
      if ((x === -1 || x === 5) && (z === -1 || z === 5)) continue
      await placeAt(origin.offset(x, 0, z), fenceBlockId, fenceItemId)
    }
  }

  if (bot) bot.chat('小屋建造完成！')
}

module.exports = { build, BLUEPRINTS }