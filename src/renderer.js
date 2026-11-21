const DEFAULT_JAVA = 'java';
const DEFAULT_USERNAME = 'Steve';
const DEFAULT_MIN_RAM = 2048;
const DEFAULT_MAX_RAM = 4096;

const I18N = {
  zh: {
    unLogin:'未登录',home:'首页',versions:'版本列表',gameManage:'游戏管理',resourceCenter:'资源中心',
    settings:'设置',mirror:'下载源',msLogin:'微软登录',offline:'离线',delete:'删除',
    selectVer:'选择版本',launch:'启动',launching:'启动中...',cancel:'取消',
    create:'创建',offlineTitle:'离线账号',offlineHint:'离线模式仅用于单人游戏或局域网',
    noVersions:'暂无版本',mod:'模组',modNone:'暂无模组',
    about:'关于',downloadSrc:'下载源',speedTest:'测速',log:'日志',
    javaSettings:'Java 设置',player:'玩家名',jvmArgs:'JVM 参数',minMem:'最小',maxMem:'最大',
    saveSuccess:'设置已保存',loginSuccess:'登录成功',loginFailed:'登录失败',
    accountDeleted:'账号已删除',launchErr:'启动失败',offlineCreated:'离线账号已创建',
    verInfo:(v,t)=>`${v} | ${t}`,refresh:'刷新',clear:'清除',
    search:'搜索...',theme:'主题',theme0:'深空紫',theme1:'蒸汽蓝',theme2:'暗夜紫',theme3:'简约白',theme4:'液态玻璃',theme5:'毛玻璃',multiplayer:'联机',
    importBg:'导入背景',clearBg:'清除背景',
    lang:'语言',openFolder:'打开文件夹',modToggleOn:'已启用',modToggleOff:'已禁用',
    all:'全部',modpack:'整合包',shader:'光影',resourcepack:'资源包',world:'世界',
    importPack:'导入整合包',importing:'正在导入...',importDone:'整合包导入完成',importFail:'导入失败',importOnlyModrinth:'目前仅支持导入 Modrinth 整合包',
    searchHint:'输入关键词搜索资源',back:'返回',downloadedVersions:'已下载版本',
    noDownloaded:'暂无已下载的版本',modManage:'模组管理',accountManage:'账号管理',
    addOffline:'添加离线',downloads:'下载',dlEmpty:'无下载任务',startLaunch:'正在启动',
    launchDone:'游戏已启动',launchFail:'启动失败',unknownErr:'未知错误',noJava:'未检测到 Java',
    javaFound:'Java:',launchOk:'启动成功',versionDetail:'版本详情',release:'发布',
    type:'类型',libStatus:'依赖库状态',libOk:'已就绪',libMissing:'个缺失',    dlVersion:'下载此版本',noRes:'暂无资源',
    verDownloaded:'已下载',verNotDL:'未下载',dlProgress:'下载进度',openVerDir:'打开文件夹',
    delVer:'删除版本',verDeleted:'版本已删除',confirmDel:'确定要删除此版本？',
    settingSaved:'设置已保存',themeChanged:'主题已切换',
    applyVer:'适用版本',selVerFirst:'请先在首页选择版本',verNoRes:'该版本暂无适配资源',
    verConfirm:(v,n)=>'将下载适配 '+v+' 的版本 '+n+'，确定？',ok:'确定',loadedAll:'— 已加载全部 —',
    javaDlTitle:'未检测到 Java 运行环境',javaDlMsg:'运行我的世界需要 Java，是否自动下载配套 Java 环境？',javaDlAuto:'自动下载 Java',javaDlBrowse:'手动选择 javaw.exe',javaDlLater:'稍后再说',javaDlRetry:'重试',javaDlDone:'Java 下载完成',javaDlFail:'下载失败',
    loaders:'可用加载器',noLoader:'暂无适配加载器',dlLoader:'下载安装器',
    loadMore:'▼ 下拉加载更多',countVer:'版本',noDesc:'暂无介绍',translate:'翻译介绍',translateDone:'翻译完成',
    packPreviewTitle:'整合包内容确认',packConfirm:'同意并下载',packFiles:'文件数量',packSize:'总大小',
    packLoader:'加载器',packOverrides:'覆盖文件',packVanilla:'原版（无加载器）',packNoFiles:'无需要下载的文件',
    packMore:'仅显示前 500 个文件',packPreparing:'正在解析整合包...',
    skins:'皮肤库',skinLoading:'正在加载皮肤...',skinMore:'加载更多',skinPreview:'皮肤预览',skinVariant:'模型',
    applySkin:'应用皮肤',skinApplied:'皮肤已应用',skinApplyFail:'皮肤应用失败',skinNeedAccount:'请先选择账号',
    skinHint:'选择一个皮肤后点击应用；离线账号通过内置皮肤服务生效，无需安装模组',
    importSkin:'导入皮肤',skinLocalName:'本地皮肤',skinInvalidSize:'请选择 64x64、64x32 或等比例高清 PNG 皮肤',
    skinHintOnline:'当前为微软账号，应用后会直接同步到游戏',
    skinHintLocal:'离线账号：皮肤保存在本地并生成在线皮肤地址（MineSkin 匿名上传），无需安装模组',
    joinChannel:'加入频道',channelHint:'扫码加入频道，反馈问题与交流',
    preinstallMods:'预装皮肤模组',preinstallRunning:'正在预装皮肤模组...',preinstallDone:'预装完成',
    preinstallNone:'皮肤模组已是最新或无需预装',preinstallFail:'预装模组失败',preinstallNoLoader:'该版本没有模组加载器',
    checkUpdate:'检查更新',newVersion:'发现新版本',updateNow:'前往下载',
    updateLatest:'当前已是最新版本',updateFail:'检查更新失败',updateNotes:'更新内容',
    newVersionMsg:(latest,current)=>'发现新版本 '+latest+'（当前 '+current+'），是否前往下载？',
    clearCache:'清除账号缓存',javaReused:'已使用现有 Java',javaDlNeed:'正在准备 Java',

    acctNotSelected:'账号未选择',acctNoSelectBody:'当前未选择任何账号，是否以未登录匿名状态启动游戏？',
    acctNoSelectNote:'未登录模式下大部分多人联机服务器无法正常进入',
    launchAnon:'确认启动',
    aiBot:'AI队友',botConnect:'连接设置',botBtnConnect:'连接',botBtnDisconnect:'断开',
    botCommand:'指令控制',botEmpty:'连接机器人后操作日志将显示在此',



  },
  en: {
    unLogin:'Not logged in',home:'Home',versions:'Versions',gameManage:'Game Management',resourceCenter:'Resources',
    settings:'Settings',mirror:'Download Source',msLogin:'Microsoft Login',offline:'Offline',delete:'Delete',
    selectVer:'Select Version',launch:'Launch',launching:'Launching...',cancel:'Cancel',
    create:'Create',offlineTitle:'Offline Account',offlineHint:'Offline mode for single-player or LAN only',
    noVersions:'No versions',mod:'Mod',modNone:'No mods',
    about:'About',downloadSrc:'Download Source',speedTest:'Speed Test',log:'Log',
    javaSettings:'Java Settings',player:'Username',jvmArgs:'JVM Args',minMem:'Min',maxMem:'Max',
    saveSuccess:'Settings saved',loginSuccess:'Login successful',loginFailed:'Login failed',
    accountDeleted:'Account deleted',launchErr:'Launch failed',offlineCreated:'Offline account created',
    verInfo:(v,t)=>`${v} | ${t}`,refresh:'Refresh',clear:'Clear',
    search:'Search...',theme:'Theme',theme0:'Deep Purple',theme1:'Steam Blue',theme2:'Night Violet',theme3:'Light',theme4:'Liquid Glass',theme5:'Frosted Glass',multiplayer:'Multiplayer',
    importBg:'Import Background',clearBg:'Clear Background',
    lang:'Language',openFolder:'Open Folder',modToggleOn:'Enabled',modToggleOff:'Disabled',
    all:'All',modpack:'Modpack',shader:'Shader',resourcepack:'Resource Pack',world:'World',
    importPack:'Import Modpack',importing:'Importing...',importDone:'Modpack imported',importFail:'Import failed',importOnlyModrinth:'Only Modrinth modpacks are supported for now',
    searchHint:'Search resources',back:'Back',downloadedVersions:'Downloaded Versions',
    noDownloaded:'No downloaded versions',modManage:'Mods',accountManage:'Account Management',
    addOffline:'Add Offline',downloads:'Downloads',dlEmpty:'No downloads',
    startLaunch:'Starting',launchDone:'Game started',launchFail:'Launch failed',
    unknownErr:'Unknown error',noJava:'Java not found',javaFound:'Java:',
    launchOk:'Launch successful',versionDetail:'Version Details',release:'Released',
    type:'Type',libStatus:'Library Status',libOk:'Ready',libMissing:'missing',
    dlVersion:'Download Version',noRes:'No resources',verDownloaded:'Downloaded',verNotDL:'Not downloaded',
    dlProgress:'Download Progress',openVerDir:'Open Folder',delVer:'Delete Version',
    verDeleted:'Version deleted',confirmDel:'Delete this version?',
    settingSaved:'Settings saved',themeChanged:'Theme changed',
    applyVer:'Target Version',selVerFirst:'Select a version on Home page first',verNoRes:'No resources for this version',
    verConfirm:(v,n)=>'Download for '+v+' version '+n+', confirm?',ok:'OK',loadedAll:'— All loaded —',
    javaDlTitle:'Java not found',javaDlMsg:'Minecraft requires Java. Auto-download the matching Java?',javaDlAuto:'Download Java',javaDlBrowse:'Browse javaw.exe',javaDlLater:'Later',javaDlRetry:'Retry',javaDlDone:'Java download complete',javaDlFail:'Download failed',
    loaders:'Loaders',noLoader:'No loader available',dlLoader:'Download Installer',
    loadMore:'▼ Scroll to load more',countVer:'versions',noDesc:'No description',translate:'Translate',translateDone:'Translated',
    packPreviewTitle:'Modpack Contents',packConfirm:'Accept & Download',packFiles:'Files',packSize:'Total size',
    packLoader:'Loader',packOverrides:'Override files',packVanilla:'Vanilla (no loader)',packNoFiles:'Nothing to download',
    packMore:'Showing first 500 files only',packPreparing:'Parsing modpack...',
    skins:'Skins',skinLoading:'Loading skins...',skinMore:'Load more',skinPreview:'Skin Preview',skinVariant:'Model',
    applySkin:'Apply Skin',skinApplied:'Skin applied',skinApplyFail:'Failed to apply skin',skinNeedAccount:'Select an account first',
    skinHint:'Pick a skin and click Apply. Offline accounts use the built-in skin service, no mod required',
    importSkin:'Import Skin',skinLocalName:'Local skin',skinInvalidSize:'Please choose a 64x64, 64x32 or proportional HD PNG skin',
    skinHintOnline:'Microsoft account: the skin will be uploaded to Minecraft directly',
    skinHintLocal:'Offline account: skin is stored locally and published to MineSkin for a texture URL (no mod needed)',
    joinChannel:'Join Channel',channelHint:'Scan to join the channel for support and discussion',
    preinstallMods:'Preinstall Skin Mods',preinstallRunning:'Preinstalling skin mods...',preinstallDone:'Preinstall complete',
    preinstallNone:'Skin mods are up to date or not required',preinstallFail:'Preinstall failed',preinstallNoLoader:'This version has no mod loader',
    checkUpdate:'Check Update',newVersion:'New version available',updateNow:'Download',
    updateLatest:'Already up to date',updateFail:'Update check failed',updateNotes:'Release notes',
    newVersionMsg:(latest,current)=>'New version '+latest+' (current '+current+'). Open download page?',
    clearCache:'Clear account cache',javaReused:'Using existing Java',javaDlNeed:'Preparing Java',

    acctNotSelected:'No Account Selected',acctNoSelectBody:'No account selected. Launch as anonymous offline player?',
    acctNoSelectNote:'Offline mode cannot access most multiplayer servers',
    launchAnon:'Launch Anonymously',
    aiBot:'AI Bot',botConnect:'Connection',botBtnConnect:'Connect',botBtnDisconnect:'Disconnect',
    botCommand:'Commands',botEmpty:'Bot logs will appear here',



  }
};

