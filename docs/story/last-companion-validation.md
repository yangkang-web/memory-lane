# 最后一次并肩：实现与验收记录

状态：当前页面为保留坍塌、断臂与地铁逃生的 60 秒重新剪辑版，最新检查与限制以本文最后一节为准。早期 8 分钟及完整剧情快放记录仅作历史证据；声音尚未做听觉验收。

## 已有实际证据（2026-10-14）

- 39 条本地中文对白已从空 WAV 重新生成；逐文件确认 PCM 数据非空，总长约 48.7 秒。浏览器没有音频解码错误。表演仍是本地合成语音初版，尚未做完整听感验收。
- 已修正开始播放时负数计时；时间线覆盖全部 480 秒。
- 26 秒实景复查：第一人称肘部朝下，不再横占半个屏幕。
- 104 秒侧移机位可看到店员的反射脸；已进一步去掉遮挡面部的中央冷柜边框、补完整主角倒影，最终版本还需要再看。
- 350 秒可见单臂包扎，左前臂不再出现，撬杆暂时离手；`evidence/story-350-bandage.png`。
- 405 秒楼梯机位已脱离台阶，地面和土层有真实出口开孔；`evidence/story-405-stairs.png`。
- 435 秒广场使用低角度夕阳，远处尸群已扩展；浏览器未报错。人物资产仍有明显程序化外观，需要继续美术打磨。

- 从 405 秒恢复自动播放，时间自然到达 480 秒，结尾面板出现；控制台在该段没有新错误。这是运行连续性证据，期间并未逐帧观察，不能代替最后 75 秒完整视觉审核。
- 最终版本从剧情退出，实际回到《向日葵》室内、原 HUD 与晴天漫游，未看到剧情角色残留。
- 人物新增连续头部几何、分节抓握手指、独立眼球跟随、完整主角反射替身；脸部材质与战斗表演仍需继续打磨。
- 结尾终端已加入实体石槽支撑与放置过渡，腰侧道具只有抽象外观，不包含操作细节。

## 独立体验记录

独立 reviewer 使用自己的浏览器标签，对 60–240 秒关键帧和短片段做了初步体验。证据：`evidence/story-review-{104,118,124,138,209,218,229}.jpg`。

发现并已在代码中修正、仍待最终版本复验：镜中双眼遮挡、近战敌人离开画面、209 秒巷外城市消失、仓库层板悬空、包扎缺少绷带。抓脚踝、闻血、近战仍需持续调试。该体验并非完整连续观看，不能作为最终独立验收。

## 必须继续完成的验收

- 开头罐头、水、背包、终端、电源及开门：手和道具有明确接触，不瞬移，不穿过桌面。
- 便利店收集、柠檬糖旧录音、镜中双眼跟随、回头贴脸：完整连续观看，不只截图。
- 两次挥击、衣袖被抓、背包反击、肩部擦伤：动作接触和受击反应明确。
- 后门两次拉动、低位插销、脚踝被抓、警报挣脱、踢开、垃圾箱挡门：按因果顺序发生。
- 车旁包扎、血迹入水、闻血长啸、屋顶/窗口/车库/卷帘门响应：血迹与感染者位置一致。
- 翻车、路障、橱窗扑击、左转、积水裂缝、路面两次断裂、落入地铁：模型和镜头都有对应事件。
- 被梁压住、手电扫站台、够撬杆、挡敌、杠杆救援、第二次坍塌、失去左前臂、包扎站起：伤势持续，动作清楚。
- 单臂搏斗、屈膝、低头闪避、背包丢失、检修门、门缝手、撬杆闩门、内门、跛行楼梯、三次撞门：完整连贯。
- 广场挣扎站立、巨型感染者拖围栏、普通感染者让路、尸群堵出口、地图路线熄灭、掉撬杆、单手点烟与咳嗽：每件事必须实际可读。
- 结尾腰侧道具、终端放入石槽、最后对话、尸群冲锋、烟落地、抬头切黑、呼喊/爆响/耳鸣/无人回应：保持原剧情，完成声音和镜头混合。
- 道具和角色近景美术质量、角色比例、动作节奏与已有城市材质一致。
- 完整连续播放 8 分钟，暂停/继续/章节跳转/重看/静音/退出漫游均工作；退出后天气、天空、道路覆盖、HUD、镜头恢复。
- 所有修复后独立 reviewer 再体验；没有完成这一步前不能标记目标完成。

## 回归检查范围

`tests/companion.test.js`：时间线覆盖、机位有限值、持续伤势/道具状态、本地音频有效性、楼梯净空。

`tests/ruins.test.js`：道路塌陷与楼梯出口实际缺少道路三角形、临近路面完整。

这些测试只覆盖相应数据和几何不变量，不证明动画、美术或完整剧情体验已经达标。

## 2026-10-15：实物交互与入口回归

- 新增 `companion-interactions.js`：场景中的罐头、水瓶、背包、电源、糖包作为同一物件连续移动；支持倒退跳转恢复父节点和原始姿态。补空罐内壁、水位、瓶身套标、背包开口及内衬。
- 终端从桌面抬起、擦拭灰尘、插接电源、按压接头与收入口袋均有连续过渡。26 秒浏览器确认屏幕、供电线、电源可见；手形仍需继续打磨。
- 独立 reviewer 从 0 秒自然连续播放到 123 秒（无 seek、暂停或 HMR，间隔截图观察）。取水入包、接电与倒影眼睛可读；声音未做实际听觉验收。发现 57 秒旧楼体遮挡、85 秒糖包过大、反射持物不一致。
- 此后修复入店通道：路线经过 z44 的破损开口，店门、招牌、尸群进门位置同步；清理低位叶片，移动原柜台，后墙及楼芯留通道。57 秒实拍已能看到货架，证据 `evidence/story-entry-57-fixed.png`。右侧仍有斜枝，最终连续通行仍需复核。
- 糖包缩小，手改为握边；反射替身添加与第一人称一致的铁管和手电位置，需复验。
- 后门新增实体弯把手、两次拉动受阻与低位插销；182 秒实际画面已看到手与把手，手形仍不自然。
- 闻血感染者从远处移到实际血迹旁，增加渐散污迹和浅湿路面。第一轮发现水面过亮且高于路面，已在代码中降低高度、反射与不透明度，待复验。
- 新增 `tests/interactions.test.js` 验证倒退跳转及退出时实际道具复位，27 项测试通过；这些检查不代表角色美术达标。

### 第二轮逃生复查与修正

独立体验范围为 54–66 秒自然播放；180–217 秒顺序播放中暂停观察，随后补查 186/192/193/198/202/204/209/218/229/234 静帧。确认入店、巷外城市、包扎道具、闻血画面改善，控制台没有警告或错误。不能记为 180–240 秒完整连续验收。

发现：插销与左手有间距；抓脚段靴子落在地面以下且终端不入镜；218 秒右手未压住伤口。

