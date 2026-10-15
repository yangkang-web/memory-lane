# Memory Lane

把用户与不同角色的聊天经历，变成可以探索、重温和收藏的三维回忆空间。

Memory Lane turns shared stories into walkable memories. The current prototype is a local, single-world experience; connected character worlds are planned for the hackathon version.

## 项目提案

从用户与不同角色的聊天记录中提取重要时刻，生成可探索的 3D 场景和回忆物件。用户沿路前行，在熟悉的对话、角色语音和背景音乐中重温共同经历，收藏珍贵瞬间。多个角色的世界在交界处交错相连，用户可以直接从一个世界走进另一个世界。

以上是产品目标，当前已实现的范围见下表。

| 能力 | 当前状态 |
| --- | --- |
| 单世界、三个回忆节点 | 已实现：六点以后 / After Six |
| 自动漫游、暂停与自由探索 | 已实现 |
| 原文查看、收藏与本地保存重访 | 已实现 |
| 本地环境音效 | 已实现，使用 Web Audio 合成 |
| 真实聊天导入与自动提取 | 计划中 |
| 多世界交界与连续行走 | 计划中 |
| 角色语音与背景音乐 | 计划中 |

当前样例改编自 Lewis Carroll《Alice’s Adventures in Wonderland》第七章“A Mad Tea-Party”，**是文学改编样例，非真实用户聊天**。三个节点为“陌生人的座位”“被困在六点”“没有结束的茶会”。节点与场景目前由人工编排，不是任意聊天自动生成系统。

![单世界原型预览，截图保留早期项目名称](evidence/preview.png)

## 本地启动

需要 Node.js 22.12+ 与 npm；已在 Node.js 25.9.0 上验证。浏览器需要支持 WebGL2。

```sh
git clone https://github.com/yangkang-web/memory-lane.git
cd memory-lane
npm ci
npm run build
npm start
```

打开 http://127.0.0.1:4317/ 。服务在后台运行，仅监听本机。

macOS 也可以双击 `打开 Memory Lane.command`。首次启动需要下载 npm 依赖；完成安装后，Demo 运行时不调用模型 API 或其他付费服务。

开发模式：`npm run dev`，同样使用 4317 端口。不要同时运行开发服务和后台服务。后台服务 PID 在 `.server.pid` 中；停止前应确认它仍对应本项目的 `scripts/server.mjs`。

场景地图：打开 http://127.0.0.1:4317/apocalypse ，或点击首页的“场景地图”。这是独立的原创末世市中心习作，包含砖楼旅馆、退台高楼、仓库、停车楼、露出结构的废楼等不同建筑，以及不同车型、植被和积水。

白墙世界：打开 http://127.0.0.1:4317/white-room 。沿用末日初始视角的墙面尺寸、画作比例和镜头位置。加载完成后，末世房间从右往左沿斜线以贝塞尔缓动揭开，在画面中央停留 1 秒，再继续覆盖整个画面。GPU 合成两边真实画面，在分界附近产生连续的多边形断面、折射、局部色散与压力波；变形强度随实际推进速度变化。两边共用镜头，切换时锁定视角。点击“重播过渡”重看；“回到白墙”取消过渡并恢复可拖动、缩放的白墙场景。