let lang = localStorage.getItem('wsl_lang') || 'zh';
let accounts = [];
let currentAccount = null;
let versions = [];
let mods = [];
let isLaunching = false;
let resType = 'all';
let resDataAll = [];
let resSearchTimer = null;
let minecraftDir = '';
let currentQueueId = null;
let resPage = 0;
let resLoading = false;
let resHasMore = true;
let expandedMajor = null;
let resSource = 'modrinth';

function t(key, ...args) {
  const v = I18N[lang][key];
  return typeof v === 'function' ? v(...args) : (v || key);
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[placeholder][data-i18n]').forEach(el => {
    el.placeholder = t(el.dataset.i18n);
  });
}

function $(id) { return document.getElementById(id) }

function toast(msg, type) {
  const el = $('toast');
  const d = document.createElement('div');
  d.className = 'toast-item' + (type ? ' ' + type : '');
  d.textContent = msg;
  el.appendChild(d);
  setTimeout(() => d.remove(), 2700);
}

// ── Logo ──
window.wsl.getLogo().then(dataUrl => {
  if (dataUrl) { $('titlebar-logo').src = dataUrl; $('sidebar-logo').src = dataUrl }
});

window.wsl.minecraftDir().then(d => { minecraftDir = d });

// ── Theme ──
function setTheme(name, silent) {
  if (!name || name === 'default') { document.documentElement.removeAttribute('data-theme'); name = 'default' }
  else { document.documentElement.setAttribute('data-theme', name) }
  localStorage.setItem('wsl_theme', name);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === name));
  if (!silent) toast(t('themeChanged'));
}
const savedTheme = localStorage.getItem('wsl_theme') || 'light';
setTheme(savedTheme, true);

// ── Background (glass theme) ──
function applyBg(data) {
  var wrap = $('bg-wrap');
  var img = $('bg-image');
  var vid = $('bg-video');
  if (!data) { wrap.classList.remove('active'); img.src = ''; vid.src = ''; $('clearBgBtn').style.display = 'none'; return }
  wrap.classList.add('active');
  $('clearBgBtn').style.display = 'inline-flex';
  if (data.type === 'image') {
    img.src = data.url; img.style.display = 'block'; vid.style.display = 'none'; vid.src = '';
  } else if (data.type === 'video') {
    vid.src = data.url; vid.style.display = 'block'; img.style.display = 'none'; img.src = '';
    vid.play().catch(function(){});
  }
}
function importBgImage() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';
  input.onchange = function() {
    var file = input.files[0];
    if (!file) return;
    var isVideo = file.type.startsWith('video/');
    if (isVideo) {
      var url = URL.createObjectURL(file);
      var data = { type: 'video', url: url };
      localStorage.setItem('wsl_bg', JSON.stringify(data));
      applyBg(data);
      var vid = $('bg-video');
      vid.onloadeddata = function() { vid.play().catch(function(){}) };
      toast('背景已设置');
    } else {
      var reader = new FileReader();
      reader.onload = function(e) {
        var data = { type: 'image', url: e.target.result };
        localStorage.setItem('wsl_bg', JSON.stringify(data));
        applyBg(data);
        toast('背景已设置');
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}
function clearBg() {
  var vid = $('bg-video');
  if (vid.src && vid.src.startsWith('blob:')) URL.revokeObjectURL(vid.src);
  localStorage.removeItem('wsl_bg');
  applyBg(null);
  toast('背景已清除');
}
// restore bg on load
try { var bgData = JSON.parse(localStorage.getItem('wsl_bg')); if (bgData) { if (bgData.type==='video') { localStorage.removeItem('wsl_bg'); clearBg() } else { applyBg(bgData) } } } catch {}

// ── 陶瓦联机 ──
let etRoomCode = '';
let etConnected = false;

function setEtView(view) {
  ['etIdle', 'etHost', 'etGuest', 'etGuestInput', 'etLoading', 'etError'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = id === view ? '' : 'none';
  });
}

window.wsl.onEtStatus(function(s) {
  etConnected = s.connected;
  const el = $('etStatusDot');
  if (el) {
    el.style.background = s.connected ? 'var(--success)' : 'var(--warning)';
    el.title = s.connected ? '已连接' : (s.state || '等待中...');
  }
  // 自动切换视图基于状态
  if (s.state === 'host-ok' && s.room) {
    etRoomCode = s.room;
    $('etRoomCodeDisplay').textContent = s.room;
    setEtView('etHost');
  }
  if (s.state === 'guest-ok') {
    setEtView('etGuest');
  }
  if (s.state === 'idle' || !s.running) {
    etRoomCode = '';
    setEtView('etIdle');
  }
});

async function etCheckReady() {
  const ok = await window.wsl.etStart();
  if (!ok) {
    toast('陶瓦联机核心未找到', 'error');
    return false;
  }
  return true;
}

async function etHost() {
  if (!await etCheckReady()) return;
  setEtView('etLoading');
  $('etLoadingMsg').textContent = '正在创建房间...';
  const playerName = (localStorage.getItem('wsl_offline_name') || '').trim() || undefined;
  const r = await window.wsl.etHost(playerName);
  if (r.ok) {
    etRoomCode = r.code;
    setEtView('etHost');
    $('etRoomCodeDisplay').textContent = r.code;
    const qr = await window.wsl.etQR(r.code);
    const qrImg = $('etQRImg');
    if (qr && qrImg) { qrImg.src = qr; qrImg.style.display = 'inline' }
    const hint = $('etCliHint');
    if (hint) {
      hint.textContent = '房间码: ' + r.code + '（好友在陶瓦联机输入此码加入）';
    }
    toast('房间已创建');
  } else {
    setEtView('etError');
    $('etErrorMsg').textContent = r.error || '创建房间失败';
  }
}

function etShowJoin() {
  setEtView('etGuestInput');
}

async function etJoin() {
  const code = $('etRoomInput').value.trim();
  if (!code) { toast('请输入房间码', 'error'); return }
  if (!await etCheckReady()) return;
  setEtView('etLoading');
  $('etLoadingMsg').textContent = '正在加入房间...';
  const playerName = (localStorage.getItem('wsl_offline_name') || '').trim() || undefined;
  const r = await window.wsl.etJoin(code, playerName);
  if (r.ok) {
    setEtView('etGuest');
    toast('已加入房间，启动游戏即可联机');
  } else {
    setEtView('etError');
    $('etErrorMsg').textContent = r.error || '加入房间失败';
  }
}

async function etStop() {
  await window.wsl.etStop();
  etRoomCode = '';
  etConnected = false;
  setEtView('etIdle');
  const dot = $('etStatusDot');
  if (dot) { dot.style.background = 'var(--text3)'; dot.title = '' }
  toast('联机已断开');
}

function etCopyCode() {
  if (etRoomCode) {
    navigator.clipboard.writeText(etRoomCode).then(() => toast('房间码已复制')).catch(() => {});
  }
}

function etPaste() {
  navigator.clipboard.readText().then(t => {
    const el = $('etRoomInput');
    if (el && t) el.value = t;
  }).catch(() => toast('无法读取剪贴板', 'error'));
}

// ── Page switching ──
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  if (page === 'game-manage') { loadLocalVersions(); loadMods() }
  if (page === 'resources') { resPage = 0; resDataAll = []; resHasMore = true; loadResources(true) }
  if (page === 'skins') { if (skinList.length === 0) loadSkins(true) }
  if (page === 'mirror') loadMirrors();
  if (page === 'bot') loadApiConfig();
  if (page === 'settings') {}
  if (page === 'settings') {}
}

// ── User modal ──
function openUserModal() {
  $('userModal').classList.add('active');
  renderUserList();
}
function closeUserModal() { $('userModal').classList.remove('active') }

function renderUserList() {
  const el = $('userList');
  if (!accounts || accounts.length === 0) {
    el.innerHTML = '<p class="empty-text" data-i18n="unLogin">'+t('unLogin')+'</p>';
    return;
  }
  el.innerHTML = accounts.map((a, i) => `
    <div class="user-card ${a === currentAccount ? 'active' : ''}" onclick="switchAccount(${i})">
      <div class="uc-avatar">${a.type === 'microsoft' && a.avatar ? '<img src="'+a.avatar+'" alt="">' : '<svg width="16" height="16"><use href="#icon-user"/></svg>'}</div>
      <div class="uc-info">
        <div class="uc-name">${escHtml(a.name)}</div>
        <div class="uc-type">${a.type === 'microsoft' ? 'Microsoft' : t('offline')}</div>
      </div>
      <button class="uc-del" onclick="event.stopPropagation();delAccount(${i})">✕</button>
    </div>
  `).join('');
  applyLang();
}

function switchAccount(idx) {
  currentAccount = accounts[idx];
  saveAccounts();
  renderProfile();
  closeUserModal();
}

function delAccount(idx) {
  const a = accounts[idx];
  if (a.type === 'microsoft') window.wsl.logoutMicrosoft();
  accounts.splice(idx, 1);
  if (currentAccount === a) currentAccount = accounts.length > 0 ? accounts[0] : null;
  saveAccounts();
  renderUserList();
  renderProfile();
  toast(t('accountDeleted'));
}

// ── Account ──
function openOfflineModal() { $('offlineModal').classList.add('active'); setTimeout(() => $('offlineName').focus(), 100) }
function closeOfflineModal() { $('offlineModal').classList.remove('active') }
function closeConfirmModal() { $('confirmModal').classList.remove('active'); $('confirmOkBtn').textContent = t('ok') }
function showConfirm(title,msg,cb,okLabel) { $('confirmTitle').textContent=title; $('confirmMsg').textContent=msg; $('confirmOkBtn').onclick=()=>{ closeConfirmModal(); if(cb) cb() }; if (okLabel) $('confirmOkBtn').textContent=okLabel; $('confirmModal').classList.add('active') }

function confirmOffline() {
  const name = $('offlineName').value.trim() || DEFAULT_USERNAME;
  const acct = { type: 'offline', name, uuid: crypto.randomUUID() };
  accounts.push(acct);
  currentAccount = acct;
  saveAccounts();
  renderUserList();
  renderProfile();
  closeOfflineModal();
  $('offlineName').value = '';
  toast(t('offlineCreated'), 'success');
}

function renderProfile() {
  const nameEl = $('playerName');
  const badgeEl = $('playerBadge');
  const avatarEl = $('avatar');
  if (currentAccount) {
    nameEl.textContent = currentAccount.name;
    badgeEl.textContent = currentAccount.type === 'microsoft' ? 'Microsoft' : t('offline');
    if (currentAccount.type === 'microsoft' && currentAccount.avatar) {
      avatarEl.innerHTML = `<img src="${currentAccount.avatar}" alt="">`;
    } else {
      avatarEl.innerHTML = `<svg width="20" height="20"><use href="#icon-user"/></svg>`;
    }
  } else {
    nameEl.textContent = t('unLogin');
    badgeEl.textContent = '';
    avatarEl.innerHTML = `<svg width="20" height="20"><use href="#icon-user"/></svg>`;
  }
}


function saveAccounts() {
  localStorage.setItem('wsl_accounts', JSON.stringify(accounts));
  localStorage.setItem('wsl_current', JSON.stringify(currentAccount));
}

function loadAccounts() {
  try {
    const a = localStorage.getItem('wsl_accounts');
    if (a) accounts = JSON.parse(a);
    const c = localStorage.getItem('wsl_current');
    if (c) currentAccount = JSON.parse(c);
  } catch {}
}

function doMsLogin() {
  window.wsl.loginMicrosoft().then(res => {
    if (res && res.name) {
      const acct = { type: 'microsoft', name: res.name, uuid: res.uuid, avatar: res.avatar, token: res.token, refresh: res.refresh };
      const idx = accounts.findIndex(a => a.type === 'microsoft' && a.uuid === acct.uuid);
      if (idx >= 0) accounts[idx] = acct; else accounts.push(acct);
      currentAccount = acct;
      saveAccounts();
      renderUserList();
      renderProfile();
      toast(t('loginSuccess'), 'success');
    }
  }).catch(e => toast(t('loginFailed') + ': ' + (e.message || e), 'error'));
}

