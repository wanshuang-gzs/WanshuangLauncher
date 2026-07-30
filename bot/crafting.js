const mining = require('./mining')

const LOG_NAMES = [...mining.LOG_BLOCKS]

async function ensureItemCount(bot, itemName, needed, mcData, callbacks) {
  const items = mcData.itemsByName
  const item = items[itemName]
  if (!item) return false

  const have = bot.inventory.count(item.id, null)
  if (have >= needed) return true

  const missing = needed - have
  if (callbacks.onProgress) callbacks.onProgress(`[材料] 需要 ${itemName} x${missing}`)

  switch (itemName) {
    case 'oak_planks':
      return await craftPlanks(bot, missing, callbacks)
    case 'oak_stairs':
      return await craftStairs(bot, missing, callbacks)
    case 'oak_door':
      return await craftDoor(bot, missing, callbacks)
    case 'oak_fence':
      return await craftFence(bot, missing, callbacks)
    case 'glass':
      return await craftGlass(bot, missing, mcData, callbacks)
    default:
      if (callbacks.onProgress) callbacks.onProgress(`[材料] 无法自动获取 ${itemName}`)
      return false
  }
}

async function craftPlanks(bot, needed, callbacks) {
  const mcData = require('minecraft-data')(bot.version)
  const logItem = mcData.itemsByName['oak_log']
  const planksItem = mcData.itemsByName['oak_planks']
  if (!logItem || !planksItem) return false

  const logsNeeded = Math.ceil(needed / 4)
  const haveLogs = bot.inventory.count(logItem.id, null)

  if (haveLogs < logsNeeded) {
    const needLogs = logsNeeded - haveLogs
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 需要 ${needLogs} 个橡木原木，开始采集`)
    await mining.mineBlock(bot, 'oak_log', {
      onProgress: (m) => { if (callbacks.onProgress) callbacks.onProgress(m) },
      isStopped: () => false,
    })
    const afterLogs = bot.inventory.count(logItem.id, null)
    if (afterLogs < logsNeeded) {
      if (callbacks.onProgress) callbacks.onProgress(`[材料] 原木不足，跳过木板合成`)
      return false
    }
  }

  try {
    const recipe = bot.recipesFor(planksItem.id, null, 1)[0]
    if (!recipe) {
      if (callbacks.onProgress) callbacks.onProgress(`[材料] 未找到木板配方`)
      return false
    }
    const times = Math.ceil(needed / recipe.result.count)
    await bot.craft(recipe, times, null)
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成了 ${needed} 个橡木木板`)
    return true
  } catch (e) {
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成木板失败: ${e.message}`)
    return false
  }
}

async function craftStairs(bot, needed, callbacks) {
  const mcData = require('minecraft-data')(bot.version)
  const stairsItem = mcData.itemsByName['oak_stairs']
  const planksItem = mcData.itemsByName['oak_planks']
  if (!stairsItem || !planksItem) return false

  const planksNeeded = needed * 4
  await ensureItemCount(bot, 'oak_planks', planksNeeded, mcData, callbacks)

  try {
    const recipe = bot.recipesFor(stairsItem.id, null, 1)[0]
    if (!recipe) {
      if (callbacks.onProgress) callbacks.onProgress(`[材料] 未找到楼梯配方`)
      return false
    }
    const times = Math.ceil(needed / recipe.result.count)
    await bot.craft(recipe, times, null)
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成了 ${needed} 个橡木楼梯`)
    return true
  } catch (e) {
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成楼梯失败: ${e.message}`)
    return false
  }
}

async function craftDoor(bot, needed, callbacks) {
  const mcData = require('minecraft-data')(bot.version)
  const doorItem = mcData.itemsByName['oak_door']
  const planksItem = mcData.itemsByName['oak_planks']
  if (!doorItem || !planksItem) return false

  const planksNeeded = needed * 6
  await ensureItemCount(bot, 'oak_planks', planksNeeded, mcData, callbacks)

  try {
    const recipe = bot.recipesFor(doorItem.id, null, 1)[0]
    if (!recipe) {
      if (callbacks.onProgress) callbacks.onProgress(`[材料] 未找到门配方`)
      return false
    }
    const times = Math.ceil(needed / recipe.result.count)
    await bot.craft(recipe, times, null)
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成了 ${needed} 个橡木门`)
    return true
  } catch (e) {
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成门失败: ${e.message}`)
    return false
  }
}

async function craftFence(bot, needed, callbacks) {
  const mcData = require('minecraft-data')(bot.version)
  const fenceItem = mcData.itemsByName['oak_fence']
  const planksItem = mcData.itemsByName['oak_planks']
  if (!fenceItem || !planksItem) return false

  const planksNeeded = needed * 2
  const sticksNeeded = needed * 2
  await ensureItemCount(bot, 'oak_planks', planksNeeded, mcData, callbacks)

  const stickItem = mcData.itemsByName['stick']
  if (stickItem) {
    const haveSticks = bot.inventory.count(stickItem.id, null)
    if (haveSticks < sticksNeeded) {
      const planksForSticks = sticksNeeded
      await ensureItemCount(bot, 'oak_planks', planksNeeded + planksForSticks, mcData, callbacks)
      try {
        const recipe = bot.recipesFor(stickItem.id, null, 1)[0]
        if (recipe) {
          const times = Math.ceil(sticksNeeded / recipe.result.count)
          await bot.craft(recipe, times, null)
        }
      } catch {}
    }
  }

  try {
    const recipe = bot.recipesFor(fenceItem.id, null, 1)[0]
    if (!recipe) {
      if (callbacks.onProgress) callbacks.onProgress(`[材料] 未找到栅栏配方`)
      return false
    }
    const times = Math.ceil(needed / recipe.result.count)
    await bot.craft(recipe, times, null)
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成了 ${needed} 个橡木栅栏`)
    return true
  } catch (e) {
    if (callbacks.onProgress) callbacks.onProgress(`[材料] 合成栅栏失败: ${e.message}`)
    return false
  }
}

async function craftGlass(bot, needed, mcData, callbacks) {
  if (callbacks.onProgress) callbacks.onProgress(`[材料] 需要 ${needed} 个玻璃，无法自动烧制，请准备`)
  return false
}

module.exports = { ensureItemCount, craftPlanks, craftStairs, craftDoor, craftFence, craftGlass }