随后修复并实拍：193 秒左手已到插销拨片；201 秒靴子、感染者抓握和报警终端同时可见（`evidence/story-alarm-201.png`），敌人不再贴进相机。完整抓握到踢开的运动仍待再看。门洞的低位藤蔓已沿边缘重排。

**仍未解决**：218 秒压伤口的接触；角色脸部与手部仍明显程序化；近战/地铁/广场的全部动作清单及整片 480 秒、完整声音混合均未通过最终验收。继续工作不能把这些项略去。


## 2026-10-15：反击、包扎与地铁空间修正

- 新增 `companion-performance.js`，将 135/138 秒两次反击分成独立的蓄力、触碰、回收，并在击中后启动敌人回退/倒地；不再使用这段的连续正弦挥动。横挡时铁管真正横在双手之间。
- 以实际指弯中心对齐武器轴线，以掌心对齐伤口；218 秒按压后才开始缠绕。绷带卷跟随右手，放出的布条连接伤口；349 秒后的动作保持左前臂缺失。右手/左手姿态在倒退跳转时完整复位。
- 角色增加局部肤色变化、细小凹凸、眼睑、脸部阴影、指节和指甲；去掉原来的巨大椭圆脸部斑块。铁管增加锈迹和细划痕。它们仍是程序化人物，不能宣称达到商业游戏角色精度。
- 修复地铁近景感染者从站台移动到轨道上方后悬空的问题；限制其路径在真实站台内。抓包者与镜头保持距离，普通追兵绕开镜头，避免 378–379 秒面部穿入画面。
- 横梁由实心盒子改成带翼缘、腹板和螺栓的工字钢；调整 330–337 秒机位与受压左臂，增加撬杆对准梁底并下压的动作。333 秒实拍可见横梁、受压手臂和撬杆；仍需继续打磨手形与完整受力过程。
- 弯烟和打火机缩小，增加打火机掉落/拾回轨迹。最终点烟表演未作为本轮通过项。
- 新增三个实际骨骼/物件几何测试：两个击中时刻、按压与绷带卷跟随（含倒退跳转）、撬梁时握持。测试用 Canvas stub，不验证贴图美术。最终构建及 31 项测试通过；原有大包体警告仍在。

### 本轮独立体验范围与结果

1. 240–352 秒自然播放，352 秒暂停后发生热更新；重新从 360–480 秒自然连续播放。道路坍塌、楼梯、出口、广场和结尾字幕可读。该轮发现 344 秒悬空、378–379 秒穿镜、449 秒点烟构图靠下。没有进行听感验收。
2. 修复后的自然播放片段：132–157、214–231、341–391，各段内部未跳转。另用静帧检查 135/138/218/344/352/378。观察到的反击接触、包扎接触、站台悬空、抓包穿镜问题通过针对性复核；工具采样没有完整捕获两次挥击的每一步，不把它记作整段动作或整片通过。控制台无警告/错误。
3. 上述第二轮发生在最后的工字钢和握持方向调整之前；最后一批另做 333/135 秒局部复核，不能扩写为完整 8 分钟验收。
   最终静帧复核确认：333 秒工字钢腹板、翼缘、撬杆和双手均入镜，原遮挡已解决；仍留 P2：右手腕反折明显，握杆受力姿势不自然。135 秒弯指贴住杆身，管端接触头部，握持方向可读。控制台无警告或错误。证据为 `evidence/beam-review-333.jpg` 和 `evidence/beam-review-135.jpg`；不代表连续撬动或挥击已经通过。

证据：`evidence/story-counter-135-refined.png`、`evidence/story-bandage-218-contact.png`、`evidence/story-lever-333-refined.png`、`evidence/action-fix-review-{135,218,344,352,378}.jpg`。

**继续项**：窗口/车库/卷帘门/屋顶群体响应的实物事件、路障和窗破扑击、背包反击、撬杆拾取与完整受力表演、检修门缝手、巨型感染者拖围栏、单手点烟与结尾声音；人物与货架物品仍需美术打磨；最终整片连续声画及独立验收仍未完成。

## 2026-10-15：街道苏醒与碎窗追击

- 新增 `companion-street-response.js`：在东侧街区前部搭建有深度的车库、卷帘门、上层窗室和低屋顶，沿用现有砖墙/混凝土贴图。
- 234 秒后窗内人影开始移动；车库栅门逐步抬起，三名感染者低身穿出后逐渐站起；卷帘门在 235.7/237.1/239.2 秒分别受撞、弯曲并掉落碎屑；屋顶三个身影错时靠近边缘。屋顶与窗口角色不会在 251 秒突然移到街道。
- 中远景尸群从车库方向陆续进入道路，替换原先 36 人同时出现在路面的阵列。镜头从车库向上扫过窗口与屋顶，再转向逃生路线。
- 增加两段破损路障，中间保留主角通行空间；增加 91 米处的实际橱窗、262 秒玻璃碎片和对应的感染者扑出/落地/追赶轨迹。玻璃声与实际破裂同步到 262 秒。
- 新测试检查感染者不穿过尚未碎裂的实际窗面、玻璃碎片和栅门倒退跳转复位、屋顶角色始终有屋面支撑。32 项测试、构建、diff 格式检查通过；这些检查不代表美术或整片验收通过。
- 主浏览器 238 秒确认窗口人物、屋顶人物和车库入口入镜，证据 `evidence/street-awakening-238.png`。这一轮仍需要独立连续播放复核；人物精度、屋顶翻越完整性、近身扑击接触及声音听感未据此宣称完成。

### 街道独立复核及修正

独立 reviewer 先从 232 连续运行到 291 秒，无暂停、跳转或热更新；随后补 237/263/268 静帧、235–238 和 261–267 短段密集截图。窗口人影、屋顶三人、车库爬行者和路障可见，262–267 秒可辨认碎窗、过街、近景伸手逼近，未发现贴镜穿模。控制台无警告或错误。该证据属于截图采样，不是逐帧或声音听感验收。

发现两个 P2：道路角色沿用了人行道高度，脚底偏高；卷帘门远景撞击不明显。随后按实际靴底校正近景跑动角色落脚，远景尸群区分道路和人行道高度；加强卷帘门外鼓、扭曲、底边跳动，并让 236–236.6 秒视线停在门上。新增真实角色骨骼的靴底接地检查，最终 33 项测试与构建通过。主浏览器 266 秒复查脚底已到路面，证据 `evidence/street-pounce-266-grounded.png`。两项修正的独立复验另记，不扩大原验收范围。

最终局部独立复验：235–240 秒自然播放，236–237 秒补密集截图，266 秒静帧。确认扑击者和前列尸群靴底贴路，关闭本轮悬空 P2；卷帘门取景及变形部分改善，但仍容易被左侧车库动作抢走注意，保留低优先级可读性 P2。控制台无警告或错误，未进行声音验收。证据：`evidence/street-fix-review-266.jpg`、`evidence/street-fix-review-shutter.jpg`。

## 2026-10-15：检修门、出口锁扣和拖行围栏

