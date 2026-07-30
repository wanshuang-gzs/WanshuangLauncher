const DEFAULTS = {
  mode: 'idle',
  followDistance: 3,
  autoCollect: true,
  logLevel: 'info',

  mine: {
    enabled: false,
    scanRadius: 32,
    veinMining: true,
    autoDeposit: false,
    depositChest: null,
    targetOres: [
      'diamond_ore', 'deepslate_diamond_ore',
      'iron_ore', 'deepslate_iron_ore',
      'gold_ore', 'deepslate_gold_ore',
      'emerald_ore', 'deepslate_emerald_ore',
      'copper_ore', 'deepslate_copper_ore',
      'coal_ore', 'deepslate_coal_ore',
      'lapis_ore', 'deepslate_lapis_ore',
      'redstone_ore', 'deepslate_redstone_ore',
      'nether_quartz_ore', 'nether_gold_ore',
      'ancient_debris'
    ],
    blacklist: ['dirt', 'stone', 'granite', 'diorite', 'andesite', 'tuff', 'gravel', 'sandstone', 'deepslate']
  },

  combat: {
    enabled: false,
    mode: 'melee',
    range: 16,
    autoEat: true,
    usePotions: true,
    fleeHealth: 6,
    eatHealth: 10,
    targetHostile: true,
    targetPassive: false,
    targetPlayers: false,
    preferBow: false,
    switchWeapon: true,
    armorManagement: true
  },

  build: {
    enabled: false,
    blueprint: null,
    range: 5,
    layerByLayer: true,
    verifyPlacement: true,
    restockFromChest: false,
    chestLocation: null
  }
}

let current = {}

function get(key) {
  if (!key) return { ...current }
  const parts = key.split('.')
  let val = current
  for (const p of parts) {
    if (val == null) return undefined
    val = val[p]
  }
  return val
}

function set(key, value) {
  if (!key) {
    current = { ...DEFAULTS }
    Object.keys(current).forEach(k => {
      if (typeof current[k] === 'object' && !Array.isArray(current[k])) {
        current[k] = { ...DEFAULTS[k] }
      }
    })
    return
  }
  const parts = key.split('.')
  let obj = current
  for (let i = 0; i < parts.length - 1; i++) {
    if (obj[parts[i]] == null) obj[parts[i]] = {}
    obj = obj[parts[i]]
  }
  obj[parts[parts.length - 1]] = value
}

function reset() { set(null) }

reset()

module.exports = { DEFAULTS, get, set, reset }