function clearAccountCache() {
  for (const a of accounts) {
    if (a.type === 'microsoft') { try { window.wsl.logoutMicrosoft() } catch {} }
  }
  accounts = [];
  currentAccount = null;
  localStorage.removeItem('wsl_accounts');
  localStorage.removeItem('wsl_current');
  renderUserList();
  renderProfile();
  toast('账号缓存已清除', 'success');
}

// ── Launch Account Check ──
async function startLaunch() {
  if (isLaunching) return;
  if (!currentAccount) {
    showConfirm(t('acctNotSelected'), t('acctNoSelectBody') + '\n\n' + t('acctNoSelectNote'), () => doLaunchAnon(), t('launchAnon'));
    return;
  }
  doLaunch();
}

function doLaunch() {
  const verId = $('verSelect').value;
  if (!verId || verId === t('noVersions')) { toast(t('launchErr')+': '+t('selectVer'), 'error'); return }
  const launchName = currentAccount?.name || $('username').value || '';
  if (!launchName.trim()) { toast(t('launchErr')+': 用户名不能为空', 'error'); return }
  isLaunching = true;
  const btn = $('launchBtn');
  const label = $('launchLabel');
  label.textContent = t('launching');
  btn.style.pointerEvents = 'none';
  const config = {
    version: verId, javaPath: $('javaPath').value || DEFAULT_JAVA,
    username: launchName, jvmArgs: $('jvmArgs').value || '',
    minRam: parseInt($('minRam').value) || DEFAULT_MIN_RAM,
    maxRam: parseInt($('maxRam').value) || DEFAULT_MAX_RAM,
    resWidth: $('resWidth').value.trim(), resHeight: $('resHeight').value.trim(), account: currentAccount,
  };
  saveSettings();
  log(t('startLaunch')+' '+verId+'...');
  log('[Launch] username=' + launchName + ' uuid=' + (currentAccount?.uuid || 'offline'));
  window.wsl.launchGame(config).then(handleLaunchResult)
  .catch(e => { log(t('launchFail')+': '+e.message); toast(t('launchErr')+': '+e.message, 'error') })
  .finally(() => { isLaunching = false; label.textContent = t('launch'); btn.style.pointerEvents = '' });
}

function handleLaunchResult(result) {
  if (result?.success) { log(t('launchDone')+' (PID: '+result.pid+')'); return }
  const err = result?.error || t('unknownErr');
  log(t('launchFail')+': '+err);
  toast(t('launchErr')+': '+err, 'error');
  if (result?.needJava) openJavaDlModal(result.needJava);
}

function doLaunchAnon() {
  const verId = $('verSelect').value;
  if (!verId || verId === t('noVersions')) { toast(t('launchErr')+': '+t('selectVer'), 'error'); return }
  isLaunching = true;
  const btn = $('launchBtn');
  const label = $('launchLabel');
  label.textContent = t('launching');
  btn.style.pointerEvents = 'none';
  const config = {
    version: verId, javaPath: $('javaPath').value || DEFAULT_JAVA,
    username: $('username').value || DEFAULT_USERNAME, jvmArgs: $('jvmArgs').value || '',
    minRam: parseInt($('minRam').value) || DEFAULT_MIN_RAM,
    maxRam: parseInt($('maxRam').value) || DEFAULT_MAX_RAM,
    resWidth: $('resWidth').value.trim(), resHeight: $('resHeight').value.trim(), account: null,
  };
  saveSettings();
  log(t('startLaunch')+' '+verId+' (anonymous)...');
  window.wsl.launchGame(config).then(handleLaunchResult)
  .catch(e => { log(t('launchFail')+': '+e.message); toast(t('launchErr')+': '+e.message, 'error') })
  .finally(() => { isLaunching = false; label.textContent = t('launch'); btn.style.pointerEvents = '' });
}

// ── Mirror ──
async function initMirrorSelect() {
  const mirrors = await window.wsl.getMirrors();
  const sel = $('mirrorSelect');
  const saved = parseInt(localStorage.getItem('wsl_mirror_idx')) || 0;
  sel.innerHTML = mirrors.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
  sel.value = saved;
  window.wsl.setMirror(saved);
}

function setMirror(val) {
  const idx = parseInt(val);
  localStorage.setItem('wsl_mirror_idx', idx);
  window.wsl.setMirror(idx);
}

// ── Versions ──
async function loadVersions() {
  const sel = $('verSelect');
  try {
    const list = await window.wsl.getVersions();
    versions = list || [];
    const localIds = await window.wsl.getLocalVersions() || [];
    // Add derived versions (exist on disk but not in Mojang manifest)
    for (const id of localIds) {
      if (!versions.find(v => v.id === id)) {
        versions.push({ id, type: 'loader', releaseTime: '' });
      }
    }
    sel.innerHTML = '';
    const localVersions = versions.filter(v => localIds.includes(v.id));
    if (localVersions.length === 0) { sel.innerHTML = '<option>'+t('noVersions')+'</option>' }
    else {
      localVersions.forEach(v => {
        const o = document.createElement('option');
        o.value = v.id;
        o.textContent = v.id + (v.type ? ' (' + (v.type === 'loader' ? t('loaders') : v.type) + ')' : '');
        sel.appendChild(o);
      });
    }
    onVerSel(sel.value);
    renderVersionGrid();
    loadLocalVersions();
  } catch (e) { sel.innerHTML = '<option>'+t('noVersions')+'</option>' }
}

function onVerSel(id) {
  if (!id || !versions || versions.length === 0) { $('verInfo').textContent = ''; return }
  const v = versions.find(x => x.id === id);
  $('verInfo').textContent = v ? t('verInfo', v.id, v.type || 'release') : '';
}

function getMajorVersion(id) {
  const snapMatch = id.match(/^(\d+)w/i);
  if (snapMatch) return snapMatch[1] + 'w-snapshots';
  const parts = id.split('-')[0].split('.');
  if (parts.length >= 2) return parts[0] + '.' + parts[1];
  return id;
}

function groupVersionsByList(list) {
  const groups = {};
  for (const v of list) {
    const major = getMajorVersion(v.id);
    if (!groups[major]) groups[major] = [];
    groups[major].push(v);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const na = a.split('.').map(Number); const nb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      if ((na[i]||0) !== (nb[i]||0)) return (nb[i]||0) - (na[i]||0);
    }
    return 0;
  });
}