- 新增 `companion-door-escape.js`：检修门洞与两米门扇对齐；增加可见拉手、门框承托件和受压锁舌。靠近门把重新安排 388–395 秒机位，门缝里三只手随门角度移动并退回。
- 使用第一人称的同一个撬杆模型，完成移向门把、插入、松手压门、抽回；移除原来的第二根矩形门闩。为衔接广场仍持撬杆，394–395.2 秒加上取回动作，门暂由已经卡住的锁舌维持关闭，随后在 409 秒被冲开。
- 出口门增加横梁、门框铰链和实体锁扣。第一次冲击回弹，第二次锁扣松动，第三次锁片掉落并将门撞倒；跳回较早时点会恢复锁扣。
- `companion-fence.js` 根据巨型感染者实际手部握持点求围栏姿态，一端抬起、一端贴着广场石砖拖行，替换原先整片竖直平移。
- 36 项测试与构建通过。新增实际握持/门把空间检查、锁扣阶段检查、围栏握点与尾端贴地检查；不能用这些几何测试代替动作、美术或声音验收。
- 主浏览器实景：392 秒检修门手、撬杆与门把可见，435 秒围栏倾斜拖地。证据 `evidence/maintenance-door-392.png`、`evidence/plaza-drag-fence-435.png`。正进行独立连续段复核；近景手部姿态仍需按画面继续打磨。

### 检修门与出口的独立复核

独立 reviewer 首轮自然播放 384–451 秒，另补 392/393/416/435 秒及 411–419 短段。门缝三只手的出现和退回、围栏一端被握持另一端拖地可辨认；发现 384 秒墙体遮屏和 412/415 秒锁扣裁切。随后增加 384 秒绕墙路径键帧、将撞门视线转向实体锁扣，并增加门框承托件。37 项测试、构建通过。

最终局部复核自然播放 381–389 与 411–420 秒，补查 384/412/415：384 秒门洞边界可读，412/415 锁扣完整入镜、419 倒门明确。仍发现 388 秒背景尸群占据左半画面；已将该侧背景追兵限定在检修室前墙之外，添加镜头净空检查。该项后续复验另记。证据 `evidence/door-fix-review-{384,388,412,415}.jpg`。控制台无警告或错误，未完成听感验收。

## 2026-10-15：撬杆连续拾取与门口群演避让

- 新增 `companion-crowbar.js`，让第一人称同一个撬杆模型落在轨道地面、被右手抓住并抬起。二次坍塌时从梁边掉落，包扎后再次单手拾起；不再靠地上模型隐藏、手中副本突然出现来切换。
- 调整 321–327 与 354–359 秒俯身机位，先握住再起身；拾取点避开轨枕、斜坡和散落碎石。手掌沿杆身转动，握持点对齐弯曲手指。倒退跳转会恢复落点和手势。
- 背景尸群留在站厅内，不进入检修室和镜头路线；门缝特写的三只手仍由近景角色表演。
- 39 项测试、构建及 diff 格式检查通过。新测试验证落地高度、握持接触、拾取前后连续性、倒退恢复及背景群演空间；不验证纹理质量、声音听感或整片动作。已有 GLTFLoader 大包体构建警告保留。
- 主浏览器 324/356/388 秒可见道具和手，原背景群演贴镜已移开。证据 `evidence/crowbar-pickup-324.png`、`evidence/crowbar-pickup-356.png`、`evidence/maintenance-door-388-clear.png`；控制台无警告或错误。人物、手腕、袖口和断臂包扎仍有程序化外观，不能当作最终美术通过。
- 独立 reviewer 自然连续运行 320–328、353–360、386–393 三段，段内没有跳转、暂停或热更新，约每两秒截图采样；另补 324/356/388 静帧。确认两次拾取因果可读、328/360 后续仍持杆、没有地面或碎石遮没撬杆；388 背景尸群贴镜已消除，关闭该项 P2。证据 `evidence/pickup-review-{324,356,388}.jpg`。控制台无警告或错误，未进行听觉验收。
- 保留 P2：324 秒袖口遮住掌心和多数手指，接触略像袖口顶杆；356 秒握持更清楚。尝试改变掌心朝向后改善不足，已恢复到该轮独立复核版本，后续需调整前臂/袖口造型及肘部姿态。390 秒抽样仍由门板占据大部分画面，不能凭 392 静帧扩大宣称整段插杆通过。
- 完整 480 秒连续声画、全部近战接触、结尾点烟及声音混合仍待完成。

## 2026-10-15：结尾单手道具与连续落物

- 新增 `companion-finale.js`，使用同一支弯烟和同一个打火机，完成取烟、暂叼、打火机落地、右手拾回、三次打火、收回打火机、咳嗽弯腰、手抖、终端放置时暂叼、最后烟落地。左前臂不会在这些动作中恢复；腰侧物件仍只保留封闭的抽象外观。
- 打火机落点对齐喷泉内侧 .17 米石面；拾回时按实际手指位置求握持，跳转倒退恢复落点与点燃状态。烟雾从多边形球改为柔边透明片，不再投射实体阴影；滤嘴从画面底边外延入，手掌改为从下方握打火机。
- 447.55 秒落物、449.15/449.65/450.2 秒打火与451.8秒咳嗽声已对齐动画；机械短响和咳嗽仍是程序合成，尚未听验，不宣称真实表演完成。
- 443.3–444 秒改用原来手中同一根撬杆掉落并在石面轻弹，移除地面副本；镜头转向落点，落地后不跟随相机。主浏览器444秒实拍 `evidence/finale-crowbar-444.png`。
- 新增/扩展实际几何检查：打火机落地、拾取握点、火焰与烟头距离、单臂持续状态、松手连续性、烟与撬杆落点、后续相机移动不带动物件、倒退恢复。这些检查不证明火焰在画面里清楚或动作美术已达标。

### 本轮独立复核

第一轮实际覆盖444–474自然播放（474时因另一个标签取得焦点而暂停），随后续播474–480；另复看445–453、463–466、472–475以及450附近短采样。发现香烟整体悬浮与火舌被手遮挡两项P2。随后修复滤嘴位置、握持方向和烟雾。

修复后独立自然播放445–453、463–466，另从450开始密采样。关闭完整香烟悬浮P2，确认终端放置衔接且无第二只手冲突。点火P2只部分改善：手掌已让开，但淡黄火舌仍与烟身重叠，打火机和火焰根部受播放栏遮挡，接触关系不够清楚。没有新增P1，控制台无警告/错误；未做听觉验收。证据 `evidence/finale-fix-review-flame-a.jpg`、`evidence/finale-fix-review-flame-b.jpg`、`evidence/finale-fix-review-terminal.jpg`。主浏览器终端截图 `evidence/finale-terminal-464.png`。

最终本地40项测试、构建、diff格式检查通过；仍有原有GLTFLoader大包体警告。撬杆最终独立复核自然播放442–446，另从443起约0.8秒密采样：同一根杆从竖持转斜再落在石面，444–445未见重复、突然切换或明显悬空；446地面杆仍在右侧，取烟衔接成立。松手指尖接近底栏，不能算精细指部动作通过。本轮无新增P1/P2，控制台无警告/错误，未听音。证据 `evidence/finale-drop-review-444.jpg`、`evidence/finale-drop-review-motion-2.jpg`、`evidence/finale-drop-review-motion-4.jpg`。近战/完整受力动作、人物与道具美术、点火构图、完整声音混合以及480秒整片最终验收仍未完成。

