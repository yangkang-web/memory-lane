# BLOODBOUND · Memory Lane

第一段「月下教堂」是约一分钟的第一人称 3D 回忆。演出包含遇险、营救、碎柱落刀、抬手克制、血心生成、接受项链、戴项链与片尾承诺。角色、动作、镜头和声音在本地浏览器实时播放；运行 Demo 不调用在线模型。

## 打开

```sh
npm ci
npm run build:bloodbound
npm run start:bloodbound
```

然后打开 <http://127.0.0.1:4330/>。也可以双击 `打开 Bloodbound.command`，它会在缺少构建时先构建，再启动本机服务并打开浏览器。服务只监听 `127.0.0.1`，进程号写在 `.bloodbound.pid`，日志在 `bloodbound-server.log`。

开发时用 `npm run dev:bloodbound`，打开 <http://127.0.0.1:4331/bloodbound.html>。加 `?review=1` 会显示章节跳转和帧率，并在页面上挂出调试句柄，只用于审阅。花园 Demo 使用 `dist/` 与 4327，两者互不影响。

## 体验

这是一段第一人称、实时三维的回忆，没有预渲染视频。剧情分为序章「月下教堂」、危险、救援、伤口、每一滴、信物、戴上与尾声：玩家在教堂里自由走动，看向目标后按 E 或左键互动，按住 E 伸手握住他的手；剧情在玩家看见、走近或完成动作后推进，可以从最近的存档继续。

电脑上 WASD 移动、鼠标环顾，Space 或 Esc 打开菜单，M 静音。手机上左侧摇杆移动、右侧滑动环顾，准星旁的圆形按钮代替 E。

片尾可以重温，也可以起身走出：中殿东侧的木门打开，一条石砌走廊通向尽头一扇透着暖光的门，走到门前即进入出口，提示会按玩家当时的朝向说明门在哪边。走廊只是通往下一世界的过道，门外不含下一世界内容。这里提供的是下一场景的接管接口与默认出口演示，真实下一世界由另一位开发者接入，见 `BLOODBOUND-INTEGRATION.md`。

## 实现

人物使用有明确来源的真实蒙皮网格、灰绿眼睛与表情形变。手臂采用骨骼 IK，手指捏合跟随实际指尖，项链链顶跟随接触点；嘴部跟随当前语音能量，抬手时使用真实嘴唇骨骼留出距离。玩家的手保留真实皮肤贴图，腕口按平面裁切后接上衣袖。

教堂有本地石材的颜色、法线和粗糙度贴图，侧窗月光、自身阴影、近景景深、石雕、烛台与银刃。碎柱和落刀随时间轴更新，重播恢复原样。血心从空壳逐渐注满，接受后展开链条并戴到颈前。

七句台词由公司 Kaon 的 ElevenLabs V4 制作并保存为本地音频，Lucien 与 Hunter 使用不同声音。背景与音效使用原创轻量合成及 Kenney CC0 音源。统一音频时钟驱动台词、字幕与叙事门槛，暂停后从同一偏移恢复；语音播放时降低背景音量。

演出绘制目标为 60 FPS；像素比有上限，低帧率时自动降采样。入口降到 15 FPS，暂停和片尾降到 5 FPS，隐藏页面停止绘制。没有本地大型 AI 推理或离线渲染任务。Blender 仅用于单线程素材转换、适配与导出。

## 接入与文件

- `src/bloodbound/main.js`：页面、资源加载、播放控制及 `MemoryLaneBloodbound` 接口。
- `src/bloodbound/player.js`、`layout.js`、`interact.js`：第一人称移动、碰撞与准星交互。
- `src/bloodbound/flow.js`、`director.js`、`character.js`：剧情段落、存档与人物。
- `src/bloodbound/sound.js`、`story.js`：声音和原始台词。
- `src/bloodbound/chapel.js`、`pendant.js`：场景和信物。
- `public/assets/bloodbound/characters/v3/`：Lucien、猎人和玩家手臂的模型，`SOURCES.md` 写明来源、许可与改动。
- `public/assets/bloodbound/credits.html`：体验内可打开的制作与素材致谢。
- `public/assets/bloodbound/audio/manifest.json`、`audio/README.md`：本地声音、来源和验证记录。
- `public/assets/bloodbound/heart-pendant.glb`：场景中的血心项链；`blood-heart-pendant.glb` 是供收藏柜复用的程序化版本。
- `BLOODBOUND-INTEGRATION.md`：共享画布、出口、完成事件与资源所有权说明。
- `public/assets/bloodbound/integration-test.html`：真实宿主接入验收页。

制作 Key 存在被 Git 忽略的 `.local/`，不进入客户端或开发包。2026-10-15 的用户授权仅允许公司 Kaon 素材制作，今晚总预算上限 $1,000；它不是实际花费目标，也不授权其他付费服务或素材购买。

## 内容来源

本场景改编自 [BLOODBOUND — The Night You Were Mine](https://claude.ai/artifact/8787e8Bv8pouUkDoYUafxt#7b7708cb-e89e.mep3ebf446m.1335)，原文日期 2026-10-14。固定演示剧情是文学样例，不是从实际用户聊天自动提取的结果。本轮交付第一段场景、信物与下一世界接口；项目整体的聊天到世界生成链路是独立工作。

代码与原创几何沿用仓库许可。第三方人物、发型、纹理和音源的许可以各自 `SOURCES.md` 与原始声明为准，不把混合素材统一写成 MIT。
