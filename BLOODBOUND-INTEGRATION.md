# BLOODBOUND 团队接入

这里交付第一段教堂回忆和独立项链资产。收藏柜由宿主实现，下一世界还没有接入真实代码。当前片尾出口页只是演示接收界面，不能算正式跨世界联调通过。

## 启动和文件

```sh
npm install
node scripts/bloodbound-keepsake-export.mjs
npm run build:bloodbound
npm run start:bloodbound
```

- 回忆页面：`http://127.0.0.1:4330/`
- 同源接入验收页：`http://127.0.0.1:4330/assets/bloodbound/integration-test.html`
- 独立资产：`public/assets/bloodbound/blood-heart-pendant.glb`
- 下载地址：`http://127.0.0.1:4330/assets/bloodbound/blood-heart-pendant.glb`
- 回忆入口源文件：`bloodbound.html`、`src/bloodbound/main.js`

示例服务仅监听本机 `127.0.0.1`，以上不是局域网下载地址。团队接入时应将页面和资源部署在自己的同源静态服务中；下面的 iframe 示例也要求同源。

## 收藏柜项链

回忆中佩戴的项链与收藏柜文件不是同一个模型。场景内使用 `public/assets/bloodbound/heart-pendant.glb`：它来自用户提供的 Meshy AI 生成资产 `Meshy_AI_Heart_Necklace_Pendan_1015054857`，本项目只保留了心形瓶、瓶盖和十字挂扣，贴图缩到 1024，并在 Blender 中导出（538,204 bytes，SHA-256 `ca5be3f60fb768e1706343d70b9b435f885e5f2217355f0bacea295494c56feb`）。运行时的发光与心跳由 `pendant.js` 加上。它的使用授权以用户 Meshy 账户的条款为准，不属于本仓库的 MIT 许可。

下面的 `blood-heart-pendant.glb` 仍是程序建模的收藏版本，外形与场景内的 Meshy 项链不同。若收藏柜需要与回忆中一致的外观，可改用 `heart-pendant.glb`，但需要先确认 Meshy 授权允许这种再分发。

GLB 由 `src/bloodbound/pendant.js` 的 `createPendant()` 设置 `setFill(1)` 后导出，包含玻璃心形外壳、银边、银扣、内部血心和 56 个可见链环。它是完整的自包含 GLB，所有几何和材质在同一个文件内，没有图片或外部纹理依赖。

| 属性 | 实际值 |
| --- | --- |
| 信物标识 | `blood-heart-pendant` |
| 大小 | 180,332 bytes，约 176 KiB |
| SHA-256 | `e8f5b3a7877ce0b5894ee7a659dfcec3ad26f06676e3ffb59e73d542ef20973c` |
| 坐标 | 米制，`+Y` 向上，心形正面朝 `+Z` |
| 原点 | 心形设计中心附近，链条向 `+Y` 延伸 |
| 整体尺寸 X / Y / Z | 0.064895 / 0.127177 / 0.009200 m |
| 包围盒最小值 | `[-0.032448, -0.032453, -0.004600]` m |
| 包围盒最大值 | `[0.032448, 0.094723, 0.004600]` m |
| 几何 | 60 个 mesh 实例，5 份共享几何 mesh，8,348 个实例三角形 |
| 材质 | 3 个，银、玻璃、血心 |
| 状态 | 血心已注满；含展示用链段，不含绕颈闭合的完整链圈 |
| 许可 | 项目原创程序建模，沿用仓库 MIT License，保留 Memory Lane contributors 版权声明 |

玻璃使用 `KHR_materials_transmission`（0.94）、`KHR_materials_volume`（局部厚度 0.18）与 `KHR_materials_ior`（1.47），另保留 clearcoat 和 emissive-strength 扩展。根节点的 0.023 缩放已在 GLB 中保留，不要再乘一次。玻璃的 `alphaMode` 为 `OPAQUE` 是正确结果：透明感通过物理透射实现，不靠 alpha blending。