视觉参考：[The Medium 官方双世界演示](https://www.youtube.com/watch?v=5dNZpKhpvGg) 的双世界对应关系、[Quantum Break 开发团队访谈](https://www.fxguide.com/fxfeatured/time-for-destruction-the-tech-of-quantum-break/) 中的几何扰动与光学畸变。此处为本地原创实现，未使用游戏素材。

默认从可进入的废弃房屋开始。脏墙中央挂着梵高《向日葵》的公版复制图像，室内有破门、残缺屋顶、破沙发、旧柜、倒椅、床垫和遗留物资。房间与街道位于同一三维场景。

初始站位正对做旧的《向日葵》，画下留空。室内包含带纸页和书脊的旧书、标签罐头、瓶子、收音机、木箱、日记和搪瓷杯；桌上提灯提供暖光，窗户和破屋顶引入冷色光，吊灯保留为损坏的陈设。天花、室内墙、外砖墙和屋面使用独立纹理；外侧有排水管、门牌和门灯。

主路南端与东西横街延伸到更多街区，地面覆盖 1200 × 1200 米、道路长 760 米；自由行走范围为 x = -240～240、z = -280～280 米，远景建筑与雾衔接。外围建筑暂不可进入。

- “屋内漫游”：WASD 移动，拖动环顾；↑↓ 前后，←→ 转向，Shift 加快，Esc 停止行走。墙体和主要家具、建筑、车辆有简化碰撞；暂不提供跳跃和上下楼。
- 点击“走到街上”可连续走出破门，室外可点击“沿路回屋”；WASD 或拖动画面可接管。若在远处没有直达路线，先手动走回门口附近。
- “街道”“俯瞰”：保留拖动旋转、滚轮缩放、右键平移。重置恢复所选视角。
- 窄屏提供方向按钮，单指拖动画面环顾。真实触屏设备性能尚未验收。

街景包含弯曲的立体草叶、蕨类、分叉树干和树根、带叶脉的爬山虎，以及带轮拱、倾斜车窗、轮胎纹路和锈蚀的车辆。路边增加湿污渍、落叶、排水口与废弃设施。沥青和树皮使用本地保存的 CC0 基础色、法线及粗糙度贴图。

核心街区的临街立面采用实际窗洞、窗框、窗台、破玻璃和封窗木板，底层增加卷闸、雨棚、窗洞内的暗部、空调和落水管；砖墙与混凝土也使用本地 CC0 PBR 材质。背面和雾中的外围楼群保持简化模型，以控制浏览器的几何与绘制开销。

环境几何与大部分纹理由本地代码生成；挂画及第三方材质来源见 `ASSET-LICENSES.md`。运行时不请求外部图片，不包含游戏提取资产。目前仅这一间房屋可进入，无任务系统；这是浏览器内的场景习作，并非主机游戏同等级资产和渲染管线。

## 操作

- “进入回忆”开始导览，行走约 64 秒，加上阅读约 90 秒；节点阅读时间由用户控制。
- WASD 移动；↑↓ 前后走，←→ 转向；按住画面拖动环顾。移动会接管导览。
- E 打开附近回忆；Esc 关闭回忆或暂停。
- 章节按钮可重访节点；“查看当时的对话”展示原文与演示译文。
- 收藏、访问进度、声音和画面设置保存在当前浏览器，不提供云端同步。

当前验收面向电脑浏览器；触屏自由移动尚未完成验收。

## 开发与检查

```sh
npm test
npm run build
```

存档测试覆盖默认值、异常数据、保存重访与存储失败反馈，并校验英文引用在附带章节中存在。单世界原型经过独立 Agent 实际浏览器体验与问题复验。

- `src/story.js`：故事、回忆节点、原文和路线参数。
- `src/scene.js`：Three.js 场景、镜头、移动与碰撞。
- `src/entry.js`：首页与 `/apocalypse` 的入口分流。
- `src/map.js`、`src/downtown.js`：独立市中心地图、视角控制及程序生成街区。
- `src/abandoned-home.js`：可进入的房屋、破门、家具和真实画作贴图。
- `src/interior-props.js`：书架和桌面细节、灯具与物品模型。
- `src/street-vegetation.js`、`src/street-vehicles.js`、`src/street-dressing.js`：街道植物、车辆及路面陈设细节。
- `src/building-facades.js`：核心街区实体立面和建筑材质。
- `src/walk-controller.js`、`src/walk-layout.js`：第一人称移动、碰撞、室内外连续路线。
- `src/main.js`：页面与体验流程。
- `src/storage.js`：经 Zod 校验的本地存档。
- `src/audio.js`：本地环境音效。
- `public/assets/`：随项目提供的素材与原文。
- `scripts/`：独立本地启动与静态服务。

历史存档键和服务健康标识保留 `memory-realm`，兼容早期本地 Demo；产品名称为 Memory Lane。

## 下一阶段

- 导入同一用户与两个角色的真实聊天，提取带原文出处的回忆。
- 构建两个各有 2–3 个节点的世界，以及一个可双向走过的交界。
- 增加与物件相关的轻交互，评估本地语音合成。
- 保留导览、自由探索、收藏和重访，用真实用户体验验证故事辨识度。

源码公开；真实聊天、密钥、运行日志、本地存档及内部评审记录不随仓库发布。导入数据请放在被忽略的 `imports/` 或 `private/` 中。

## 许可与内容来源

原创代码为 [MIT](LICENSE)。第三方模型、依赖和文学文本分别保留其许可，见 [素材来源与许可](ASSET-LICENSES.md)。

场景中的花园、道路、灯光和部分物件摆放是视觉演绎，中文为演示译文。原文与 Project Gutenberg 许可附在 `public/assets/`。

### Hero street art pass

The **样板街段** view frames the specially authored Pine Street Printworks opposite the dwelling. This is the detailed house-to-street section: fractured masonry with an inset shop interior, broken glazing, a draped awning, corroded fire escape, chipped plaster and roof reinforcement. The two nearby pickups have missing windshield sections, open driver's doors, cabin furnishings, crumpled bonnets and engine components.

Five nearby trees and the clustered ferns, nettles and fallen wood now use locally bundled CC0 meshes with 2K maps. The tree is reduced from 2.06 million to 154,118 triangles and instanced; plant variants share materials and geometry. Model assets total approximately 60 MB on disk. Distant architecture and vegetation keep the simpler procedural representation. Assets load entirely from this server; see ASSET-LICENSES.md for provenance.

The rendering pass adds depth-based contact occlusion, using the actual alpha-tested scene depth, followed by tone mapping and FXAA. Static views render on camera changes; rain and nearby water animate only while the page is visible. Indoor plaster has surface normals and small curled paint fragments. The initial view remains facing the aged Sunflowers reproduction.

`npm test` includes finite-vertex, index-range, local-URI and tree-size checks for the bundled glTF files. Desktop browser interaction is checked separately; this does not establish a mobile frame-rate target or AAA asset parity.

### Rewilding and structural damage

The printworks now loses an upper corner, exposing jagged floor plates, reinforcement and rubble. Roof shrubs grow on the surviving slabs; broad ivy colonies climb damp piers, spill over the canopy and entwine the fire escape. Other blocks include a garage with missing upper floor edges and a historic building with a lost front upper storey. Rooftop equipment is kept on surviving roof surfaces.

Three authored road fractures are actual holes in the asphalt mesh, with exposed soil, fractured edges, small pavement fragments and plants in the openings. Woody roots meet raised pavement slabs beside the eastern trees. Raised slabs and substantial rubble have collision boundaries, with the house-to-street route left clear. `tests/ruins.test.js` raycasts the fracture openings and intact pavement, checks finite geometry, and verifies route clearance.

### Rainwater and daylight

The **街面积水** view shows shallow street water. Four pools share one 1024px planar reflection capture, with angle-dependent reflectance, subtle moving ripples, a roughened reflection and irregular damp borders. Transparent blending preserves the lit asphalt and markings underneath. The water plane sits above both intersecting road surfaces; a raycast regression test guards against it being buried under the cross street. The weather/water scheduler runs at up to 30 updates/second while rain or nearby visible water needs animation. Hidden tabs do not advance weather or redraw.

A local procedural cloudy sky supplies the background and environment light, aligned with the warm directional sun. Cool hemisphere fill preserves shadow detail. A cached 4096px shadow map follows the camera in quantized steps, with wider coverage for the overview. The depth-based post pass also integrates a thin atmospheric scattering term against the actual directional shadow map, so buildings occlude the light. This is raster lighting and approximate single scattering, not ray tracing or baked global illumination. Desktop browser review remains the visual/interaction acceptance gate; no mobile performance target is established.

### Sunshower weather

The scene defaults to one combined condition: **晴天、少量云彩、小雨同时存在**. There is no weather-mode selector. Warm directional sunshine and a mostly clear blue sky remain active during gentle rain; roads are damp and shallow puddles reflect the sunlit street.

Light rain uses instanced, distance-faded strokes with varied lengths and speeds, plus expanding impact rings on puddles. A one-time top-down depth capture of the actual loaded scene shelters complete roofs, canopies and floor plates; the dwelling's existing broken roof opening admits some rain. The shelter map is static because the scene geometry is static. Animation pauses in hidden tabs. No weather service, cloud dependency or paid API is used. Tests cover the simultaneous daylight/rain configuration and safe rain initialization; visual precipitation and shelter are checked in the browser.