## 2026-10-15：点火构图与撬梁握持继续打磨

- 点烟时以嘴端为固定轴抬起烟头，打火机跟随新的烟头位置；火根和喷口移出底部控制栏，烟雾从旋转后的实际烟头产生。补充投影范围与嘴端固定检查，避免再次整体抬烟导致悬浮。
- 独立 reviewer 自然播放449–452，450秒内密采样5张；另看331–338和333–335。确认点火接触关系可读、烟头发亮后冒烟、滤嘴仍从底边延入，关闭旧点火P2。控制台无警告/错误，未听音。证据 `evidence/ignition-polish-review-2.jpg`、`evidence/ignition-polish-review-4.jpg`；主浏览器 `evidence/finale-ignition-visible.png`。
- 撬梁首次调整绕杆轴握持方向，333秒反折改善，但独立复核指出手掌像托碰、拇指张开；334–335手腕大部分出画，不能以画面关闭后半段问题。
- 随后按真实肘到腕方向迭代修正手掌绕杆轴角度，并仅在撬梁时收拢拇指。其他抓握默认恢复原拇指角度。332–337秒几何测量由后半段92–96度改善至约33–65度；扩展握点与小于70度腕角检查。几何角度不代表人物美术自然，最后版本仍需独立复看。
- 最后版本40项测试、构建及diff格式检查通过，原有GLTFLoader大包体警告仍在。整片480秒声画、其余近战动作与人物美术仍未验收完成。

最终握持独立复核：331–338自然播放末尾截图采集超时、页面停于338；随后补跑331–334并保存332/333/334截图，另查333静帧。332–333可见拇指内收与其他手指形成夹握，较张掌托碰明显改善，局部握持P2关闭；未见新的明确手指穿杆或脱离。334后腕部出画，不扩大为全时段视觉腕角确认。控制台无警告/错误，未听音。证据 `evidence/beam-grip-final-review-332.jpg`、`evidence/beam-grip-final-review-333.jpg`、`evidence/beam-grip-final-review-334.jpg`。完整受力节奏与整片验收仍以待办清单为准。


## 2026-10-15：背包反击、仓库通路与右手拾灯

- 新增 `companion-backpack.js`：使用实际收集的同一个背包完成抓扯、抬包撞胸与铁管推开。背包增加帆布凹凸、圆角包体、闭合顶盖、缝线、肩带扣和提手；开头收物时仍打开。近景追兵分开，避免头部/躯干相互重叠。
- 第一轮独立自然播放162–174，另补169秒密采样，发现铁管推开时脱离右掌、170–174被冷柜/近身追兵遮屏，以及背景追兵重叠。随后改成接触后才后退，调整肩部可达范围；绕过冷柜南端穿过真实仓库门洞，侧窗、碎片和侧扑位置同步移动。
- 修复后独立体验实际为162–167、167–178两段（167因自动暂停中断，不能记成一次连续播放），另密采样169–170。确认铁管持续连着右掌，追兵分开，171–174绕冷柜至后门通路可读，侧扑在右侧玻璃处；关闭上述三项P2。164抓包的精细指部接触仍受包体遮挡，未据此宣称通过。
- 新增 `companion-torch.js`：左臂受压时由右手拾起地上同一个手电，扫视站台，再放到地上腾手拿撬杆；二次坍塌后该灯滚动并闪烁。移除这一段左手持灯副本与没有实体的相机跟随光。手电增加灯头圈、筒身防滑纹、开关及镜片；313–317机位避开横梁。
- 手电初次独立309–321连续体验发现放灯压入轨枕和袖口遮握点。随后落点移至轨枕端点外，俯身位置抬高；按真实肘到腕方向迭代掌心绕灯轴角度，手从下方握灯、拇指收拢。
- 最后独立309–321自然连续播放，段内无seek、暂停或HMR；另补准确311/320静帧。315袖口已退到手下方，319手指贴筒且手臂从轨枕上方经过，320完整灯体在轨枕端点外；关闭两项手电P2。311仍有部分遮挡，不扩大为精细手指全时可见。无重复手电、左臂举灯或新的明确穿模，控制台无警告/错误；未听音。
- 证据：`evidence/backpack-review-push-4.jpg`是修复前问题；修复后以第二轮独立记录为准。手电最终证据 `evidence/flashlight-final-review-315.jpg`、`evidence/flashlight-final-review-319.jpg`、`evidence/flashlight-final-review-320-static.jpg`、`evidence/flashlight-final-review-311-static.jpg`。自然播放采样文件`311.jpg`实际约312秒，不能当准确311秒。
- 新增背包抓握/撞胸/推开、手电右手拾放/倒退恢复/轨枕净空、仓库路线净空回归。43项测试、构建与diff格式检查通过；原有GLTFLoader大包体警告仍在。几何检查不代替视觉、美术或听觉验收。

仍需继续：衣袖抓扯与货架撞击、单臂近战和衣服撕扯的完整接触、324拾撬杆袖口遮挡、近景角色与道具美术、晨雾环境、声音表演/混合及最终480秒完整连续声画与独立验收。目标保持开发中。


## 2026-10-15：过道抓袖、撞架与蹬踹

- 新增 `companion-aisle-fight.js`，154–163秒从第一下铁管撞胸、第二挥击被抓袖、甩向货架、踹倒下一名追兵衔接到背包段。货架成为可倾斜对象，柜门在受击后落到通路上；相机有跨越柜门时的抬升。
- 独立第一轮153–165自然连续播放，另补154/158密采样及157/160静帧：第一击、倒地和柜门顺序可读；抓袖被衣袖和底栏遮挡，踢击看起来像抬膝，撞架身体接触偏弱。未听音，控制台无警告/错误。
- 修正第二次挥击的姿态连续性；抓袖改为镜头侧接触并抬高手臂，调整交手间距；靴子增加鞋底和鞋带，抬起脚尖以鞋底接触腹部，连接脚踝的裤腿随蹬踹伸展。主浏览器157/158/160静帧可见接触位置与靴面，最终以独立连续复核为准。
- 44项测试、构建及diff格式检查通过。几何检查覆盖连续持管、敌人抓袖、鞋底接触腹部、倒地、货架反应及倒退恢复；不能代替动作可读性与美术验收。原有GLTFLoader大包体警告保留。

- 第二轮独立复核关闭抓袖不可辨与靴子像抬膝两项P2，但发现钢管穿胸、撞架时层板插入头部。最终钢管前移，抓袖IK加入仅此动作使用的下沉肘部方向；松袖后收杆到右下，撞架机位后退，受击者向货架外侧前俯。
- 最终独立156–161自然连续播放，无段内seek/pause/HMR，另从158秒密采样。确认157完整钢管在胸/上臂前方，层板插嘴/脸已消失，关闭两处相交P2。肩背撞架着力点仍不突出，记作观感备注，未扩大为美术达标。控制台无警告/错误，未听音。证据`evidence/aisle-contact-review-157.jpg`、`evidence/aisle-contact-review-dense-4.jpg`至`dense-6.jpg`。


