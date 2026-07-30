const Vec3 = require('vec3').Vec3

const LOG_BLOCKS = new Set([
  'oak_log', 'spruce_log', 'birch_log', 'jungle_log',
  'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log',
])

const LEAF_BLOCKS = new Set([
  'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves',
  'acacia_leaves', 'dark_oak_leaves', 'mangrove_leaves', 'cherry_leaves',
  'azalea_leaves', 'flowering_azalea_leaves',
])

async function mineBlock(bot, blockId, callbacks) {
  const mcData = require('minecraft-data')(bot.version)
  const Movements = require('mineflayer-pathfinder').Movements
  const { goals } = require('mineflayer-pathfinder')
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)

  const isWood = LOG_BLOCKS.has(blockId)

  if (isWood) {
    await chopTree(bot, callbacks)
  } else {
    await mineOre(bot, blockId, mcData, movements, callbacks)
  }
}

async function mineOre(bot, blockId, mcData, movements, callbacks) {
  const blockType = mcData.blocksByName[blockId]
  if (!blockType) {
    if (callbacks.onProgress) callbacks.onProgress(`[挖掘] 未知方块: ${blockId}`)
    return
  }

  const block = bot.findBlock({
    matching: blockType.id,
    maxDistance: 64,
  })

  if (!block) {
    if (callbacks.onProgress) callbacks.onProgress(`[挖掘] 附近未发现 ${blockId}`)
    return
  }

  if (callbacks.onProgress) callbacks.onProgress(`[挖掘] 发现${blockId}，前往坐标 (${block.position.x},${block.position.y},${block.position.z})`)

  try {
    await bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2))
    if (callbacks.isStopped && callbacks.isStopped()) return
    await bot.dig(bot.blockAt(block.position))
    if (callbacks.onProgress) callbacks.onProgress(`[挖掘] 成功采集 ${blockId}`)
  } catch (e) {
    if (callbacks.onProgress) callbacks.onProgress(`[挖掘] 采集失败: ${e.message}`)
  }
}

async function chopTree(bot, callbacks) {
  if (callbacks.onProgress) callbacks.onProgress('[伐木] 开始寻找橡树')

  const mcData = require('minecraft-data')(bot.version)
  const Movements = require('mineflayer-pathfinder').Movements
  const { goals } = require('mineflayer-pathfinder')
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)

  const log = bot.findBlock({
    matching: block => LOG_BLOCKS.has(block.name),
    maxDistance: 32,
  })

  if (!log) {
    if (callbacks.onProgress) callbacks.onProgress('[伐木] 附近无树木')
    return
  }

  if (callbacks.onProgress) callbacks.onProgress(`[伐木] 发现树木，前往坐标 (${log.position.x},${log.position.y},${log.position.z})`)

  try {
    await bot.pathfinder.goto(new goals.GoalNear(log.position.x, log.position.y, log.position.z, 2))
    if (callbacks.isStopped && callbacks.isStopped()) return

    // Collect all connected logs from bottom to top
    const collectedPositions = new Set()
    const toDig = [log.position]
    while (toDig.length > 0) {
      const pos = toDig.shift()
      const key = pos.toString()
      if (collectedPositions.has(key)) continue
      collectedPositions.add(key)

      const block = bot.blockAt(pos)
      if (!block || !LOG_BLOCKS.has(block.name)) continue

      if (callbacks.isStopped && callbacks.isStopped()) return

      try {
        await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, 2))
        if (callbacks.isStopped && callbacks.isStopped()) return
        await bot.dig(bot.blockAt(pos))
        if (callbacks.onProgress) callbacks.onProgress(`[伐木] 采集 ${block.name}`)
      } catch (e) {
        if (callbacks.onProgress) callbacks.onProgress(`[伐木] 采集失败: ${e.message}`)
        break
      }

      // Check neighbors for more logs (up, and same-level adjacent)
      for (const offset of [
        [0, 1, 0], [0, -1, 0],
        [1, 0, 0], [-1, 0, 0],
        [0, 0, 1], [0, 0, -1],
      ]) {
        const neighbor = pos.offset(offset[0], offset[1], offset[2])
        const nb = bot.blockAt(neighbor)
        if (nb && LOG_BLOCKS.has(nb.name)) {
          toDig.push(neighbor)
        }
      }
    }

    // Clear leaves above
    if (!(callbacks.isStopped && callbacks.isStopped())) {
      await clearLeaves(bot, log.position, callbacks)
    }

    if (callbacks.onProgress) callbacks.onProgress(`[伐木] 完成，共采集 ${collectedPositions.size} 个原木`)
  } catch (e) {
    if (callbacks.onProgress) callbacks.onProgress(`[伐木] 出错: ${e.message}`)
  }
}

async function clearLeaves(bot, basePos, callbacks) {
  const { goals } = require('mineflayer-pathfinder')
  let cleared = 0
  const radius = 5
  const height = 6

  for (let dy = 0; dy <= height; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (callbacks.isStopped && callbacks.isStopped()) return
        const pos = basePos.offset(dx, dy, dz)
        const block = bot.blockAt(pos)
        if (block && LEAF_BLOCKS.has(block.name)) {
          try {
            await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, 2))
            await bot.dig(block)
            cleared++
          } catch {}
        }
      }
    }
  }
  if (cleared > 0 && callbacks.onProgress) callbacks.onProgress(`[伐木] 清理了 ${cleared} 个树叶`)
}

module.exports = { mineBlock, LOG_BLOCKS, LEAF_BLOCKS }