建议用支持这些扩展的 `GLTFLoader`，给银框和玻璃提供环境光照。只支持基础 glTF 材质的查看器可能把玻璃显示为实心。导出不包含原场景的填充 shader、脉动、灯光或时间轴；这是最终收藏状态的静态资产。导出脚本会检查 GLB 头、JSON/BIN 分块、材质扩展、链环数量，并用 `GLTFLoader` 回读核对尺寸。

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const { scene: pendant } = await new GLTFLoader().loadAsync(
  '/assets/bloodbound/blood-heart-pendant.glb',
);
cabinetScene.add(pendant);
// 直接使用米制尺寸。收藏柜的放置坐标由柜子维护。
pendant.position.set(0, 1.2, 0);
```

导出使用 Three.js 官方 [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html)。没有使用第三方项链模型、外部付费服务或离线渲染。

## 控制接口

场景资源初始化完成后，场景所属的 `window` 暴露 `MemoryLaneBloodbound`，并发送 `memorylane:ready`。iframe 宿主必须从 `frame.contentWindow` 获取，不能从父页面自己的 `window` 直接读取。宿主可以监听 ready，同时保留有界等待接口以覆盖绑定监听之前已经就绪的情况，见下面示例。

| 方法 | 行为 |
| --- | --- |
| `enter()` | 清除存档后从序章进入，返回 Promise；应由用户点击触发以启动音频 |
| `pause()` | 只暂停 `playing`；返回 Promise，结果为是否发生暂停 |
| `resume()` | 从 `paused` 恢复，返回 Promise；建议由用户点击触发 |
| `replay()` | 与 `enter()` 相同：清除存档，重置碎柱、角色、接受状态后从序章开始 |
| `exit()` | 仅在 `complete` 状态请求退出，先触发可取消的 `exitrequest`；未拦截时镜头自动穿过东侧走廊和尽头的门 |
| `destroy()` | 停止场景、释放资源并删除该 window 上的 API；不发送 `exit` |
| `getState()` | 返回 `{ state, segment, accepted, audioReady, pose, focused, held }` 的当前快照 |
| `getKeepsake()` | 返回回忆内正在使用的 Three.js `Group`，不是 GLB 文件 |
| `getContext()` | 返回 `{ renderer, scene, camera, chapter, keepsake }` 活对象，供同一 Three 场景接管 |

`getState()` 的 `pose` 是玩家位置 `{ x, z, yaw, pitch, floor }`（米、弧度），`focused` / `held` 是准星当前对准和按住的互动目标标识，没有时为 `null`。这些只供调试和宿主展示，不是稳定的存档格式。

`getKeepsake()` 是活对象。不要把它直接 `add()` 到收藏柜中，这会从原场景移走项链；也不要释放它的几何或材质。跨场景收藏优先加载独立 GLB。若只做同页面临时预览，克隆也会共享几何/材质，必须明确资源所有权。

回忆由玩家行动推进，没有固定时间轴。外部状态为 `ready → playing → complete`，中间可以进入 `paused`（菜单、失去鼠标锁定或宿主调用 `pause()`）。默认出口再经历 `exiting → handoff`。宿主拦截出口时直接进入 `handoff`，根场景停止绘制、隐藏自身所有覆盖层（DOM 状态为 `external-handoff`），随后发送 `exit`，由宿主接管同一画布。加载和失败时 API 尚不可用，页面会显示加载或错误提示。

`playing` 内部分为八段：`explore`（序 · 月下教堂）、`danger`、`rescue`、`wound`、`intimacy`、`gift`、`wear`、`end`。每段的推进条件由玩家触发：走到祭坛 3 m 内、看向或等待猎人、按住互动 3 秒、对准项链接受等。总时长取决于玩家探索多久，宿主不应写死。

每进入一段（序章和尾声除外）会在场景 window 的 `localStorage` 写入 `memory-lane.bloodbound.checkpoint`，格式 `{ version: 1, segment, savedAt }`。读取时会校验版本和段名，无效数据直接丢弃。标题页据此显示「从存档继续」。宿主若要换账号或清空进度，删除这个键即可。

## 事件

这些都是场景 window 上的 `CustomEvent`，不是 DOM 冒泡事件，也不会自动跨 iframe。宿主在 `frame.contentWindow.addEventListener(...)` 上监听。事件顺序以状态变化为准，不要假定 `enter` 一定早于 `statechange`。

| 事件 | `event.detail` | 含义 |
| --- | --- | --- |
| `memorylane:ready` | `{ memoryId: 'bloodbound', segments }` | 初始化完成且控制 API 已挂载；`segments` 是上面八段的标识 |
| `memorylane:enter` | `{ memoryId: 'bloodbound', segment }` | 进入、从存档继续和重播都会发出；`segment` 是起始段 |
| `memorylane:statechange` | `{ state, segment }` | 状态或剧情段变化时发出，不是每帧进度 |
| `memorylane:accept` | `{ keepsakeId: 'blood-heart-pendant' }` | 玩家实际点击接受 |
| `memorylane:complete` | 下方完成载荷 | 每次完整播放完成一次；宿主入库要按标识去重 |
| `memorylane:exitrequest` | 完成载荷 + `context` | `cancelable: true`；同步 `preventDefault()` 可接管画布和出口 |
| `memorylane:exit` | 完成载荷 + `context` | 拦截时表示已让出画布；未拦截时开始默认退出。两者都不表示下一世界加载成功 |

完成载荷：

```js
{
  memoryId: 'bloodbound',
  keepsakeId: 'blood-heart-pendant',
  completed: true,
  exit: { position: [12.75, 0, -4.45], forward: [1, 0, 0], doorway: [5.65, 0, -4.45] },
  dialogueSource: 'BLOODBOUND — The Night You Were Mine, 2026-10-14',
}
```

出口坐标是教堂的局部米制锚点。`doorway` 是中殿东墙的双开木门，`position` 是走廊尽头那扇门的门槛中心，`forward` 指向门外。走廊沿 `+X` 从 5.1 m 延伸到 12.6 m，宽约 1.6 m，尖拱顶；尽头门外只有一团暖光，没有下一世界的内容。下一世界的入口应接在 `position` 之外，沿 `forward` 展开，坐标系和加载策略仍需双方商定。

### 片尾到出口的流程

1. 完成后片尾卡片上的“走向下一段回忆”不会立刻退出。玩家重新获得移动，中殿东侧双门打开，并提示“东侧的门开了 · 走廊尽头有光”。Lucien 留在原地，转身目送玩家。
2. 玩家走进走廊，距尽头约 3 m 时尽头的门自己推开，门后的暖光变亮。
3. 玩家走到走廊尽头（`x > 12.6 - 玩家半径 - 0.25`）时调用 `exit()`。此时派发 `exitrequest`，宿主可在这里同步 `preventDefault()` 接管画布。
4. 未拦截时，镜头沿走廊中线穿过尽头的门，进入暖白闪光，之后变暗，进入 `handoff` 演示页。
5. 宿主直接调用 `exit()`（或旧版代码从片尾直接退出）时，镜头会从当前位置自动经过中殿门口和整条走廊，效果相同。

“返回这段回忆”和 `replay()` 会把两扇门重新关上，走廊入口也重新封住。

出口事件额外携带 `context: { renderer, scene, camera, chapter, keepsake }`，与 `getContext()` 的对象相同。它含 Three.js 和 DOM 活对象，不能直接 JSON 序列化、持久化或跨窗口传输；记录日志时只保存上面的标识、坐标和类型摘要。

## 共享 Three 场景的所有权

- `scene`、`renderer`、`camera` 由当前回忆创建。宿主拦截出口后借用它们，自己启动下一世界的绘制循环、镜头过渡和 resize 处理。根场景不再绘制，避免两套循环抢同一画布。
- `chapter` 是当前教堂、角色、灯光等内容的父 Group。下一世界应作为独立 Group 添加到同一个 `scene`，不要塞进 `chapter`。宿主可以按已商定的空间关系移动相机穿过出口；正式世界拼接位置尚未确定。
- 借用 renderer 时 **不要调用 `destroy()`，也不要移除承载它的 iframe**。`destroy()` 会释放原 renderer，并遍历场景释放资源，宿主内容也可能受到影响。它只用于整个引擎彻底退出。
- 返回当前回忆前，先停止宿主自己的动画循环，移除并释放宿主添加的下一世界，恢复宿主改过的 `chapter.visible`、背景和雾等共享状态，再调用 `replay()`。根场景会恢复自己的绘制。不要留下两个并发渲染循环。
- 只想用独立引擎加载下一页面时可以在新页面准备好后彻底销毁旧场景，但那属于页面切换，不是本接口的共享空间穿行。

## 同源宿主直接接入示例

下面可以复制到同源宿主页面。它会捕获完成状态，并在用户点出口时同步拦截默认出口；真正的下一世界由宿主提供 `openNextMemory(detail)` 接入，返回 `{ stop(), dispose() }` 清理接口。未提供函数时使用默认演示出口，并明确提示尚未接入真实世界。全程没有 `postMessage`、通配 origin 或新网络权限。

```html
<button id="enter-bloodbound" disabled>触碰项链，进入回忆</button>
<button id="return-bloodbound" disabled>返回教堂回忆</button>
<p id="handoff-status" role="status">正在准备回忆…</p>
<iframe id="bloodbound-frame" title="BLOODBOUND 回忆" allow="autoplay"></iframe>
<script type="module">
  const frame = document.querySelector('#bloodbound-frame');
  const enter = document.querySelector('#enter-bloodbound');
  const back = document.querySelector('#return-bloodbound');
  const status = document.querySelector('#handoff-status');
  let api;
  let nextWorld;

  frame.addEventListener('load', async () => {
    const sceneWindow = frame.contentWindow;
    sceneWindow.addEventListener('memorylane:complete', ({ detail }) => {
      // 改接收藏柜的数据层；同一 keepsakeId 应只保存一份。
      status.textContent = `已完成回忆：${detail.keepsakeId}`;
    });
    sceneWindow.addEventListener('memorylane:exitrequest', event => {
      const detail = event.detail;
      if (typeof window.openNextMemory !== 'function') {
        status.textContent = '下一世界尚未接入，本次只显示默认出口演示。';
        return;
      }
      event.preventDefault(); // 必须在事件回调里同步调用，不能放到 await 后。
      enter.disabled = true;
      status.textContent = '正在进入下一段回忆…';
      // 微任务在 exitrequest 派发结束后运行，此时原场景已经停止绘制。
      Promise.resolve().then(() => window.openNextMemory(detail)).then(controller => {
        nextWorld = controller;
        back.disabled = false;
        status.textContent = '下一段回忆已接管同一画布。';
      }).catch(() => {
        // openNextMemory 失败时须自行回滚已添加的对象和动画循环。
        back.disabled = false;
        status.textContent = '下一段回忆暂未准备好，可返回教堂回忆。';
      });
    });
    for (let attempt = 0; attempt < 450; attempt++) {
      api = sceneWindow.MemoryLaneBloodbound;
      if (api) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!api) {
      status.textContent = '回忆未准备好，请查看场景内的错误提示。';
      return;
    }
    enter.disabled = false;
    status.textContent = '项链已就绪。';
  });
  enter.addEventListener('click', async () => {
    try { await api.enter(); }
    catch { status.textContent = '暂时无法进入，请再次点击项链。'; }
  });
  back.addEventListener('click', async () => {
    nextWorld?.stop();
    nextWorld?.dispose(); // 只移除、释放下一世界；不得 dispose 共享 renderer。
    nextWorld = undefined;
    api.getContext().chapter.visible = true;
    back.disabled = true;
    enter.disabled = false;
    await api.replay();
  });
  frame.src = '/bloodbound.html';