function renderVersionGrid() {
  const grid = $('versionGrid');
  const shown = versions.filter(v => v.type === 'release' || v.type === 'loader');
  if (!shown || shown.length === 0) { grid.innerHTML = '<p class="empty-text">'+t('noVersions')+'</p>'; return }
  const groups = groupVersionsByList(shown);
  grid.innerHTML = groups.map(([major, subs]) => {
    const hasRelease = subs.some(v => v.type === 'release');
    const hasLoader = subs.some(v => v.type === 'loader');
    const latest = subs.filter(v => v.type === 'release').reduce((a, b) => new Date(a.releaseTime) > new Date(b.releaseTime) ? a : b, subs[0]);
    return `
      <div class="ver-card glass ${expandedMajor === major ? 'active' : ''}" onclick="expandMajorVersion('${major}')">
        <div class="ver-name" style="font-size:20px">${major}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${hasRelease ? '<span class="ver-type">release</span>' : ''}
          ${hasLoader ? '<span class="ver-type" style="background:var(--accent2)">loader</span>' : ''}
          <span class="ver-date">${subs.length} ${t('countVer')}</span>
        </div>
        <div class="ver-date">${latest ? new Date(latest.releaseTime).toLocaleDateString() : ''}</div>
        ${expandedMajor === major ? `
          <div class="ver-sub-grid" style="margin-top:10px;border-top:1px solid var(--glass-border);padding-top:10px;display:flex;flex-direction:column;gap:4px">
            ${subs.sort((a,b) => {
              if (a.type === 'loader' && b.type !== 'loader') return 1;
              if (b.type === 'loader' && a.type !== 'loader') return -1;
              return 0;
            }).map(v => `
              <div class="ver-sub-item" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:var(--transition)" onmouseover="this.style.background='var(--glass-hover)'" onmouseout="this.style.background=''" onclick="event.stopPropagation();selectSubVersion('${v.id}')">
                <span style="flex:1;font-size:13px;font-weight:500;color:var(--text)">${v.id}</span>
                <span class="ver-type" style="font-size:10px;${v.type === 'loader' ? 'background:var(--accent2)' : ''}">${v.type === 'loader' ? t('loaders') : (v.type || 'release')}</span>
                <span class="ver-date" style="font-size:11px">${v.releaseTime ? new Date(v.releaseTime).toLocaleDateString() : ''}</span>
                <svg width="14" height="14" style="color:var(--text3);flex-shrink:0"><use href="#icon-play"/></svg>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function expandMajorVersion(major) {
  expandedMajor = expandedMajor === major ? null : major;
  renderVersionGrid();
}

function selectSubVersion(id) {
  $('verSelect').value = id;
  onVerSel(id);
  showVersionDetail(id);
}

// ── Version Detail ──
function showVersionList() {
  $('page-verdetail').classList.remove('active');
  $('page-versions').classList.add('active');
}

async function showVersionDetail(id) {
  const page = $('page-verdetail');
  const content = $('verDetailContent');
  $('page-versions').classList.remove('active');
  page.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === 'versions'));

  content.innerHTML = '<div class="spinner"></div>';
  const meta = await window.wsl.getVersionMeta(id);
  const v = versions.find(x => x.id === id);
  if (!meta && !v) { content.innerHTML = '<p class="empty-text">'+t('unknownErr')+'</p>'; return }

  const info = meta || v;
  const localVersions = await window.wsl.getLocalVersions();
  const isDownloaded = localVersions.includes(id);
  const clientUrl = meta?.downloads?.client?.url || v?.url || '';
  const libCount = meta?.libraries ? meta.libraries.length : 0;

  const loaders = await window.wsl.getLoaders(id);

  content.innerHTML = `
    <div class="ver-detail-head">
      <div class="ver-name-big">${id}</div>
      <div class="ver-type-big">${info.type || 'release'}</div>
      ${isDownloaded ? '<span class="dl-status done">'+t('verDownloaded')+'</span>' : '<span class="dl-status">'+t('verNotDL')+'</span>'}
    </div>
    <div class="ver-detail-info">
      <div class="info-item"><strong>${t('type')}:</strong> ${info.type || 'release'}</div>
      <div class="info-item"><strong>${t('release')}:</strong> ${v ? new Date(v.releaseTime).toLocaleDateString() : '?'}</div>
      <div class="info-item"><strong>${t('libStatus')}:</strong> ${meta ? (libCount + ' ' + t('libOk')) : t('verNotDL')}</div>
    </div>
    <div class="ver-detail-actions">
      ${!isDownloaded && clientUrl ? `<button class="btn btn-primary" onclick="downloadVersion('${id}')"><svg width="14" height="14"><use href="#icon-download"/></svg> ${t('dlVersion')}</button>` : ''}
      ${isDownloaded ? `<button class="btn btn-sm" onclick="window.wsl.openDir(minecraftDir+'/versions/${id}')"><svg width="12" height="12"><use href="#icon-folder"/></svg> ${t('openVerDir')}</button>` : ''}
      ${isDownloaded ? `<button class="btn btn-sm btn-danger" onclick="deleteVersion('${id}')"><svg width="12" height="12"><use href="#icon-delete"/></svg> ${t('delVer')}</button>` : ''}
    </div>
    <div class="ver-loader-section">
      <div class="section-head" style="margin-top:16px"><h3>${t('loaders')}</h3></div>
      ${loaders.length === 0 ? '<p class="empty-text" style="padding:8px 0">'+t('noLoader')+'</p>' : '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">'+loaders.map(l => '<div class="loader-card glass" style="flex:1;min-width:160px;padding:12px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:center;gap:6px"><svg width="18" height="18" style="flex-shrink:0;color:var(--accent)"><use href="#'+(l.icon||'icon-settings')+'"/></svg><div class="loader-name" style="font-weight:600;font-size:14px;color:var(--text)">'+escHtml(l.name)+'</div></div><div class="loader-ver" style="font-size:11px;color:var(--text3)">'+escHtml(l.version)+'</div><button class="btn btn-sm btn-primary" onclick="installLoader(\''+id+'\',\''+escHtml(l.name)+'\',\''+escHtml(l.type)+'\',\''+escHtml(l.version)+'\',\''+escHtml(l.downloadUrl)+'\')" style="width:fit-content"><svg width="12" height="12"><use href="#icon-download"/></svg> '+t('dlLoader')+'</button></div>').join('')+'</div>'}
    </div>
  `;
}

async function installLoader(mcVersion, loaderName, loaderType, loaderVersion, downloadUrl) {
  const newId = mcVersion + '-' + loaderName.toLowerCase();
  showConfirm(t('dlLoader'), '将创建独立衍生版本「' + newId + '」，原版不受影响。', async () => {
    showDlWidget();

    window.wsl.onQueueProgress((items) => updateDlWidget(items));

    const result = await window.wsl.installLoader({ mcVersion, loaderName, loaderType, loaderVersion, downloadUrl, javaPath: $('javaPath').value });

    if (result.alreadyInstalled) {
      hideDlWidget();
      toast(loaderName + ' ' + t('verDownloaded'), 'error');
    } else if (result.success) {
      updateDlWidget([{ name: '衍生版本「' + newId + '」已生成', progress: 100, status: 'done' }]);
      setTimeout(() => { hideDlWidget(); toast('衍生版本「' + newId + '」已生成', 'success'); loadVersions(); }, 1200);
    } else {
      hideDlWidget();
      toast(t('launchFail') + ': ' + (result.error || ''), 'error');
    }
  })
}

async function downloadVersion(id) {
  const v = versions.find(x => x.id === id);
  if (!v) return;
  showDlWidget();
  updateDlWidget([{ name: id, progress: 0, status: 'downloading' }]);
  window.wsl.onInstallProgress((d) => {
    updateDlWidget([{ name: d.message || id, progress: d.pct || 0, status: d.stage === 'done' ? 'done' : d.stage === 'error' ? 'error' : 'downloading' }]);
  });
  log('开始下载并安装版本: ' + id);
  const result = await window.wsl.installVersion(id);
  if (result?.success) {
    updateDlWidget([{ name: id, progress: 100, status: 'done' }]);
    toast(t('verDownloaded') + ': ' + id, 'success');
    await loadVersions();
    await loadLocalVersions();
    setTimeout(() => { hideDlWidget(); showVersionDetail(id) }, 800);
  } else {
    updateDlWidget([{ name: (result?.error || t('unknownErr')), progress: 100, status: 'error' }]);
    toast(t('launchFail') + ': ' + (result?.error || t('unknownErr')), 'error');
  }
}

async function deleteVersion(id) {
  showConfirm(t('confirmDel'), '', async () => {
    const ok = await window.wsl.deleteFile(minecraftDir + '/versions/' + id);
    if (ok) { toast(t('verDeleted')); await loadVersions() }
  });
}

// ── Local Versions ──
async function loadLocalVersions() {
  const el = $('localVerList');
  try {
    const list = await window.wsl.getLocalVersions();
    if (!list || list.length === 0) { el.innerHTML = '<p class="empty-text">'+t('noDownloaded')+'</p>'; return }
    el.innerHTML = list.map(id => `
      <div class="local-ver-item glass">
        <span class="lv-name">${escHtml(id)}</span>
        <div class="lv-actions">
          <button class="btn btn-sm btn-primary" onclick="quickLaunch('${id}')"><svg width="12" height="12"><use href="#icon-play"/></svg> ${t('launch')}</button>
          <button class="btn btn-sm" onclick="window.wsl.openDir(minecraftDir+'/versions/${id}')"><svg width="12" height="12"><use href="#icon-folder"/></svg> ${t('openVerDir')}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVersion('${id}')"><svg width="12" height="12"><use href="#icon-delete"/></svg> ${t('delete')}</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

function quickLaunch(id) {
  $('verSelect').value = id;
  onVerSel(id);
  switchPage('home');
  setTimeout(() => startLaunch(), 100);
}

// ── Mods ──
async function preinstallMods() {
  const verId = $('verSelect').value;
  if (!verId || verId === t('noVersions')) { toast(t('selVerFirst'), 'error'); return }
  toast(t('preinstallRunning'));
  try {
    const r = await window.wsl.preinstallMods(verId);
    if (!r?.success) {
      toast(t('preinstallFail') + ': ' + (r?.error || t('unknownErr')), 'error');
      return;
    }
    if (r.installed?.length) toast(t('preinstallDone') + ': ' + r.installed.join(', '), 'success');
    else toast(t('preinstallNone'));
    loadMods();
  } catch (e) {
    toast(t('preinstallFail') + ': ' + e.message, 'error');
  }
}

async function loadMods() {
  const grid = $('modsGrid');
  try {
    const list = await window.wsl.listMods();
    mods = list || [];
    applyModFilter();
  } catch (e) { grid.innerHTML = '<p class="empty-text">'+t('modNone')+'</p>' }
}

function applyModFilter() {
  const grid = $('modsGrid');
  const q = ($('modSearch').value || '').toLowerCase();
  const filtered = q ? mods.filter(m => m.name.toLowerCase().includes(q)) : mods;
  if (filtered.length === 0) { grid.innerHTML = '<p class="empty-text">' + (q ? t('search')+': '+q : t('modNone')) + '</p>'; return }
  grid.innerHTML = filtered.map(m => `
    <div class="mod-card glass">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;min-width:0">
          <div class="mod-name">${escHtml(m.name)}</div>
          <div class="mod-version">${m.version}</div>
        </div>
        <button class="mod-toggle-btn ${m.enabled ? 'active' : ''}" onclick="toggleMod('${m.filename}')" title="${m.enabled ? t('modToggleOn') : t('modToggleOff')}"></button>
      </div>
      ${m.description ? '<div class="mod-desc">'+escHtml(m.description)+'</div>' : ''}
    </div>
  `).join('');
}

function filterMods() { applyModFilter() }

async function toggleMod(filename) {
  await window.wsl.toggleMod(filename);
  loadMods();
}

// ── Settings ──
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('wsl_settings') || '{}');
    $('javaPath').value = s.javaPath || DEFAULT_JAVA;
    $('username').value = s.username || DEFAULT_USERNAME;
    $('jvmArgs').value = s.jvmArgs || '';
    $('minRam').value = s.minRam || DEFAULT_MIN_RAM;
    $('maxRam').value = s.maxRam || DEFAULT_MAX_RAM;
    $('resWidth').value = s.resWidth || '';
    $('resHeight').value = s.resHeight || '';
    updateMemLabels();
    if (s.lang) { lang = s.lang; $('langSelect').value = lang }
    if (s.theme) setTheme(s.theme);
  } catch {}
}

function saveSettings() {
  const s = {
    javaPath: $('javaPath').value, username: $('username').value,
    jvmArgs: $('jvmArgs').value, minRam: parseInt($('minRam').value),
    maxRam: parseInt($('maxRam').value), resWidth: $('resWidth').value, resHeight: $('resHeight').value, lang,
    theme: document.documentElement.getAttribute('data-theme') || 'default',
  };
  localStorage.setItem('wsl_settings', JSON.stringify(s));
}

function updateMemLabels() {
  $('minRamVal').textContent = (parseInt($('minRam').value) / 1024).toFixed(1) + 'G';
  $('maxRamVal').textContent = (parseInt($('maxRam').value) / 1024).toFixed(1) + 'G';
}

function setLang(l) {
  lang = l;
  localStorage.setItem('wsl_lang', l);
  applyLang();
  renderProfile();
  loadVersions();
  saveSettings();
}

// ── Java ──
async function browseJava() {
  const p = await window.wsl.browseJava();
  if (p) { $('javaPath').value = p; saveSettings() }
}
async function detectJava() {
  const sel = $('verSelect').value;
  const mcVer = sel && sel !== t('noVersions') ? sel : '';
  const r = await window.wsl.detectBestJava(mcVer);
  if (r && r.path) {
    $('javaPath').value = r.path;
    saveSettings();
    toast(t('javaFound') + ' ' + r.path + (r.major ? ' (Java ' + r.major + ')' : ''));
  } else toast(t('noJava'), 'error');
}

// ── Log ──
function log(msg) {
  const box = $('logBox');
  const el = document.createElement('div');
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function clearLog() { $('logBox').innerHTML = '' }

// ── Launch ──
function updateProgress(pct) {
  const bar = $('launchProgress');
  bar.style.width = Math.min(pct, 100) + '%';
  if (pct >= 100) setTimeout(() => bar.style.width = '0', 600);
}

// ── Resources ──
function switchResTab(el) {
  document.querySelectorAll('.res-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  resType = el.dataset.type;
  const filtered = getFilteredResources();
  console.log('[Tab] switch to type=' + resType + ' totalAll=' + resDataAll.length + ' filtered=' + filtered.length);
  renderResourceGrid(filtered);
  if (resDataAll.length === 0) loadResources(true);
}

function getFilteredResources() {
  if (resType === 'all' || !resType) return resDataAll;
  return resDataAll.filter(r => r.project_type === resType);
}

function switchResSource() {
  resSource = resSource === 'modrinth' ? 'curseforge' : 'modrinth';
  const btn = $('resSourceBtn');
  const isMr = resSource === 'modrinth';
  btn.textContent = isMr ? 'Modrinth' : 'CurseForge';
  btn.className = 'btn btn-sm ' + (isMr ? 'modrinth' : 'curseforge');
  resPage = 0; resDataAll = []; resHasMore = true; loadResources(true);
}

function refreshResources() { resPage = 0; resDataAll = []; resHasMore = true; loadResources(true) }

// ── Modpack Import ──
let importRunning = false;
let pendingPackPath = '';

function formatSize(n) {
  const num = Number(n) || 0;
  if (num <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = num;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return (i === 0 ? v.toFixed(0) : v.toFixed(1)) + ' ' + units[i];
}

function closePackPreview() { $('packPreviewModal').classList.remove('active') }

async function importModpack() {
  if (importRunning) return;
  toast(t('packPreparing'));
  const parsed = await window.wsl.parseModpack();
  if (parsed?.canceled) return;
  if (!parsed?.success) {
    toast(t('importFail') + ': ' + (parsed?.error || t('unknownErr')), 'error');
    return;
  }
  pendingPackPath = parsed.filePath;
  $('packPreviewTitle').textContent = parsed.name + ' ' + parsed.version;
  const loaderText = parsed.loader ? parsed.loader.name + ' ' + parsed.loader.version : t('packVanilla');
  $('packPreviewSummary').innerHTML = `
    <div>${t('packLoader')}: <strong>${escHtml(loaderText)}</strong></div>
    <div>Minecraft: <strong>${escHtml(parsed.mcVersion)}</strong></div>
    <div>${t('packFiles')}: <strong>${parsed.fileCount}</strong> &nbsp;·&nbsp; ${t('packSize')}: <strong>${formatSize(parsed.totalSize)}</strong> &nbsp;·&nbsp; ${t('packOverrides')}: <strong>${parsed.overrideCount}</strong></div>
  `;
  const files = parsed.files || [];
  $('packPreviewList').innerHTML = files.length
    ? files.map(f => `<div style="display:flex;gap:8px;padding:3px 4px;border-bottom:1px solid var(--glass-border)"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2)">${escHtml(f.path)}</span><span style="color:var(--text3);flex-shrink:0">${formatSize(f.size)}</span></div>`).join('') + (parsed.fileCount > files.length ? `<div style="padding:6px 4px;color:var(--text3)">${t('packMore')}</div>` : '')
    : '<p class="empty-text" style="padding:8px">' + t('packNoFiles') + '</p>';
  $('packPreviewOkBtn').onclick = () => { closePackPreview(); runModpackImport(pendingPackPath) };
  $('packPreviewModal').classList.add('active');
}

async function runModpackImport(filePath) {
  if (importRunning) return;
  importRunning = true;
  const box = $('importStatus'), text = $('importStatusText'), bar = $('importBar'), pct = $('importPct');
  box.style.display = 'flex';
  text.textContent = t('importing');
  bar.style.width = '0%';
  pct.textContent = '0%';
  try {
    const result = await window.wsl.importModpack(filePath, { javaPath: $('javaPath').value || DEFAULT_JAVA });
    if (result?.canceled) { box.style.display = 'none'; return }
    if (!result?.success) {
      text.textContent = t('importFail');
      toast(t('importFail') + ': ' + (result?.error || t('unknownErr')), 'error');
      return;
    }
    text.textContent = result.failed ? t('importDone') + ' (' + result.failed + ' failed)' : t('importDone');
    bar.style.width = '100%';
    pct.textContent = '100%';
    toast(t('importDone') + ': ' + result.name, 'success');
    await loadVersions();
    if (result.versionId) { $('verSelect').value = result.versionId; onVerSel(result.versionId) }
  } catch (e) {
    text.textContent = t('importFail');
    toast(t('importFail') + ': ' + e.message, 'error');
  } finally {
    importRunning = false;
    setTimeout(() => { box.style.display = 'none' }, 3000);
  }
}

function debounceSearch() {
  clearTimeout(resSearchTimer);
  resSearchTimer = setTimeout(() => { resPage = 0; resDataAll = []; resHasMore = true; loadResources(true) }, 300);
}

const RESOURCE_TYPES = ['mod', 'modpack', 'shader', 'resourcepack', 'world'];

async function loadResources(reset) {
  const grid = $('resGrid');
  const q = ($('resSearch').value || '').trim();
  if (resLoading) return;
  resLoading = true;

  if (reset) {
    grid.innerHTML = '<div class="spinner"></div>';
    resPage = 0;
    resDataAll = [];
    resHasMore = true;
  }

  try {
    if (resSource === 'curseforge') {
      const opts = { query: q || undefined, type: resType !== 'all' ? resType : undefined, limit: 40, offset: reset ? 0 : resPage * 40 };
      const hits = await window.wsl.cfSearch(opts);
      if (hits.length < 40) resHasMore = false;
      resDataAll = reset ? hits : resDataAll.concat(hits);
      renderResourceGrid(getFilteredResources());
      if (reset) resPage = 1; else resPage++;
    } else if (reset && !q) {
      const requests = [window.wsl.searchResources({ query: undefined, type: undefined, limit: 40, offset: 0 })];
      for (const t of RESOURCE_TYPES) requests.push(window.wsl.searchResources({ query: undefined, type: t, limit: 40, offset: 0 }));
      const results = await Promise.all(requests);
      const allHits = [];
      let anyFull = false;
      for (const r of results) {
        const h = r?.hits || [];
        allHits.push(...h);
        if (h.length >= 40) anyFull = true;
      }
      resHasMore = anyFull;
      const seen = new Set();
      resDataAll = allHits.filter(r => { const k = r.project_id; if (seen.has(k)) return false; seen.add(k); return true });
      renderResourceGrid(getFilteredResources());
    } else {
      const offset = resPage * 40;
      const result = await window.wsl.searchResources({ query: q || undefined, type: undefined, limit: 40, offset });
      const hits = result?.hits || [];
      if (hits.length < 40) resHasMore = false;
      resDataAll = reset ? hits : resDataAll.concat(hits);
      renderResourceGrid(getFilteredResources());
    }
    if (resSource !== 'curseforge') resPage++;
  } catch (e) {
    if (reset) {
      grid.innerHTML = '<p class="empty-text">'+String(e)+'</p>';
      resLoading = false;
      return;
    }
  }
  resLoading = false;
}

function renderResourceGrid(list) {
  const grid = $('resGrid');
  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-text">' + t('noRes') + '</p>';
    return;
  }
  grid.innerHTML = list.map(r => {
    const iconHtml = r.icon_url ? '<img src="" data-src="' + r.icon_url + '" class="lazy-img" alt="" loading="lazy">' : '';
    return `
      <div class="res-card glass" onclick="showResourceDetail('${r.project_id}')">
        ${iconHtml}
        <div class="res-info">
          <div class="res-name">${escHtml(r.title)}</div>
          <div class="res-author">${r.author || ''}</div>
          <div class="res-desc">${escHtml(r.description || '')}</div>
          <div class="res-meta">
            <span>${r.project_type || ''}</span>
            <span>⬇ ${r.downloads || 0}</span>
            <span>★ ${r.follows || 0}</span>
          </div>
        </div>
      </div>
    `;
  }).join('') + (resHasMore ? '<p class="empty-text" style="padding:16px" id="resLoadMore">' + t('loadMore') + '</p>' : '<p class="empty-text" style="padding:16px;color:var(--text3)">' + t('loadedAll') + '</p>');

  setTimeout(() => {
    document.querySelectorAll('.lazy-img').forEach(img => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = img.dataset.src;
            img.classList.remove('lazy-img');
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });
      observer.observe(img);
    });
  }, 100);
}

// Infinite scroll for resources
$('content').addEventListener('scroll', () => {
  const el = $('content');
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300 && resHasMore && !resLoading && $('page-resources').classList.contains('active')) {
    loadResources(false);
  }
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300 && skinNext && !skinLoading && $('page-skins').classList.contains('active')) {
    loadSkins(false);
  }
});