## 2026-10-15：单臂逃生接触初版

- 新增 `companion-single-arm.js`，360–386秒覆盖右手持杆击中首名追兵、回收撬杆、第二人受撞移开、衣料被抓扯并断开、同一个收集背包被另一名追兵拉走。左前臂保持缺失，不参与抓握；原占位背包在这一段隐藏。
- 362秒视线下压至受击胸部；382秒改看前右侧，避免对白“别看后面”时镜头反向。背景追兵与近景表演者分开。
- 45项测试、构建、diff检查通过。新增连续右手握杆、362命中、衣料握点、381–383肩带握点、倒退隐藏布条检查。主浏览器362/379/382已查看，但肩撞、低头闪避及保护终端的完整动作观感仍需以连续复核判断，不能仅靠通过几何测试关闭。

- 首轮独立359–386未中途暂停，但370附近采样超时，不能称逐帧完整观察；补跑377–386与379–381密采样。362命中、363回收/倒下、第二追兵让路可读。发现抓衣后手臂跟随镜头/横脸、包后抓手不可见、384墙上孤立蓝袖三项P2；无P1或控制台警告/错误，未听音。
- 修正379.6后抓衣者固定留在站台并松手，布条380.2前落下；背包改为从380.3固定世界姿态出发的轨迹，由追兵抓顶部提手，抢包人不再跟着相机穿进检修墙。扩展释放者位置固定、提手握点和检修区域净空检查。最终45项测试、构建和diff检查通过；原有GLTFLoader大包体警告仍在。主浏览器证据`evidence/single-arm-bag-handle-381.jpg`。

- 最后独立377–386自然连续播放并逐秒附近采样，无暂停/seek/HMR或超时：380抓衣者后仰松手、留在后方；381明确抓住背包顶部提手；384墙面无孤立蓝袖、手臂不再穿脸。三项旧P2均关闭。证据`evidence/single-arm-fix-review-380.jpg`、`evidence/single-arm-fix-review-381.jpg`、`evidence/single-arm-fix-review-384.jpg`。控制台无警告/错误，未听音，仅确认这三处局部修复。

当前交付边界：过道抓袖/踢击与单臂击打/衣料/背包已有局部连续复核；肩撞与扶柱受力、低头越顶、324拾撬杆袖口遮挡、近景角色美术、晨雾、音效与对白听感，以及480秒完整连续最终验收仍需继续。目标保持开发中，不声明全片完成。

## 2026-10-15 整片运行与第二轮接触修正

- 独立 reviewer 从 0 秒自然运行至 480 秒，中途无 seek、暂停、热更新；结尾面板出现，返回漫游恢复《向日葵》屋内、日照和晴/少云/小雨状态。控制台无警告或错误。共保存 52 个不同时间点，清单为 `evidence/full-story-review-samples.json`。
- 该轮是完整运行与间隔视觉采样，0–35、35–59、173–198、454–480 秒采样间隔较大，365–378 仅取得 370 秒画面；不能当作逐动作或听感验收。
- 剧情新增灰白晨雾和柔和冷光；地下保留局部照明，出口过渡至夕阳，退出还原原太阳雨。感染者调整眉眼、眼球混浊和颊部凹陷；仍为程序化人物，未达到写实成品精度。
- 整片复核发现 136 秒货架插入敌人肩胸、362 秒倒地者下半身沉入站台、389 秒三名追兵躯干重叠，以及 208 秒垃圾箱遮屏。对应修改为：反击移到货架侧空地并向侧面倒下；按实际模型最低点支撑倒地姿态；门前三人沿门宽错开；镜头从垃圾箱侧面绕行。
- 367–369 秒新增实体立柱，持杆右手靠柱起身；371–375 秒改为从右侧站台飞扑、越过低头后的相机并跌入轨道。证据 `evidence/pillar-brace-368.jpg`、`evidence/overhead-dive-373.jpg`。
- 324 秒拾杆使用外侧肘部方向与腕部迭代对齐，闭拇指，手指露出袖口。证据 `evidence/crowbar-visible-grip-324.jpg`。
- 修正角色复用时头部回转、眼睛偏转及掌心姿态残留；增加正常播放/反向跳转的姿态一致性回归检查。


后续独立局部复验：133–142、205–211、321–327、360–377、387–394 秒自然播放，各段内无 seek/暂停，约每 0.8–1 秒采样，另补 324 静帧。关闭本轮货架穿模、垃圾箱遮屏、站台沉地、三人躯干重叠四项问题；拾杆、扶柱、头顶飞扑可读。控制台无警告或错误。证据 `evidence/patch-review-samples.json`、`patch-review-324-static.jpg`、`patch-review-360-10.jpg`、`patch-review-360-16.jpg`、`patch-review-387-2.jpg`。

375 秒最初落地时双臂仍保持飞扑姿态，几何检查发现手臂伸入轨道地面；已在落地时收拢双臂，模型最低点恢复至 -7.999 米，高于 -8.05 米轨道地面，并增加朝落点的一瞥。新增相机净空、落地高度及回退一致性测试。主浏览器证据 `evidence/track-landing-375.jpg`，独立短段复验结果另记。

另修复“静音后退出再进入”按钮状态残留；主浏览器确认新剧情实例按钮恢复为“静音”、未按下。最终 47 项测试、生产构建和 diff 格式检查通过，保留原有 GLTFLoader 包体警告。

最终落地独立复核：371–378 秒自然播放，无段内 seek/暂停，约每 0.6–0.8 秒采样，另补 375 静帧。确认 373 头顶越过、374–375 完整身体趴落轨道旁、377 转回出口，关闭落地入地问题；无新增明确 P1/P2，控制台无警告或错误。证据 `evidence/landing-final-review-375.jpg` 与 `evidence/landing-final-review-samples.json`。该结论仅针对本轮接触修复，不代表整片资产精度或听感通过。


## 2026-10-15：废车翻越接触与车辆细化

- 251–257 秒路径改为跨过横置车辆的低引擎盖；左掌在 251.9–252.65 秒固定于车体世界坐标，推离后收腿，256 秒落地，右手持续握管。镜头加入轻微侧倾，随后接回破窗追击。
- 废车新增圆角车身、倾斜前后玻璃、车柱/窗框、门缝/门把、轮毂与轮胎、保险杠、格栅、雨刷、座椅、方向盘、风挡裂纹；金属表面采用本地确定性做旧纹理。仍为自建程序化资产，不能视为扫描级汽车。
- 新增几何回归检查：固定掌心支点、持管手接触、收腿时脚部跨越引擎盖的高度、倒放/重播恢复。48 项测试、构建与 diff 格式检查通过，原有 GLTFLoader 大包体警告仍在。
- 主浏览器已看 252 秒撑车与 254 秒收腿静帧；独立自然片段复核结果另记。未对本轮声音做听感验收。