</script>
```

`openNextMemory` 是示例宿主提供的函数，不是本项目已实现的方法。它应在下一世界真正准备好时 resolve，失败时回滚自己的对象和循环后 reject。其 `stop/dispose` 需恢复它改过的共享背景、雾和镜头设置；不释放共享引擎。正式接入仍需团队确认下一场景入口、两段场景的加载与释放时机、收藏柜的数据保存，以及是否需要跨域通信协议。

## 验收记录

以下是上一版线性时间轴的验收记录，接口和画布所有权部分仍然适用；时长、44 秒等待等描述已不适用于当前可探索版本。

2026-10-15 已通过本地 Chrome 的正常用户按钮操作验证，未用控制台修改时间轴或伪造事件：

- 项链 GLB 头、JSON/BIN 分块、3 个材质、玻璃透射扩展及 GLTFLoader 回读尺寸检查通过。下载地址返回 HTTP 200、`model/gltf-binary`，与源文件 SHA-256 一致。
- 最终宿主实际收到 `memorylane:ready`，载荷包含 `memoryId: bloodbound` 与 `duration: 61.35`。宿主进入、暂停、继续、重播都收到实际状态事件；`getKeepsake()` 返回包含 60 个 mesh 实例的 Group。
- 完整正常演出在 44 秒等待；点击“接受他的项链”后收到 `accept`，约 61.35 秒收到 `complete`，当时 `accepted: true`。
- 在新的共享画布版本中，片尾点出口后宿主同步 `preventDefault()`，实际状态变为 `handoff`，DOM 变为 `external-handoff`，覆盖层隐藏并收到 `exit`。`getContext()` 与事件提供的是同一个 renderer。
- 间隔 700ms 的 renderer 渲染帧计数为 `[9413, 9413]`，确认根场景已停止绘制；点击“宿主绘制一帧”后计数变为 `9414`，证明宿主确实可用同一 renderer 绘制。随后宿主重播恢复 `playing`、原 UI 和画面，`accepted` 重置为 false。
- 在前一版事件宿主中，还实际验证了取消勾选拦截后的默认 `exit → handoff`，以及 `destroy()` 清除画布和 API。新版本的正式跨世界空间拼接仍未验证，因为尚未收到另一世界的实现。
- 最后检查未发现浏览器控制台 warning/error。验收结束关闭测试标签，避免常驻 GPU 绘制。

截图保存在 `.local/bloodbound-review/`：`integration-accept-20261015.jpg`、`integration-shared-handoff-20261015.jpg`、`integration-host-render-20261015.jpg`。这些是接口与画布所有权的证据，不是人物最终美术验收或真实下一世界联调通过的证明。

## 最终默认版本补验（2026-10-15）

默认人物为 `characters/lucien.glb`，SHA-256 `4524f4be295e1a031718c64044a825885c2748fb30aacff9fce50fd4cf71d52d`。独立评审从默认入口连续完成 0 → 44 秒等待 → 接受 → 61.35 秒完成；七句字幕均实看，暂停、继续、重播、默认出口与返回正常。

当前 `getKeepsake()` 实测为 61 个 mesh 对象：新增的一个 InstancedMesh 用于佩戴时展开完整链条。独立收藏 GLB 保持 60 个 mesh node、180,332 bytes，SHA 与上表不变。两者不能混用数量。

同源宿主拦截退出后，原 renderer 帧数实测 13307 → 13307；宿主绘制一帧后为 13308。销毁后 API 不存在，canvas 与 stage 数量均为 0；对同一个 WebGL2 context 的只读检查确认 `isContextLost()` 从 false 变 true。该结果验证当前资源释放，不表示真实下一世界已接入。