function showResourceList() {
  $('page-resdetail').classList.remove('active');
  $('page-resources').classList.add('active');
}

function baseGameVersion(id) {
  return id ? id.replace(/-(fabric|forge|quilt|neoforge)(-.*)?$/i, '') : id;
}

function subfolderForType(t) {
  if (t === 'shader') return 'shaderpacks';
  if (t === 'resourcepack') return 'resourcepacks';
  if (t === 'world') return 'saves';
  return 'mods';
}

let currentDetailType = 'mod';

function mdToHtml(md) {
  if (!md) return '';
  // Strip raw HTML tags (img, center, div, a etc.) that break text readability
  let h = md
    .replace(/<[^>]*>/g, '')
    .replace(/### (.+)/g, '<h3 style="font-size:15px;font-weight:600;color:var(--text);margin:16px 0 6px">$1</h3>')
    .replace(/## (.+)/g, '<h2 style="font-size:17px;font-weight:600;color:var(--text);margin:18px 0 6px">$1</h2>')
    .replace(/# (.+)/g, '<h1 style="font-size:19px;font-weight:700;color:var(--text);margin:20px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-size:12px;padding:1px 4px;border-radius:3px;background:var(--glass-hover);color:var(--accent)">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/^[-*] (.+)/gm, '<li style="margin:2px 0 2px 16px;color:var(--text2)">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;color:var(--text2);line-height:1.7">');
  if (!h.startsWith('<')) h = '<p style="margin:8px 0;color:var(--text2);line-height:1.7">' + h + '</p>';
  return h;
}

let lightboxImages = [];
let lightboxIndex = 0;
let currentProjectId = null;
let currentGalleryUrls = [];
let currentBodyOriginal = '';
let currentBodyRaw = '';
let currentVersions = [];
let currentLoaderFilter = 'all';
let currentVersionProjectId = '';

function openLightbox(images, index) {
  lightboxImages = images;
  lightboxIndex = index;
  updateLightbox();
  $('imageLightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  $('imageLightbox').classList.remove('active');
  document.body.style.overflow = '';
}
function prevImage() {
  if (!lightboxImages.length) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightbox();
}
function nextImage() {
  if (!lightboxImages.length) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  updateLightbox();
}
function updateLightbox() {
  const img = $('lightboxImg');
  const counter = $('lightboxCounter');
  img.src = lightboxImages[lightboxIndex];
  counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
}
document.addEventListener('keydown', e => {
  if (!$('imageLightbox').classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevImage();
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextImage();
});
$('imageLightbox').addEventListener('wheel', e => {
  if (!$('imageLightbox').classList.contains('active')) return;
  e.preventDefault();
  if (e.deltaY > 0) nextImage(); else prevImage();
}, { passive: false });

async function translateBody() {
  const btn = document.querySelector('.btn-translate');
  const body = $('resDetailContent').querySelector('.res-body');
  if (!body || (!currentBodyOriginal && !currentBodyRaw)) return;
  if (btn.classList.contains('done')) {
    body.innerHTML = currentBodyOriginal;
    btn.classList.remove('done');
    btn.textContent = t('translate');
    return;
  }
  btn.classList.add('translating');
  btn.textContent = t('translate') + '...';
  const targetLang = lang === 'zh' ? 'zh-CN' : 'en';
  const textToTranslate = currentBodyRaw || '';
  if (!textToTranslate) { btn.classList.remove('translating'); btn.textContent = t('translate'); return }
  const translated = await window.wsl.translateText(textToTranslate, targetLang);
  if (translated) {
    body.innerHTML = mdToHtml(translated);
    btn.classList.remove('translating');
    btn.classList.add('done');
    btn.textContent = t('translateDone');
  } else {
    btn.classList.remove('translating');
    btn.textContent = t('translate');
    toast(t('unknownErr'), 'error');
  }
}

async function showResourceDetail(projectId) {
  const page = $('page-resdetail');
  const content = $('resDetailContent');
  $('page-resources').classList.remove('active');
  page.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === 'resources'));

  content.innerHTML = '<div class="spinner"></div>';
  const isCf = resSource === 'curseforge';
  const detail = isCf ? await window.wsl.cfDetail(projectId) : await window.wsl.getResourceDetail(projectId);
  if (!detail) { content.innerHTML = '<p class="empty-text">'+t('unknownErr')+'</p>'; return }
  currentDetailType = detail.project_type || 'mod';
  currentProjectId = projectId;
  const selectedVer = $('verSelect').value;
  const apiVer = selectedVer !== t('noVersions') && selectedVer ? baseGameVersion(selectedVer) : undefined;
  console.log('[ResAPI] getResourceVersions project=' + projectId + ' gameVersion=' + (apiVer || 'none') + ' source=' + resSource);
  const versions = isCf ? await window.wsl.cfVersions(projectId, apiVer) : await window.wsl.getResourceVersions(projectId, apiVer);
  const latestVer = versions && versions.length > 0 ? versions[0] : null;

  currentVersions = versions || [];
  currentLoaderFilter = 'all';
  currentVersionProjectId = projectId;
  const hasRes = versions && versions.length > 0;

  const gallery = detail.gallery && detail.gallery.length > 0 ? detail.gallery.filter(g => g.url) : [];
  currentGalleryUrls = gallery.map(g => g.url);
  const categories = detail.categories && detail.categories.length > 0 ? detail.categories : [];

  const pubDate = detail.published ? new Date(detail.published).toLocaleDateString() : '';
  const updDate = detail.updated ? new Date(detail.updated).toLocaleDateString() : '';
  const licenseName = detail.license ? detail.license.name || detail.license.id || '' : '';
  const sideMap = { required: '需要', optional: '可选', unsupported: '不支持', client: '仅客户端', server: '仅服务端' };
  const clientSide = sideMap[detail.client_side] || detail.client_side || '';
  const serverSide = sideMap[detail.server_side] || detail.server_side || '';

  const links = [];
  if (detail.issues_url) links.push('<a href="'+detail.issues_url+'" target="_blank" class="res-link">问题追踪</a>');
  if (detail.source_url) links.push('<a href="'+detail.source_url+'" target="_blank" class="res-link">源代码</a>');
  if (detail.wiki_url) links.push('<a href="'+detail.wiki_url+'" target="_blank" class="res-link">Wiki</a>');
  if (detail.discord_url) links.push('<a href="'+detail.discord_url+'" target="_blank" class="res-link">Discord</a>');
  if (detail.donation_urls && detail.donation_urls.length) {
    detail.donation_urls.forEach(d => { if (d.url) links.push('<a href="'+d.url+'" target="_blank" class="res-link">赞助</a>') });
  }

  const bodyRaw = detail.body || detail.description || '';
  const bodyHtml = bodyRaw ? mdToHtml(bodyRaw) : '';
  currentBodyOriginal = bodyHtml || '<p style="margin:8px 0;color:var(--text2);line-height:1.7">'+escHtml(detail.description || t('noDesc'))+'</p>';
  currentBodyRaw = bodyRaw;

  content.innerHTML = `
    <div class="ver-detail-head">
      ${detail.icon_url ? '<img src="'+detail.icon_url+'" style="width:48px;height:48px;border-radius:8px">' : ''}
      <div class="ver-name-big">${escHtml(detail.title)}</div>
      <div class="ver-type-big">${detail.project_type || ''}</div>
    </div>

    ${gallery.length > 0 ? '<div class="res-gallery">'+gallery.map((g, i) => '<div class="gallery-item" onclick="openLightbox(currentGalleryUrls,'+i+')"><img src="'+g.url+'" alt="'+(g.title||'')+'" loading="lazy"></div>').join('')+'</div>' : ''}

    <div class="ver-detail-info">
      <div class="info-item"><strong>${t('type')}:</strong> ${detail.project_type || '?'}</div>
      <div class="info-item"><strong>${t('lang')}:</strong> ${detail.author || '?'}</div>
      <div class="info-item"><strong>⬇ ${detail.downloads || 0}</strong></div>
      <div class="info-item"><strong>★ ${detail.follows || 0}</strong></div>
      <div class="info-item"><strong>发布:</strong> ${pubDate || '?'}</div>
      <div class="info-item"><strong>更新:</strong> ${updDate || '?'}</div>
      ${licenseName ? '<div class="info-item"><strong>许可证:</strong> '+escHtml(licenseName)+'</div>' : ''}
      ${clientSide || serverSide ? '<div class="info-item"><strong>环境:</strong> 客户端'+escHtml(clientSide ? ' - '+clientSide : '')+' · 服务端'+escHtml(serverSide ? ' - '+serverSide : '')+'</div>' : ''}
      <div class="info-item"><strong>${t('applyVer')}:</strong> ${selectedVer && selectedVer !== t('noVersions') ? escHtml(baseGameVersion(selectedVer)) : '<span style="color:var(--text3)">'+t('selVerFirst')+'</span>'}</div>
    </div>

    ${categories.length > 0 ? '<div class="res-categories">'+categories.map(c => '<span class="res-tag">'+escHtml(c)+'</span>').join('')+'</div>' : ''}

    ${links.length > 0 ? '<div class="res-links">'+links.join('')+'</div>' : ''}

    <div class="ver-detail-actions">
      ${latestVer ? `<button class="btn btn-primary" onclick="downloadResource('${projectId}', '${latestVer.version_number}')"><svg width="14" height="14"><use href="#icon-download"/></svg> ${t('dlVersion')} (${escHtml(latestVer.version_number)})</button>` : (apiVer ? '<span class="dl-status">'+t('verNoRes')+'</span>' : '<span class="dl-status" style="color:var(--danger)">'+t('selVerFirst')+'</span>')}
      <button class="btn btn-sm" onclick="window.wsl.openDir(minecraftDir+'/mods')"><svg width="12" height="12"><use href="#icon-folder"/></svg> ${t('openFolder')}</button>
    </div>
    <div style="font-size:12px;color:var(--text3);padding:4px 0">
      ${t('dlVersion')} <strong>${escHtml(selectedVer && selectedVer !== t('noVersions') ? baseGameVersion(selectedVer) : t('selVerFirst'))}</strong>
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
      <span style="font-size:13px;font-weight:500;color:var(--text)">介绍</span>
      <button class="btn-translate" onclick="translateBody()">${t('translate')}</button>
    </div>
    <div class="res-body">
      ${bodyHtml || '<p style="margin:8px 0;color:var(--text2);line-height:1.7">'+escHtml(detail.description || t('noDesc'))+'</p>'}
    </div>

    ${hasRes ? '<div class="ver-list-section" id="verListSection"><h4 style="margin:12px 0 8px;font-size:14px;color:var(--text)">'+t('dlVersion')+' <span style="font-size:12px;color:var(--text3);font-weight:400" id="verCount">('+versions.length+')</span></h4><div class="loader-filter-bar" id="loaderFilterBar"><button class="loader-filter-btn active" data-loader="all" onclick="setLoaderFilter(\x27all\x27)">全部</button><button class="loader-filter-btn" data-loader="forge" onclick="setLoaderFilter(\x27forge\x27)">Forge</button><button class="loader-filter-btn" data-loader="fabric" onclick="setLoaderFilter(\x27fabric\x27)">Fabric</button><button class="loader-filter-btn" data-loader="quilt" onclick="setLoaderFilter(\x27quilt\x27)">Quilt</button><button class="loader-filter-btn" data-loader="neoforge" onclick="setLoaderFilter(\x27neoforge\x27)">NeoForge</button></div><div id="verList">'+renderVersionItems(versions, projectId)+'</div></div>' : ''}
  `;
}

function renderVersionItems(vers, projId) {
  const filtered = currentLoaderFilter === 'all' ? vers : vers.filter(v => v.loaders && v.loaders.some(l => l.toLowerCase() === currentLoaderFilter));
  if (!filtered.length) return '<p style="font-size:12px;color:var(--text3);padding:12px 0;text-align:center">暂无匹配版本</p>';
  return filtered.slice(0, 30).map(v => {
    const verNum = escHtml(v.version_number || '');
    const verType = v.version_type ? '<span class="ver-type" style="font-size:10px">'+escHtml(v.version_type)+'</span>' : '';
    const dateStr = v.date_published ? new Date(v.date_published).toLocaleDateString() : '';
    const loaders = v.loaders && v.loaders.length ? v.loaders.map(l => '<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:var(--accent-dim);color:var(--accent);margin-right:3px">'+l+'</span>') : '';
    const gameVers = v.game_versions && v.game_versions.length ? v.game_versions.join(', ') : '';
    const gameVerHtml = gameVers ? '<span style="font-size:10px;color:var(--text3);margin-left:4px">'+escHtml(gameVers)+'</span>' : '';
    return '<div class="ver-sub-item" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:var(--transition)" onmouseover="this.style.background=\x27var(--glass-hover)\x27" onmouseout="this.style.background=\x27\x27" onclick="downloadResource(\x27'+projId+'\x27,\x27'+v.version_number+'\x27)"><span style="flex:1;font-size:13px;font-weight:500;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+verNum+'</span> '+verType+' '+loaders+' '+gameVerHtml+' <span style="font-size:11px;color:var(--text3);flex-shrink:0">'+dateStr+'</span><svg width="14" height="14" style="color:var(--text3);flex-shrink:0"><use href="#icon-download"/></svg></div>';
  }).join('');
}
function setLoaderFilter(loader) {
  currentLoaderFilter = loader;
  document.querySelectorAll('.loader-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.loader === loader));
  const list = $('verList');
  if (list) list.innerHTML = renderVersionItems(currentVersions, currentVersionProjectId);
  const count = $('verCount');
  if (count) {
    const filtered = loader === 'all' ? currentVersions : currentVersions.filter(v => v.loaders && v.loaders.some(l => l.toLowerCase() === loader));
    count.textContent = '(' + filtered.length + ')';
  }
}

async function downloadResource(projectId, versionNumber) {
  const selectedVer = $('verSelect').value;
  if (!selectedVer || selectedVer === t('noVersions')) { toast(t('selVerFirst'), 'error'); return }
  const baseVer = baseGameVersion(selectedVer);
  const msg = t('verConfirm', baseVer, versionNumber);
  showConfirm(t('dlVersion'), msg, async () => {
    const versions = await window.wsl.getResourceVersions(projectId, baseVer);
    const v = versions.find(x => x.version_number === versionNumber) || versions[0];
    if (!v || !v.files || v.files.length === 0) { toast(t('unknownErr'), 'error'); return }
    const file = v.files[0];
    if (currentDetailType === 'modpack') {
      if (resSource !== 'modrinth') { toast(t('importOnlyModrinth'), 'error'); return }
      const packDir = minecraftDir + '/modpacks';
      await window.wsl.ensureDir(packDir);
      const packPath = packDir + '/' + file.filename;
      showDlWidget();
      const pid = await window.wsl.queueDownload([{ url: file.url, dest: packPath, name: file.filename }]);
      currentQueueId = pid;
      window.wsl.onQueueProgress((items) => updateDlWidget(items));
      await runModpackImport(packPath);
      return;
    }
    const subfolder = subfolderForType(currentDetailType);
    const dest = minecraftDir + '/' + subfolder + '/' + file.filename;
    const qid = await window.wsl.queueDownload([{ url: file.url, dest, name: file.filename }]);
    currentQueueId = qid;
    showDlWidget();
    window.wsl.onQueueProgress((items) => {
      updateDlWidget(items);
      if (items.every(i => i.status === 'done')) toast(file.filename+' '+t('verDownloaded'), 'success');
    });
  });
}

// ── Mirror ──
function loadMirrors() {
  const el = $('mirrorList');
  el.innerHTML = '<div class="spinner"></div>';
  speedTest();
}

async function speedTest() {
  const el = $('mirrorList');
  el.innerHTML = '<p class="empty-text">'+t('refresh')+'...</p>';
  try {
    const results = await window.wsl.speedTest();
    const mirrors = await window.wsl.getMirrors();
    const sel = parseInt(localStorage.getItem('wsl_mirror_idx')) || 0;
    el.innerHTML = results.map((r, i) => `
      <div class="mirror-item glass" onclick="selectMirror(${i})" style="cursor:pointer;${i === sel ? 'border-color:var(--accent)' : ''}">
        <div><span class="mirror-name">${mirrors[i]?.name || r.name}</span><br><span style="font-size:11px;color:var(--text3)">${mirrors[i]?.url || ''}</span></div>
        <span class="mirror-ping ${r.ok ? 'ok' : 'fail'}">${r.ping}</span>
      </div>
    `).join('');
  } catch (e) { el.innerHTML = '<p class="empty-text">'+String(e)+'</p>' }
}

function selectMirror(idx) {
  localStorage.setItem('wsl_mirror_idx', idx);
  window.wsl.setMirror(idx);
  $('mirrorSelect').value = idx;
  speedTest();
}

// ── Java Download ──
let javaDlTargetMajor = 0;
function openJavaDlModal(major) {
  javaDlTargetMajor = Number(major) || 0;
  const msg = $('javaDlMsg');
  if (msg) {
    msg.textContent = javaDlTargetMajor
      ? '当前版本需要 Java ' + javaDlTargetMajor + '，是否自动下载并安装？'
      : t('javaDlMsg');
  }
  $('javaDlProgress').style.display = 'none';
  $('javaDlAutoBtn').style.display = '';
  $('javaDlBrowseBtn').style.display = '';
  $('javaDlLaterBtn').style.display = '';
  $('javaDlRetryBtn').style.display = 'none';
  $('javaDlModal').classList.add('active');
}

function closeJavaDlModal() {
  $('javaDlModal').classList.remove('active');
}

function browseJavaForDl() {
  closeJavaDlModal();
  detectJava();
}

async function startJavaDownload() {
  const bar = $('javaDlBar');
  const speed = $('javaDlSpeed');
  const filename = $('javaDlFilename');
  $('javaDlAutoBtn').style.display = 'none';
  $('javaDlBrowseBtn').style.display = 'none';
  $('javaDlLaterBtn').style.display = 'none';
  $('javaDlRetryBtn').style.display = 'none';
  $('javaDlProgress').style.display = '';
  bar.style.width = '0%';
  speed.textContent = '';
  filename.textContent = t('javaDlNeed') + '...';

  window.wsl.onJavaDlProgress((d) => {
    if (typeof d.pct === 'number') bar.style.width = d.pct + '%';
    if (d.speed) speed.textContent = d.speed;
    if (d.filename) filename.textContent = d.filename;
  });

  const sel = $('verSelect').value;
  const mcVer = sel && sel !== t('noVersions') ? sel : '';
  try {
    const result = await window.wsl.downloadJava({ mcVersion: mcVer, major: javaDlTargetMajor || undefined });
    if (result.success) {
      bar.style.width = '100%';
      speed.textContent = result.reused ? t('javaReused') : t('javaDlDone');
      $('javaPath').value = result.path;
      saveSettings();
      setTimeout(closeJavaDlModal, 1500);
    } else {
      speed.textContent = t('javaDlFail') + ': ' + (result.error || '');
      $('javaDlRetryBtn').style.display = '';
    }
  } catch (e) {
    speed.textContent = t('javaDlFail') + ': ' + e.message;
    $('javaDlRetryBtn').style.display = '';
  }
}

// ── Download Widget ──
function showDlWidget() {
  $('dlWidget').classList.add('visible');
  $('dlWidget').classList.remove('minimized');
}

function hideDlWidget() { $('dlWidget').classList.remove('visible') }

function toggleDlWidget() {
  $('dlWidget').classList.toggle('minimized');
}

function updateDlWidget(items) {
  const body = $('dlwBody');
  const badge = $('dlBadge');
  const done = items.filter(i => i.status === 'done' || i.status === 'error').length;
  badge.textContent = done + '/' + items.length;
  body.innerHTML = items.map(i => `
    <div class="dlw-item ${i.status}">
      <div class="dlw-name">${i.name || ''}</div>
      <div class="dlw-bar"><div class="dlw-fill" style="width:${i.status === 'done' ? 100 : i.status === 'error' ? 100 : i.progress || 0}%"></div></div>
      <div class="dlw-status">${i.status === 'done' ? t('launchOk') : i.status === 'error' ? t('launchFail') : i.status === 'downloading' ? (i.progress||0)+'%' : i.status}</div>
    </div>
  `).join('');
}

// ── Helpers ──
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ── Events ──
$('minRam').addEventListener('input', () => {
  const min = parseInt($('minRam').value); const max = parseInt($('maxRam').value);
  if (min > max) $('maxRam').value = min;
  updateMemLabels(); saveSettings();
});
$('maxRam').addEventListener('input', () => {
  const min = parseInt($('minRam').value); const max = parseInt($('maxRam').value);
  if (max < min) $('minRam').value = max;
  updateMemLabels(); saveSettings();
});
$('javaPath').addEventListener('change', saveSettings);
$('username').addEventListener('change', saveSettings);
$('jvmArgs').addEventListener('change', saveSettings);
$('resWidth').addEventListener('change', saveSettings);
$('resHeight').addEventListener('change', saveSettings);

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('offlineModal').classList.contains('active')) closeOfflineModal(); if ($('userModal').classList.contains('active')) closeUserModal() }
  if (e.key === 'Enter' && $('offlineModal').classList.contains('active')) confirmOffline();
});