独立首轮 248–263 秒自然播放（实际暂停 264），另补 252 静帧：收腿/落地/接追击可读，发现左掌方向反转 P2。已改为掌心朝车盖、手背朝上，并新增掌面方向断言；低对比纹理锈斑替换原黑橙椭圆。

最终独立 251–256 自然播放，段内无暂停/seek，另补 252 静帧：确认手背、指甲与指节在上方，关闭掌向 P2，撑掌→收腿→落地连续，无新增明确 P1/P2。证据 `evidence/car-vault-final-252.jpg`、`car-vault-final-3.jpg`、`car-vault-final-6.jpg` 与 `car-vault-final-samples.json`。右手握点有时受底栏遮挡，精确握持有几何测试但不宣称全时段视觉确认；未听音。控制台无警告或错误。最后版本 48 项测试、构建和 diff 检查通过。


## 2026-10-15：便利店首次扑袭与膝顶

- 120–134 秒重新编排感染者距离、蹲姿、抓腕、横管抵胸、膝顶与退敌，接回 135/138 两次反击。修复 126 秒镜头进入面部、下蹲穿入地面的情况；膝顶接触腹部后敌人退开。
- 货架改绕后侧底边向后倒落；瓶子从货架脱离进入独立抛物轨迹，落地转为玻璃碎片，并支持反向跳转恢复原架与瓶子。几何测试覆盖底边贴地、脱离、碎片落地和回退。
- 首轮独立 116–140 自然播放及126/130静帧：抵挡→膝顶→退敌→反击可读，脸未穿镜头；发现抓腕袖口交叠、咬合远离手腕两项P2。倒架和碎瓶被近景人物/手臂遮挡，未获得充分第一视角视觉证据，此项仍待调整构图。证据 `evidence/store-ambush-review-samples.json`。
- 后续修正抓腕为接触前臂外侧，敌掌与袖筒不再同轴；127秒附近两次低头咬合时抬管偏挡，牙齿与左腕约9厘米间距，保持双手握管。测试覆盖脸部净空、脚部贴地、钢管/膝盖实际接触、咬合距离与倒放一致性。50项测试、构建和diff检查通过；独立最终片段结果另记，未听音。

最终独立 125–132 秒自然复验（段内无暂停/seek），另130静帧：抓腕位于袖口外侧，旧袖筒重叠/袖扣切掌已消失；约126.8秒可读到头前倾、管抬到口前挡咬，关闭这两项P2。接膝顶和131退敌无新增明确P1/P2。第二次127.8秒精确峰值未单独锁定，采样覆盖其邻域，不扩大为逐帧验证。证据 `evidence/store-ambush-final-4.jpg`、`store-ambush-final-130.jpg` 与 `store-ambush-final-samples.json`。控制台无警告或错误，未做听觉验收，倒架/碎瓶遮挡仍待处理。


## 2026-10-15：倒架与碎瓶构图

- 货架保持绕后侧底边向后倒落，移除遮住落瓶的侧向旋转；瓶子在 121.9–122.8 秒分批脱离，右半侧向架外抛出，落地碎裂。玻璃音效提前至 123.1 秒，镜头在 123.3–124.6 秒向侧下方短看，125.7 秒回到抵挡姿态。
- 架上瓶子改为空玻璃材质并保留旧瓶盖；统一由倒架模块控制架体，支持任意跳转及回退恢复。回归检查更新为实际瓶子摆放，50 项测试、构建、diff 检查通过。原有 GLTFLoader 包体警告保留。
- 主浏览器确认架体从侧边倒开、瓶子离架；最终自然片段的独立可读性复验另记，未做听觉验收。

独立最终 120–132 秒自然复验，约每 0.4–0.5 秒采样，并补 123/124 静帧：123 秒货架后倾与瓶子离架可见，随后落地出现碎片，126 秒回到挡咬、130 秒膝顶，关闭倒架/碎瓶遮挡 P2，无新增明确穿模。证据 `evidence/shelf-final-review-123.jpg`、`shelf-final-review-124.jpg`、`shelf-final-review-samples.json`。

另复看 233–240：窗口、车库与屋顶人影可读，236 秒卷帘门撞击远景变化仍弱。已将视线固定于门中心 235.4–237.5 秒；两次冲击快速顶起、较慢回落，底边开缝、门片弯折并掉落灰屑，略微提高门片亮度。新增导轨边缘、底部净空、回弹和回退检查。51 项测试、构建、diff 检查通过，独立最终卷帘门复验另记。

独立卷帘门最终 234–240 秒自然复验：235/237 秒两次中央外鼓、底边开口抬起与回弹可辨，固定视线下可以直接读成门后撞击，关闭远景撞击 P2。证据 `evidence/street-shutter-final-4.jpg`、`street-shutter-final-7.jpg` 与 `street-shutter-final-samples.json`。随后冻结源码开始最新版本 0–480 连续运行，结果待记录。


## 2026-10-15：按用户新要求改为总长 60 秒

- 用户明确“整体播放长度要60s，现在8分钟太长了”。页面改为唯一 60 秒版本，入口和进度显示同步；原动作时间仅作为内部素材坐标。
- 12 个镜头覆盖重逢、镜中感染者、挡咬、后门、坍塌、断臂、单臂逃生、出口、巨型感染者、坐下、终端告别与切黑。删减搜集、往返及重复搏斗，动作保留 1–1.4 倍速度。
- 字幕和音效按剪辑重排，略过切点处不足 0.45 秒的对白尾音，保留完整语音从头播放；全部保留对白的音频时长与新槽位比值不超过 1.2。没有重新调用付费服务。
- 54 项测试通过，覆盖60秒连续镜头、伤势持续/回退、章节定位、字幕语音槽位及仅触发保留音效；主浏览器确认入口“60 秒剧情”、总时长01:00和开场画面。证据 `evidence/story-60s-opening.jpg`。独立新版完整体验结果另记。
- 旧版最终长片复核按需求变更停止：实际自然运行0–352秒，截图到332秒，无控制台warning/error，未验证旧版结尾；该记录不计入60秒版验收。

独立60秒最终复核：0–60自然播放，段内无暂停、跳转或HMR，结束固定01:00/01:00；补51–60自然片段确认终端落在石面、追兵靠近、56秒切黑和60秒结尾。场景切换与断臂持续状态正确，未发现新的明确P1/P2。重播回0、暂停02保持、继续到05、章节5跳24、静音UI和返回向日葵漫游通过；控制台无warning/error。证据 `evidence/story-60s-review-samples.json`、`story-60s-review-01-00.jpg`。自然采样22–28和52–60有间隔，后者已补短段；未做逐帧或听觉验收。

## 2026-10-15 — First imported character pass

Delivered locally: DJMaesen's skinned first-person arms with 2K source maps; Rosswet Mobile's Thin Zombie, converted and subdivided once, on the nine narrative enemy rigs; authored hollow/corroded pipe detail. See `ASSET-LICENSES.md` and the bundled character credits. Existing contact drivers and the 60-second editorial timeline remain authoritative. No purchase, cloud API, push or deployment.

