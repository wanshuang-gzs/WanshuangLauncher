# Tauri 窗口配置说明

## 窗口架构

采用双窗口模型：启动页（Splash）→ 主窗口（Main）。

```
┌─────────────────────────────────────┐
│       启动窗口 (620×340)             │
│    ┌──────────────────────┐         │
│    │   WANSHUANG LAUNCHER │         │
│    │   晚霜工作室          │         │
│    │   ████████████░░░░░  │         │
│    │   启动完成            │         │
│    └──────────────────────┘         │
│           ↓ 加载完毕自动关闭          │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│       主窗口 (1100×780)             │
│    ┌──────┐ ┌──────────────────┐   │
│    │ 侧边栏│ │    内容区域       │   │
│    │      │ │                  │   │
│    └──────┘ └──────────────────┘   │
└─────────────────────────────────────┘
```

## 配置文件：`src-tauri/tauri.conf.json`

### 启动窗口配置（splash）

```json
{
  "label": "splash",
  "title": "Wanshuang Launcher",
  "width": 620,
  "height": 340,
  "resizable": false,
  "maximizable": false,
  "minimizable": false,
  "decorations": false,
  "center": true,
  "url": "/"
}
```

| 参数 | 值 | 说明 |
|------|-----|------|
| `width` / `height` | 620 / 340 | 固定尺寸，协调美观 |
| `resizable` | `false` | 禁止调整窗口大小 |
| `maximizable` | `false` | 禁止全屏 |
| `decorations` | `false` | 无系统标题栏（Unity 风格） |
| `center` | `true` | 屏幕居中弹出 |

### 主窗口配置（main）

```json
{
  "label": "main",
  "title": "Wanshuang Launcher",
  "width": 1100,
  "height": 780,
  "minWidth": 880,
  "minHeight": 660,
  "center": true,
  "url": "/main/index.html"
}
```

### 完整配置

```json
{
  "app": {
    "windows": [
      {
        "label": "splash",
        "width": 620,
        "height": 340,
        "resizable": false,
        "maximizable": false,
        "decorations": false,
        "center": true,
        "url": "/"
      }
    ]
  }
}
```

## Rust 入口：`src-tauri/src/main.rs`

启动流程：
1. 创建 splash 窗口（620×340）
2. splash 页面加载 Vue3 组件，执行动画 + 进度模拟
3. 加载完毕 → splash 页面发送 `splash:complete` 事件
4. Rust 监听事件 → 关闭 splash 窗口 → 创建 main 窗口

```rust
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let splash = app.get_webview_window("splash").unwrap();
            // 监听 splash 完成事件
            let splash_id = splash.clone();
            app.listen("splash:complete", move |_| {
                let _ = splash_id.close();
                // TODO: 创建主窗口
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error");
}
```

## 构建环境要求

| 依赖 | 版本 | 用途 |
|------|------|------|
| Rust | ≥1.77 | Tauri 后端编译 |
| Node.js | ≥20 | 前端构建（Vite + Vue3） |
| npm | ≥10 | 包管理 |

### 安装 Rust

```powershell
# 访问 https://rustup.rs 下载运行 rustup-init.exe
# 或使用 winget
winget install Rustlang.Rustup
```

### 本地开发

```powershell
# 启动开发服务器（热重载）
cd splash-ui
npm run tauri dev
```

### 生产构建

```powershell
cd splash-ui
npm run tauri build
# 输出在 splash-ui/src-tauri/target/release/
```

## 前端目录结构

```
splash-ui/                  # Vue3 + Vite 项目
├── index.html              # 入口 HTML
├── vite.config.js          # Vite 配置（输出到 ../splash/）
├── package.json            # 依赖声明
└── src/
    ├── main.js             # Vue3 入口
    └── App.vue             # 启动页组件（动画 + 进度条）

src-tauri/                  # Tauri 后端
├── tauri.conf.json         # 窗口配置
├── Cargo.toml              # Rust 依赖
├── build.rs                # Tauri 构建脚本
└── src/
    └── main.rs             # Rust 入口

splash/                     # 构建输出（自动生成）
└── index.html              # 独立可用的启动页
```

## 独立运行（不含 Tauri）

`splash/index.html` 是纯静态页面，可直接在 Electron 或浏览器中运行：

```javascript
// main.js Electron 入口
const { app, BrowserWindow } = require('electron');

function createSplash() {
  const splash = new BrowserWindow({
    width: 620,
    height: 340,
    frame: false,
    resizable: false,
    webPreferences: { contextIsolation: true },
  });
  splash.loadFile('splash/index.html');
  splash.center();

  // 监听加载完成或定时关闭
  setTimeout(() => {
    splash.close();
    createMainWindow();
  }, 6000);
}
```