window.wsl.onLog((msg) => { console.log('[BOT-LOG] ' + msg); log(msg) });
window.wsl.onImportProgress((d) => {
  const box = $('importStatus');
  if (!box) return;
  box.style.display = 'flex';
  $('importStatusText').textContent = d.message || '';
  $('importBar').style.width = (d.percent || 0) + '%';
  $('importPct').textContent = (d.percent || 0) + '%';
  log('[Import] ' + (d.message || ''));
});
window.wsl.onProgress((pct) => updateProgress(pct));
window.wsl.onDownloadProgress((d) => { if (d.pct) updateProgress(d.pct) });

async function tryAutoLogin() {
  const msAccount = accounts.find(a => a.type === 'microsoft' && a.refresh);
  if (!msAccount) return;
  try {
    const res = await window.wsl.loginMicrosoft(msAccount.refresh);
    if (res && res.name) {
      const acct = { type: 'microsoft', name: res.name, uuid: res.uuid, avatar: res.avatar, token: res.token, refresh: res.refresh };
      const idx = accounts.findIndex(a => a.type === 'microsoft' && a.uuid === acct.uuid);
      if (idx >= 0) accounts[idx] = acct; else accounts.push(acct);
      currentAccount = acct;
      saveAccounts();
      renderUserList();
      renderProfile();
      $('playerBadge').textContent = 'Microsoft';
    }
  } catch (e) { console.log('[AUTH] refresh failed:', e) }
}