Verification: 55 tests pass and production build passes (existing large GLTFLoader chunk warning remains). The new test parses the delivered skin/geometry buffers, verifies finite skinned positions, deterministic rewind, wrist/contact alignment, injury visibility and giant nonuniform scaling. Texture decoding is deliberately excluded from this Node test and verified in the browser instead.

Independent reviewer naturally played 0→60 and checked 12-second grip, 25-second injury, replay recovery and exit. Review found P2 sharp triangular remnants on the old injured sleeve. Fixed with a closed cloth sleeve/cap and removal of the overlapping old wound shell after amputation. Independent 24/25/27-second follow-up closes this P2; 37→43-second replay found no new obvious giant mesh collapse. Browser warning/error logs were empty. No listening acceptance and no claim of frame-by-frame inspection.

Evidence: `evidence/character-assets-review-samples.json`, `evidence/character-assets-review-fixed-samples.json`, `evidence/character-assets-review-fixed-preview-12.jpg`.

Quality boundary: this is the first imported-model pass, not AAA asset parity. The zombie retains a 1K, older painted diffuse map with baked highlights and limited face articulation. Mirror-body and distant crowd are still procedural. The selected 60-second pacing is preserved.

## 2026-10-15 — Mirror protagonist and crowd asset pass

- Replaced the procedural reflection body with codersan's CC BY 4.0 survivor (10K triangles, embedded 2K diffuse map and humanoid skin). The face, hair, clothing and boots come from the authored model. Body and limb bones follow the existing cinematic drivers.
- Replaced 56 procedural distant figures with the low-detail Rosswet Mobile zombie mesh (3,340 triangles). Twenty-four poses are baked locally at asset load, then instanced with deterministic phase, height, width and color variation. Existing shop/street/metro/plaza positions and all 60-second cut points are unchanged.
- Reduced baked highlight brightness on infected skin and introduced restrained color variation. This mitigates the old diffuse-map highlights; it does not recreate scanned skin or a full PBR texture set.
- First independent 0–60 play passed completion, replay and exit, with no console warnings/errors. It found P2 at 8–10: reflected bare fingers rested above the pipe and the other hand did not match the first-person pose. Fixed by excluding the source hand triangles, adding the same articulated FPS gloves, and copying wrist world positions, palm orientation and finger grip values from the first-person drivers. Reflected wrists no longer inherit the body IK reach clamp. Follow-up visual verdict below.
- 56 tests and production build pass. Tests parse delivered GLBs and cover finite skinned positions, imported reflection/glove presence, 24 grounded crowd poses, 56 instance count, deterministic rewind and the existing injury state. Existing 672 KB loader chunk warning remains. No purchase, remote runtime dependency, push or deployment.
- First-pass evidence: `evidence/character-upgrade-review-samples.json`, `character-upgrade-review-mirror.jpg`, `character-upgrade-review-crowd.jpg`. Natural sampling had a 26–37-second gap; injury checked at 24/26 and crowd additionally at 39–41. Distant crowd silhouettes are visible, but this is not per-instance foot-contact or listening acceptance.

Quality boundary: mirror and crowd now use licensed skinned assets. The older zombie diffuse map and limited facial articulation still fall short of AAA character art; the distant instances reuse one base mesh, with variation rather than distinct authored identities.

Final independent follow-up: natural 7–12-second play plus 8/9/10/12/25 static checks closes the mirror-grip P2. Curled glove fingers now read as gripping the pipe, rather than the former open bare palm. No new visible combat or injury-cap regression; console warning/error logs empty. Preview retained at 9 seconds. Evidence: `evidence/character-upgrade-final-mirror.jpg`, `character-upgrade-final-samples.json`. This is local contact acceptance, not precise per-finger collision or AAA/listening acceptance.


## 2026-10-15 — Full continuous 60-second route and close-contact repair

This section supersedes the earlier 12-cut edit. User explicitly chose to retain the complete original story, including collapse, amputation, metro escape and farewell.

- Replaced spatial cuts with a monotone source-time remap covering 0–480 in exactly 60 playback seconds. Travel is weighted by path distance and viewing-angle change. Equipment, leaving the room, collecting supplies, mirror reveal, fighting, chase, collapse, injury, metro and finale all remain. Shortened dialogue reuses eight existing voice lines; no paid generation. Tests densely check path continuity, endpoints, injury state, cue mapping and voice slots.
- Terminal contacts are checked against the actual imported FPS skin from source 18.5–33, rather than only proxy wrists. Water, candy and shelf item heights/contact poses were corrected. Pursuers are spaced apart in the warehouse, recoil clears the cold cabinet, animation cycles use playback time, and imported feet use skinned sole positions after world-transform updates.
- Replaced the close infected mesh with LokitoBlu's CC BY 4.0 Zombie (Male 1): approximately 23.9K triangles, authored 2K color/normal textures. Locally authored a 19-bone rig and smooth weights, corrected transparent-material sorting with alpha testing, and added independent left/right finger-curl pose shapes. Palm normals and hand scale now follow the contact rig. The older mesh remains the instanced distant crowd.
- Replaced the FPS asset's open shoulder/torso flaps with closed, wrinkled cloth upper sleeves. The original forearm/glove skin and UVs remain. Reduced the oversized injured sleeve overlay and moved the bandaging pose clear of the camera. Extended the visible lever action before the second collapse.

Independent review ran naturally 0→60 on the continuous-route/new-character version, reached 01:00/01:00 and returned to the Sunflowers room. Supplementary natural sections covered combat/warehouse, lever/amputation and the ending. It found the shoulder cap and open infected fingers; those were subsequently fixed. Final independent natural recheck covered 12–14.45, 26–28.75 and 37–41.65, plus backward seeks to collecting water and gripping. Both remaining P2 findings were closed in that scope, with no new obvious clipping or residual deformation. Browser console warnings/errors were empty. The final small hand/sleeve change was verified in those sections, not another uninterrupted full run. This is sampled visual acceptance, not every frame or listening acceptance.

Evidence: `evidence/asset-fix-review-notes.json`, `asset-fix-review-samples.json`, `hand-sleeve-final-grip-13.10.jpg`, `hand-sleeve-final-bandage-26.75.jpg`, `hand-sleeve-final-samples.json`.

Final verification: 58 tests pass, production build passes, diff whitespace check passes. Tests include actual delivered skin positions, terminal penetration, floor contact across world moves, independent grip/release, rewinds and injury visibility. Existing 672 KB loader chunk warning remains. Source GLBs load locally; no asset purchase, paid API, deployment, push or unrelated repository edits. Asset accuracy is improved but this remains a browser demo, with limited facial articulation and reused crowd geometry rather than AAA parity.

## 2026-10-15 — Deliberate 60-second edit with collapse and metro retained

This edit supersedes the complete-story fast-forward above. The user approved cutting secondary scenes while retaining road collapse, loss of the left forearm, and subway escape.

