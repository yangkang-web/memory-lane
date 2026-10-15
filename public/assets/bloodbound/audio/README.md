# Bloodbound 声音

当前已有 **7 句正式对白、4 条音色候选、1 条环境循环与 9 条动作音效**，全部约 1.24 MB。对白通过公司 Kaon 的 `elevenlabs/eleven_v4` 真实生成，11 次请求全部 HTTP 200，没有重试；正式对白合计 15.935 秒，镜头仍需保留动作与停顿。

## 台词与选角

以主 Agent 在 2026-10-15 从登录后的在线场景文档核对的七句为准。Downloads 中的 PDF 是旧版 30 秒稿，缺少 `I can hear it. Every drop.` 和 `Not even me.`，不作为本次台词全集。

Lucien 使用 Charlie（年轻、低沉），Eric 为备选；Hunter 使用 Harry，Adam 为备选。四个音色都已生成同角色同一句内容用于对比。这是根据官方公开音色元数据与技术检查的选角，尚未完成主观听感判断。当前评审模型无法接收音频感知输入，不能把波形、时长或播放成功写成“实际听过”。

| 台词 ID | 实测时长 |
|---|---:|
| hunter-warning | 1.802 秒 |
| lucien-warning | 2.847 秒 |
| bleeding | 1.646 秒 |
| every-drop | 2.691 秒 |
| lose-control | 2.769 秒 |
| protect | 2.691 秒 |
| not-me | 1.489 秒 |

## 真实权限状态

2026-10-15，图片专用 Key 的最小语音请求返回 HTTP 403。之后用户明确授权新增限定语音 Key，由主 Agent 创建；本次音频使用该专用 Key，没有修改原图片 Key，没有调用公司 Kaon 之外的付费服务。

本次成功请求共 449 个输入字符（含情绪标签）。Kaon Usage 页面按专用 Key 筛选显示 11 条请求，每条 $0.0001，显示金额合计 $0.0011。界面每条只显示四位小数，不能据此声称更精确的上游账单；API 响应没有 cost header。账单核对记录在 `usage.json`，私有请求 ID/状态记录位于 `.local/bloodbound-voice/requests.jsonl`，不含凭据值。

Kaon V4 调用契约已从当前模型详情核对：`POST https://kaon-router.kaonai.com/v1/audio/speech`，返回音频字节；真实 Voice ID 放在 `voice`；参数位于 `provider_options.elevenlabs`。V4 不发送 `speed` 或 `style`。Key 只从本地私有文件读取，不入源码、请求记录或输出。

## 接入

- 入口：`/assets/bloodbound/audio/manifest.json`。其中 `file` 是相对本目录的路径。
- 语音：`lines` 含七句原文、中文、角色、阶段、阶段内建议偏移；`duration` 是实测 MP3 时长。字幕 cue 按阶段定位，礼物阶段在玩家接过项链之后才开始。运行时仍需按实际音长扩展镜头，不要硬截台词。对白已统一至 -20 LUFS 目标，建议播放增益 1，再按实机场景听感调节。
- 环境：`chapel-air.mp3`，24 秒，建议音量 0.4；对白时降到原音量的 0.45；循环边界用约 1.8 秒交叉淡化。停止/隐藏页面时暂停。
- 事件：`effects` 中 `gain` 为保守初值。撞柱与对白错开；心跳只在亲密段播放，凝晶响只触发一次。与旧 WebAudio 音效替换接入，避免同一事件叠加。
- 恢复/重播应清理正在播放的 Audio/AudioBufferSourceNode，不能从当前剧情点重复叠播旧音效。
- 初次开始必须由用户点击解锁音频；无语音文件或解码失败时字幕仍应可用。

## 来源

脚步、金属、碎石和衣料来自 [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) 与 [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio)，两者官方页面及包内 License.txt 均注明 CC0。原许可证保留在 `licenses/`；逐文件来源在 `effects-manifest.json`。

风声、低音、风切、心跳和凝晶谐波是本项目的轻量原创程序合成，没有 AI 推理。脚本为 `scripts/bloodbound-voice-effects.py`。音效经过音高、分层、延迟混响和降峰处理；不是未经处理的录音，也不宣称现场录制。

所有现有 MP3 已用 FFmpeg 7.1 完整解码，时长、峰值、削波采样数与 SHA-256 保存在 `effects-manifest.json` / `voice-quality.json`。21 条音频削波数均为 0。七句正式对白经过两遍 EBU R128 处理，实测 -20.40 至 -20.72 LUFS，峰值最高 -2.466 dBFS，未改变原对白的语速与停顿。原始响应备份于私有目录，可无损回退母版。

额外使用官方 whisper.cpp v1.9.5 + tiny.en 对七句音频做本地单线程自动转写：不提供台词 prompt，关闭 GPU；将七句加间隔后的 22.6 秒音频一次转写，忽略大小写与标点后全部词语一致，没有识别出被读出的情绪标签。证据在 `asr-verification.json`。浏览器候选播放器实测 currentTime 递增、paused=false、无 media error；完整场景 audioReady=true，WebAudio 真实创建音源并推进渲染时钟。

这些检查证明文件可播放、非静音、响度接近，并提供实际台词的自动核对，**不证明情绪、角色适配或混音已经通过人工听审**。当前工具不能感知音频，主观听感仍待真实听审。

## 重新生成

Python 使用 Codex bundled runtime；`imageio-ffmpeg`、`mutagen` 安装于 `.local/bloodbound-voice/deps`，`numpy` 使用 bundled runtime。依赖来自 PyPI。命令不包含密钥值。

```sh
python scripts/bloodbound-voice.py prepare
python scripts/bloodbound-voice.py candidates --key-file /absolute/path/to/existing-authorized-tts-key
python scripts/bloodbound-voice.py lines --key-file /absolute/path/to/existing-authorized-tts-key --lucien charlie --hunter harry
python scripts/bloodbound-voice-master.py
python scripts/bloodbound-voice-effects.py
```

语音脚本会跳过已有文件，不在重跑时重复消费额度。更换音色前应把旧文件移入私有备份目录，避免旧音色被误认为新音色。