async function checkJavaOnStartup() {
  const saved = $('javaPath').value;
  if (saved && saved !== DEFAULT_JAVA) {
    const exists = await window.wsl.fileExists(saved);
    if (exists) return;
  }
  try {
    const r = await window.wsl.detectBestJava('');
    if (r && r.path) { $('javaPath').value = r.path; saveSettings(); return }
  } catch {}
  openJavaDlModal();
}

// ── 更新检查 / 反馈 ──
async function checkForUpdates(manual) {
  try {
    const r = await window.wsl.checkUpdate();
    if (!r || !r.success) {
      if (manual) toast(t('updateFail') + ': ' + ((r && r.error) || t('unknownErr')), 'error');
      return;
    }
    if (r.hasUpdate) {
      if (!manual && localStorage.getItem('wsl_skip_update') === r.latest) return;
      const notes = (r.notes || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const msg = t('newVersionMsg', r.latest, r.current) + (notes ? ' — ' + notes : '');
      showConfirm(t('newVersion') + ' ' + r.latest, msg, () => window.wsl.openUrl(r.url), t('updateNow'));
    } else if (manual) {
      toast(t('updateLatest') + ' (v' + r.current + ')');
    }
  } catch (e) {
    if (manual) toast(t('updateFail') + ': ' + e.message, 'error');
  }
}

function openChannelModal() { $('channelModal').classList.add('active') }
function closeChannelModal() { $('channelModal').classList.remove('active') }

// ── AI Bot ──
// ── Bot State ──
let _botConnected = false

function botLog(type, msg) {
  const log = $('botLog')
  if (!log) return
  const empty = log.querySelector('.empty-text')
  if (empty) empty.remove()
  const d = document.createElement('div')
  d.className = 'log-msg ' + (type || 'info')
  d.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg
  log.appendChild(d)
  log.scrollTop = log.scrollHeight
}

async function botConnect() {
  const host = $('botHost').value.trim() || 'localhost'
  const port = parseInt($('botPort').value) || 25565
  const name = $('botName').value.trim() || 'AI_Teammate'
  const auth = $('botAuth').value
  const btn = $('botConnectBtn')
  btn.disabled = true; btn.textContent = '连接中...'

  const r = await window.wsl.botConnect({ host, port, username: name, auth })
  btn.disabled = false; btn.textContent = t('botBtnConnect')
  if (r.ok) {
    _botConnected = true
    $('botConnectBtn').style.display = 'none'
    $('botDisconnectBtn').style.display = ''
    $('botHudCard').style.display = ''
    botLog('ok', '机器人 ' + name + ' 已加入游戏')
    botRefreshStatus()
  } else {
    botLog('err', '连接失败: ' + (r.error || '未知错误'))
  }
}

async function botDisconnect() {
  await window.wsl.botDisconnect()
  _botConnected = false
  window._botTcpConnected = false
  window._botLoginComplete = false
  $('botConnectBtn').style.display = ''
  $('botDisconnectBtn').style.display = 'none'
  window._botTcpConnected = false
  window._botLoginComplete = false
  $('botHudCard').style.display = 'none'
  botLog('info', '机器人已断开')
}

async function botExec(action, params) {
  const r = await window.wsl.botExec({ action, params: params || {} })
  if (r.ok) botLog('ok', r.desc || action)
  else botLog('err', r.error || action + ' 失败')
}

async function botMine() {
  const block = prompt('输入要挖掘的方块名称（如 diamond_ore）:', 'dirt')
  if (block) botExec('MINE', { blockType: block.toLowerCase().trim() })
}

async function botChat() {
  const input = $('botInput')
  const msg = input.value.trim()
  if (!msg) return
  input.value = ''
  await window.wsl.botChat(msg)
  botLog('info', '已发送: ' + msg)
}

// ── HUD & Status ──
async function botRefreshStatus() {
  if (!_botConnected) return
  try {
    const s = await window.wsl.botStatus()
    if (!s.connected) return
    if (s.health != null) {
      $('botHudHealth').textContent = s.health
    }
    if (s.food != null) {
      $('botHudFood').textContent = s.food
    }
    if (s.position) {
      $('botHudPos').textContent = s.position.x + ',' + s.position.y + ',' + s.position.z
    }
    $('botHudHand').textContent = s.heldItem || '空手'
    $('botHudTarget').textContent = s.target || '无目标'
  } catch {}
}

// ── Listeners ──
if (window.wsl.onBotDebug) {
  window.wsl.onBotDebug(msg => {
    console.log('[BOT-DEBUG] ' + msg)
    botLog('debug', msg)
  })
}

if (window.wsl.onBotStatus) {
  window.wsl.onBotStatus(msg => {
    if (msg === 'connected') return
    if (msg.startsWith('[TCP]')) {
      window._botTcpConnected = true
      window._botLoginComplete = false
    } else if (msg === '已连接') {
      window._botTcpConnected = true
      window._botLoginComplete = true
    } else if (msg.startsWith('[MC]')) {
      window._botLoginComplete = true
    } else if (msg.startsWith('[断开]') || msg.startsWith('[错误]')) {
      window._botTcpConnected = false
      window._botLoginComplete = false
    }
    botLog('info', msg)
  })
}

if (window.wsl.onBotProgress) {
  window.wsl.onBotProgress(data => {
    if (!data) return
    const wrap = $('botProgressWrap')
    if (data.total > 0) {
      wrap.style.display = ''
      $('botProgressLabel').textContent = data.desc || '进度'
      $('botProgressCount').textContent = data.current + '/' + data.total
      const pct = Math.min(100, Math.round((data.current / data.total) * 100))
      $('botProgressBar').style.width = pct + '%'
    } else {
      wrap.style.display = 'none'
    }
  })
}

if (window.wsl.onBotChatStream) {
  window.wsl.onBotChatStream(chunk => {
    appendChatStream(chunk)
  })
}

// Refresh HUD every 2 seconds when connected
setInterval(() => {
  if (_botConnected) botRefreshStatus()
}, 2000)

// ── API Config (integrated in bot page) ──
let _apiConfig = null
let _apiPresets = {}
let _apiLabels = {}

async function loadApiConfig() {
  try {
    _apiConfig = await window.wsl.botApiGet()
    const pData = await window.wsl.botApiPresets()
    _apiPresets = pData.presets || {}
    _apiLabels = pData.labels || {}
    renderApiProviders()
  } catch (e) { console.error('loadApiConfig error:', e) }
}

function renderApiProviders() {
  const el = $('apiProviderList')
  if (!_apiConfig || !_apiConfig.providers) return
  el.innerHTML = _apiConfig.providers.map((p, i) => renderApiProvider(p, i)).join('')
}

function renderApiProvider(p, i) {
  const active = _apiConfig.selectedProviderId === p.id
  const typeOptions = Object.keys(_apiLabels).length > 0
    ? Object.entries(_apiLabels).map(([k, v]) => `<option value="${k}" ${p.type === k ? 'selected' : ''}>${v}</option>`).join('')
    : `<option value="${p.type}">${p.type}</option>`
  return `<div class="api-provider ${p.enabled ? 'enabled' : ''}" style="border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:6px;display:flex;flex-direction:column;gap:4px">
<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
  <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="apiToggleProvider(${i})" title="启用" style="accent-color:var(--accent)">
  <select onchange="apiChangeType(${i}, this.value)" style="font-size:11px;padding:2px 4px;border-radius:4px;border:1px solid var(--glass-border);background:var(--bg-alt);color:var(--text)">${typeOptions}</select>
  <input class="input glass" value="${escHtml(p.name)}" placeholder="名称" onchange="apiUpdate(${i},'name',this.value)" style="flex:1;min-width:60px;font-size:11px;padding:2px 6px">
  <input type="radio" name="apiSelected" ${active ? 'checked' : ''} onchange="apiSelect(${i})" title="设为当前" style="accent-color:var(--accent)">
  <button class="btn btn-icon" onclick="apiDelProvider(${i})" title="删除" style="width:22px;height:22px"><svg width="10" height="10"><use href="#icon-close"/></svg></button>
</div>
<div style="display:flex;gap:4px;flex-wrap:wrap">
  <input class="input glass" value="${escHtml(p.baseUrl)}" placeholder="Base URL" onchange="apiUpdate(${i},'baseUrl',this.value)" style="flex:2;min-width:100px;font-size:11px;padding:2px 6px">
  <input class="input glass" value="${escHtml(p.model)}" placeholder="模型" onchange="apiUpdate(${i},'model',this.value)" style="flex:1;min-width:60px;font-size:11px;padding:2px 6px">
</div>
<div style="display:flex;gap:4px">
  <input class="input glass" type="password" value="${escHtml(p.apiKey)}" placeholder="API Key" onchange="apiUpdate(${i},'apiKey',this.value)" style="flex:1;font-size:11px;padding:2px 6px">
</div>
</div>`
}

function apiToggleProvider(i) {
  _apiConfig.providers[i].enabled = !_apiConfig.providers[i].enabled
  renderApiProviders()
}

function apiChangeType(i, type) {
  const p = _apiConfig.providers[i]
  p.type = type
  const preset = _apiPresets[type]
  if (preset) {
    p.baseUrl = preset.baseUrl
    p.model = preset.model
  }
  renderApiProviders()
}

function apiUpdate(i, key, val) {
  _apiConfig.providers[i][key] = val
}

function apiSelect(i) {
  _apiConfig.selectedProviderId = _apiConfig.providers[i].id
  renderApiProviders()
}

function apiAddProvider() {
  const id = 'custom-' + Date.now()
  _apiConfig.providers.push({ id, name: '新节点', type: 'openai', baseUrl: _apiPresets.openai?.baseUrl || 'https://api.openai.com/v1', apiKey: '', model: _apiPresets.openai?.model || 'gpt-4o', enabled: false })
  renderApiProviders()
}

function apiDelProvider(i) {
  _apiConfig.providers.splice(i, 1)
  renderApiProviders()
}

async function apiSaveConfig() {
  try {
    await window.wsl.botApiSave(_apiConfig)
    toast('配置已保存')
  } catch (e) { toast('保存失败: ' + e.message) }
}

async function apiTestActive() {
  const btn = $('apiTestBtn')
  const result = $('apiTestResult')
  btn.disabled = true
  btn.textContent = '测试中...'
  result.textContent = ''
  const provider = _apiConfig.providers.find(p => p.id === _apiConfig.selectedProviderId)
  if (!provider) { result.textContent = '无选中节点'; btn.disabled = false; btn.textContent = '测试连通性'; return }
  try {
    const res = await window.wsl.botApiTest(provider)
    result.textContent = res.ok ? '✓ AI 模型连通成功' : '✗ AI 模型连通失败: ' + res.error
    result.style.color = res.ok ? 'var(--success)' : 'var(--danger)'
  } catch (e) { result.textContent = '✗ ' + e.message; result.style.color = 'var(--danger)' }
  btn.disabled = false
  btn.textContent = '测试连通性'
}

// ── Personality ──
async function setPersonality(name) {
  const r = await window.wsl.botPersonalitySet(name)
  if (r && r.ok) {
    document.querySelectorAll('[id^=persona-]').forEach(b => b.className = 'btn btn-sm')
    const btn = $('persona-' + name)
    if (btn) btn.className = 'btn btn-sm btn-primary'
    botLog('ok', '性格已切换: ' + name)
  } else {
    botLog('err', '性格切换失败: ' + ((r && r.error) || ''))
  }
}

// Restore personality button state on load
;(async () => {
  try {
    const state = await window.wsl.botLoadState()
    if (state && state.personality) {
      const btn = $('persona-' + state.personality)
      if (btn) {
        document.querySelectorAll('[id^=persona-]').forEach(b => b.className = 'btn btn-sm')
        btn.className = 'btn btn-sm btn-primary'
      }
    }
  } catch {}
})();

// ── AI Chat ──
let _chatStreaming = false

function scrollChat() {
  const el = $('aiChatMessages')
  el.scrollTop = el.scrollHeight
}

function addChatMessage(role, content) {
  const el = $('aiChatMessages')
  const empty = el.querySelector('.empty-text')
  if (empty) empty.remove()

  const msgDiv = document.createElement('div')
  msgDiv.className = 'chat-msg ' + role
  msgDiv.dataset.role = role
  const avatar = role === 'user' ? 'U' : 'AI'
  msgDiv.innerHTML = `<div class="avatar">${avatar}</div><div class="content">${escHtml(content)}</div>`
  el.appendChild(msgDiv)
  scrollChat()
  return msgDiv
}

function showChatLoading() {
  const el = $('aiChatMessages')
  const msgDiv = document.createElement('div')
  msgDiv.className = 'chat-msg assistant loading'
  msgDiv.id = 'aiChatLoading'
  msgDiv.innerHTML = `<div class="avatar">AI</div><div class="content"><span class="loading-dots"></span></div>`
  el.appendChild(msgDiv)
  scrollChat()
}

function removeChatLoading() {
  const el = document.getElementById('aiChatLoading')
  if (el) el.remove()
}

function appendChatStream(chunk) {
  let msgDiv = $('aiChatMessages').querySelector('.chat-msg.assistant:last-child')
  if (!msgDiv || msgDiv.dataset.role !== 'assistant' || msgDiv.classList.contains('loading')) {
    removeChatLoading()
    msgDiv = addChatMessage('assistant', '')
  }
  const contentDiv = msgDiv.querySelector('.content')
  if (contentDiv) contentDiv.textContent += chunk
  scrollChat()
}

async function aiChatSend() {
  const input = $('botInput')
  const text = input.value.trim()
  if (!text || _chatStreaming) return

  input.value = ''
  addChatMessage('user', text)
  showChatLoading()
  _chatStreaming = true
  $('botChatSendBtn').disabled = true

  try {
    const result = await window.wsl.botApiChat(text)
    removeChatLoading()
    _chatStreaming = false
    $('botChatSendBtn').disabled = false

    if (result.error) {
      addChatMessage('assistant', '⚠ ' + result.error)
    } else {
      if (!result.text) {
        const existing = $('aiChatMessages').querySelector('.chat-msg.assistant:last-child')
        if (!existing || existing.dataset.role !== 'assistant') {
          addChatMessage('assistant', '(空响应)')
        }
      }
    }
  } catch (e) {
    removeChatLoading()
    _chatStreaming = false
    $('botChatSendBtn').disabled = false
    addChatMessage('assistant', '⚠ 请求失败: ' + e.message)
  }
}

function aiChatClear() {
  const el = $('aiChatMessages')
  el.innerHTML = '<div class="empty-text" style="padding:40px 0;text-align:center;color:var(--text3)">发送消息开始 AI 对话</div>'
  window.wsl.botChatClear()
}

// ── Skin Library ──
let skinList = [];
let skinNext = null;
let skinLoading = false;
let currentSkin = null;

function drawSkinPreview(canvas, img, slim) {
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const k = Math.max(1, Math.round(img.naturalWidth / 64));
  const hd = img.naturalHeight >= 64 * k;
  const scale = canvas.width / 16;
  const px = (sx, sy, sw, sh, dx, dy) => ctx.drawImage(img, sx * k, sy * k, sw * k, sh * k, dx * scale, dy * scale, sw * scale, sh * scale);
  const armW = slim ? 3 : 4;
  const rightArmX = 4 - armW;

  // 身体、腿、手臂、头（64x64 与 64x32 通用部分）
  px(20, 20, 8, 12, 4, 8);
  px(4, 20, 4, 12, 4, 20);
  px(44, 20, armW, 12, rightArmX, 8);
  px(8, 8, 8, 8, 4, 0);

  if (hd) {
    px(20, 52, 4, 12, 8, 20);
    px(36, 52, armW, 12, 12, 8);
    // 第二层：帽子、外套
    px(40, 8, 8, 8, 4, 0);
    px(20, 36, 8, 12, 4, 8);
    px(44, 36, armW, 12, rightArmX, 8);
    px(52, 52, armW, 12, 12, 8);
  } else {
    // 旧版 64x32：左侧肢体镜像右侧
    ctx.save();
    ctx.translate(12 * scale, 20 * scale);
    ctx.scale(-1, 1);
    px(4, 20, 4, 12, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(12 * scale, 8 * scale);
    ctx.scale(-1, 1);
    px(44, 20, armW, 12, 0, 0);
    ctx.restore();
    px(40, 8, 8, 8, 4, 0);
  }
}

function paintSkinCanvas(canvas, url, slim) {
  if (!canvas || !url) return;
  const img = new Image();
  img.onload = () => drawSkinPreview(canvas, img, slim);
  img.src = url;
}

function refreshSkinPreview() {
  if (!currentSkin) return;
  paintSkinCanvas($('skinBig'), currentSkin.dataUrl || currentSkin.url, $('skinVariant').value === 'slim');
}

async function loadSkins(reset) {
  if (skinLoading) return;
  skinLoading = true;
  const grid = $('skinGrid');
  const status = $('skinStatus');
  if (reset) {
    skinList = [];
    skinNext = null;
    grid.innerHTML = '<p class="empty-text">' + t('skinLoading') + '</p>';
  } else if (status) {
    status.style.display = 'block';
    status.textContent = t('skinLoading');
  }
  try {
    const res = await window.wsl.listSkins(reset ? null : skinNext);
    if (!res?.success) throw new Error(res?.error || t('unknownErr'));
    if (reset) grid.innerHTML = '';
    const start = skinList.length;
    skinList = skinList.concat(res.skins || []);
    skinNext = res.next;
    (res.skins || []).forEach((s, i) => {
      const idx = start + i;
      const card = document.createElement('div');
      card.className = 'skin-card';
      card.onclick = () => openSkinModal(idx);
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 128;
      const label = document.createElement('div');
      label.className = 'skin-name';
      label.textContent = s.name || ('#' + (idx + 1));
      card.appendChild(canvas);
      card.appendChild(label);
      grid.appendChild(card);
      paintSkinCanvas(canvas, s.dataUrl || s.url, false);
    });
    if (!skinList.length) grid.innerHTML = '<p class="empty-text">' + t('noRes') + '</p>';
    if (status) {
      status.style.display = skinNext ? 'none' : (skinList.length ? 'block' : 'none');
      status.textContent = skinNext ? '' : t('loadedAll');
    }
    $('skinHint').textContent = t('skinHint');
  } catch (e) {
    grid.innerHTML = '<p class="empty-text">' + escHtml(e.message) + '</p>';
  } finally {
    skinLoading = false;
  }
}

function showSkinModal(skin, title) {
  currentSkin = skin;
  if (!currentSkin) return;
  $('skinModalName').textContent = title || currentSkin.name || '';
  $('skinApplyHint').textContent = t(currentAccount && currentAccount.type === 'microsoft' ? 'skinHintOnline' : 'skinHintLocal');
  $('skinVariant').value = 'classic';
  refreshSkinPreview();
  $('skinModal').classList.add('active');
}

function openSkinModal(idx) {
  const skin = skinList[idx];
  if (!skin) return;
  showSkinModal(skin, skin.name || ('#' + (idx + 1)));
}

function importLocalSkin() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        const k = img.naturalWidth / 64;
        if (!Number.isInteger(k) || k < 1 || k > 4 || (img.naturalHeight !== 64 * k && img.naturalHeight !== 32 * k)) {
          toast(t('skinInvalidSize'), 'error');
          return;
        }
        showSkinModal({ name: t('skinLocalName'), url: dataUrl, dataUrl, local: true }, t('skinLocalName'));
      };
      img.onerror = () => toast(t('skinInvalidSize'), 'error');
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}
function closeSkinModal() { $('skinModal').classList.remove('active') }

