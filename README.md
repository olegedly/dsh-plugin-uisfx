# dsh-uisfx

一个 dsh web 插件：基于 [uisfx](https://github.com/romainsimon/uisfx) 的语义化 UI 音效系统，可在设置页里按情景挑选音效。

- 默认音色包：`zen`
- 任务音：开始 / 成功 / 失败 / 待处理提醒
- 按钮音：普通点击 / 主要按钮 / 开关 / 发送 / 关闭 / 删除 / 链接
- 设置页：音色包、音量、每个情景的 cue、试听按钮、分类开关
- 持久化：Host `settings.yaml` 的 `dsh-uisfx` namespace
- 服务化：其他插件可通过 `ctx.uisfx` 触发音效

## 安装

```powershell
dsh plugin --profile web add dsh-uisfx
# 然后重启 dsh web
```

安装后进入 **设置 → 音效**。

本地开发安装：

```powershell
git clone <repo-url> dsh-uisfx
cd dsh-uisfx
pnpm install
pnpm build
cd ..
dsh plugin --profile dev add ./dsh-uisfx
```

## 设置项

| 设置 | 默认值 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关 |
| `volume` | `0.55` | 音量 0-1 |
| `pack` | `zen` | uisfx 音色包（12 选 1） |
| `taskSounds` | `true` | 任务开始/结束音 |
| `clickSounds` | `true` | 按钮点击音 |
| `attentionSounds` | `true` | 待处理提醒音 |
| `mapping.*` | 见下 | 每个情景对应的 cue |

默认情景映射：

| 情景 | cue |
|---|---|
| `task.start` | `start` |
| `task.success` | `success` |
| `task.failure` | `error` |
| `task.pending` | `notification` |
| `click.normal` | `press` |
| `click.primary` | `select` |
| `click.toggle` | `toggle-on` |
| `click.send` | `send` |
| `click.close` | `close` |
| `click.danger` | `delete` |
| `click.link` | `open` |

## 服务 API

```ts
ctx.uisfx.play('task.success')          // 按情景映射播放
ctx.uisfx.play('click.send')
ctx.uisfx.playCue('achievement')        // 直接播放某个 cue
ctx.uisfx.preview('success')            // 试听
ctx.uisfx.setPack('studio')
ctx.uisfx.setVolume(0.5)
ctx.uisfx.getPrefs()
```

## 开发

```powershell
pnpm install
pnpm build     # 生成 lib/client.js / lib/index.js
pnpm check     # node --check 语法检查
```

调试入口（浏览器 console）：

```js
window.__dshUISFX()          // uisfx player
window.__dshUISFXDebug()     // 当前 prefs
```

## 兼容性

- dsh `0.1.0-rc.6`
- 与 `dsh-better-sidebar`、`@dsh-external/dsh-navbar` 同装验证通过
- 任务音只播当前会话；后台会话提醒留待后续版本

## License

本插件 MIT。内嵌的 uisfx runtime 同样为 MIT，见 `NOTICE` 与 `vendor/uisfx-0.4.0.js`。