- Removed the shop, looting, mirror fight, repeated street obstacles, repeated exit impacts, giant reveal and smoking from playback. Source action modules remain available; the runtime selects retained actions through explicit editorial slots.
- Staged a copy of the dwelling in the adjacent street lot for cinematic playback only. Original free-roam dwelling and lot visibility restore on exit. The camera follows a new continuous, shorter physical route, ending at the subway stair head.
- Screen-time allocation: room 0–5, street observation 5–12, chase/collapse 12–18, awakening 18–23, levering/second collapse 23–32, injury reaction/dressing 32–39, one dodge/door/stair escape 39–52, farewell 52–60. Camera rests during levering and farewell; footsteps, crowd cycles and restrained head bob use playback time.
- Seven existing local voice clips fit at normal playback speed. Sound cues are explicitly positioned in the new edit. First collapse, second collapse and final blackout have separate visual envelopes. No deleted-scene explosion or lighter cue remains.
- 58 tests pass and production build passes. Revised edit tests cover continuous camera motion at 120 samples/second, exact duration, retained/cut scenes, rests, rewind/injury state and normal-speed voice slots. Existing 672 KB loader chunk warning remains.
- Main-agent browser checks show the new room/street, visible street infected, lever contact, injured arm, closed maintenance door, unobstructed stairs and hand-held terminal farewell. Independent natural playback review follows below. These checks do not constitute listening or frame-by-frame acceptance.

Independent reviewer completed a natural 0→60 run, with supplementary natural 30→52.5 coverage for a sampling gap. The reveal at 11 seconds, crowbar/lever at 24–27, injury and 47–52 stair route were readable. It found one P2 at 45.7: pursuing fingers passed through the closed door. The compact edit now targets the outside door face and withdraws hands earlier. Final local follow-up is pending below. Evidence: `evidence/pace-final-samples.json`, `pace-door-45.70.jpg`, `pace-review-delivery-farewell.jpg`. No listening acceptance.

Concurrent workspace note: an unrelated seaside route/test appeared during this review. The subsequent build passes, with a shared 627 KB chunk warning; a full test run reports 59/60 passing, with only `seaside-motion.test.js` failing strict equality on -0.7999999999999998 versus -0.8. All 58 pre-existing/story tests still pass. No seaside source or tests were edited for this task.

Final correction verification: the independent follow-up could not reconnect to the browser, so it did not close the door P2. The main agent recovered the existing tab, paused and inspected exactly 45.70 seconds: no pursuing hand protrudes through the panel; the protagonist's glove remains on the inside handle. Saved `evidence/pace-door-fixed-45.70.png`. Exiting restored the original Sunflowers room and free-roam controls. This final change has a main-agent static visual check, not an independent motion recheck. Full natural playback evidence remains the pre-correction reviewer run.


## 2026-10-15 — Screenshot defects, impact threat and urgent escape

User identified real gaps in prior sampled acceptance: greenery in the cinematic doorway, unnatural hand poses, waking inside the beam, a front-wall shortcut, passive pursuers, excessive station brightness and weightless stairs.

- Reserved the staged dwelling/door approach from ground/ivy cards and removed the obsolete lot's vine generation. Free-roam house remains at its original location.
- Lowered relaxed hands during walking, added bent-finger running poses, reduced imported forearm/finger scale, and retained the licensed DJMaesen skin. A trial preserving source finger local chains produced a bad terminal grip and was discarded before this delivery. Contact-driven finger posing remains authoritative.
- Replaced the white cylindrical stump/bandage overlay with a closed irregular injured arm: torn cuff, uneven blood-colored tissue and wet staining. Removed compact-mode dressing, wraps and cloth cues; lifted the reaction pose into view.
- Added a giant descending before collapse, using the existing detailed infected skin with an enlarged asymmetric crusted silhouette. It lands before the road falls, with impact sound/shake, then sinks with the collapse. This is a locally adapted monster, not a new downloaded or purchased creature asset.
- Moved the waking eye above/outside the pinned beam. The maintenance approach now passes west of the front wall and crosses the real west door opening at z123; the inner stair door is already open. Added tests against these active-edit collision boundaries and physical stair treads.
- Station fog is dark instead of luminous gray; environment fill is reduced, only intermittent local fixtures and a chest lamp illuminate the route. Running poses include opposing arm/leg strides, torso lean and body rise; the crowd atlas has a wider running stride. Ending pursuers approach continuously from beyond the exit view instead of appearing stationary nearby.
- Stair motion adds footfall-frequency vertical/lateral movement, limited roll, wider running FOV and weapon/hand inertia. Sixty-second duration and original-speed dialogue remain.

61 tests and production build pass; existing large shared loader warning remains. Browser checks before final lighting adjustments verified clear doorway, giant descent and camera outside the waking beam. Independent final dynamic acceptance follows below. No listening acceptance or claim of AAA asset parity.

Independent reviewer completed natural 0–60 playback on the stable local preview, then sampled giant impact, waking, the maintenance approach and stairs. The waking eye clears the beam; 42–44 seconds rounds the front wall and uses the actual doorway; no pursuing hand crosses the closed panel at 45.8; stairs clear the route at 47.95–50.8. Console warnings/errors were empty. The giant body remains close during the fall but no definite intersection was established from those samples.

The reviewer found a P2 at 32–35 seconds: the injured arm was unreadable in the dark. Added limited camera-local fill, turned the cut end toward the viewer, and kept the sleeve away from the near plane. Final independent natural 32–38 playback closes that finding: blood, torn cuff and right-hand contact are visible, with no giant sleeve or new clipping in those samples. The sleeve remains somewhat cylindrical; this pass does not claim sculpted AAA character quality. Evidence: `evidence/threat-review-samples.json`, `threat-final-injury-0.jpg`, `threat-final-injury-2.jpg`, `threat-final-injury-3.jpg`, `threat-final-injury-5.jpg`.

After the final pose/light adjustment: all 61 tests pass, production build passes, and diff whitespace check passes. No listening acceptance. Changes remain local.

Final independent supplementary natural segments covered 0–12.15, 32–38 and 49–60 seconds, without seeks or pauses within each segment. The opening doorway is clear, walking hands no longer remain raised flat, and all five ending pursuers are already distant at 50.75 and approach progressively at 52.6/54.4/56.1/57.75 with changing leg poses. No stationary pop-in or new definite P1/P2 was found in that scope. Playback stops at 01:00, return to free roam works, and console warnings/errors are empty. Evidence: `evidence/threat-final-review-samples.json`, `threat-final-opening-6.jpg`, `threat-final-opening-7.jpg`, `threat-final-ending-3.jpg`, `threat-final-ending-6.jpg`, `threat-final-ending-9.jpg`, `threat-final-ending-12.jpg`, `threat-final-ending-15.jpg`; exact paused impact view `threat-final-giant-14.70.jpg`. Stable preview: http://127.0.0.1:4318/apocalypse. These are sampled visual checks, not every-frame or audio-listening acceptance.