async function applyCurrentSkin() {
  if (!currentAccount) { toast(t('skinNeedAccount'), 'error'); return }
  if (!currentSkin) return;
  const btn = $('skinApplyBtn');
  btn.disabled = true;
  try {
    const res = await window.wsl.applySkin({ account: currentAccount, skinUrl: currentSkin.url, variant: $('skinVariant').value });
    if (res?.success) {
      toast(t('skinApplied') + (res.mode === 'local' ? ' · 本地' : ''), 'success');
      closeSkinModal();
    } else {
      toast(t('skinApplyFail') + ': ' + (res?.error || t('unknownErr')), 'error');
    }
  } catch (e) {
    toast(t('skinApplyFail') + ': ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Init ──
loadAccounts();
renderProfile();
tryAutoLogin();
loadSettings();
initMirrorSelect();
loadVersions();
setTimeout(checkJavaOnStartup, 2000);
setTimeout(() => checkForUpdates(false), 4000);
window.wsl.getAppVersion().then(v => { const el = $('appVersionText'); if (el && v) el.textContent = 'v' + v }).catch(() => {});
$('langSelect').value = lang;
applyLang();

$('modSearch').placeholder = t('search');
$('resSearch').placeholder = t('search');
$('javaPath').placeholder = DEFAULT_JAVA;
$('username').placeholder = DEFAULT_USERNAME;
$('jvmArgs').placeholder = '-Dexample=value';
$('offlineName').placeholder = DEFAULT_USERNAME;
const etRoomInput = $('etRoomInput');
if (etRoomInput) etRoomInput.placeholder = '输入房间码';
