# 图片、音频与视频

`@pengzhendong/worker-kit/web/media` 是可选入口，不从普通 `web` 或任一服务端入口导出播放器。消费应用显式安装 `@videojs/react@10.2.0`、`wavesurfer.js@8.0.3`，以及前端原本使用的 React、Ant Design。视频控制使用 Video.js 10，音频共用其控制栏，波形使用 WaveSurfer；图片沿用 Ant Design Image 的缩放、旋转与键盘操作。

```tsx
import { ImageViewer, MediaPlayer } from '@pengzhendong/worker-kit/web/media';
import '@pengzhendong/worker-kit/web/media/styles.css';

<ImageViewer src="/files/original.jpg" poster="/files/thumbnail.jpg" title="封面" />
<MediaPlayer kind="video" src="/files/demo.mp4" poster="/files/poster.jpg" title="演示" />
<MediaPlayer kind="audio" src="/files/music.mp3" title="列表试听" duration={190} compact />
<MediaPlayer kind="audio" src="/files/music.mp3" title="音乐" bytes={3_000_000} duration={190} waveform />
```

播放器和 WaveSurfer 分别延迟加载。音视频使用 `preload="none"`，不自动播放；`waveform` 默认关闭，适合卡片列表。详情开启后仍需点击“加载波形”。浏览器生成仅开放给已知大小不超过 32 MiB、已知时长不超过 10 分钟的音频。未知或更大的文件保留普通播放；业务可预先生成 peaks。

```tsx
// 长音频可以传预计算通道和真实秒数；生成过程属于应用。
<MediaPlayer kind="audio" src={url} title="录音" peaks={[amplitudes]} duration={3600} waveform />
// 或者按需请求应用自己的端点，不需要浏览器跨域读取整段媒体。
<MediaPlayer kind="audio" src={url} title="音乐" waveformUrl="/api/waveform/music/123" waveform />
```

`waveformUrl` 返回 `{ peaks: number[][], duration: number }`；最多 8 个通道，每通道最多 10,000 个有限数字，时长为正的有限秒数。请求随组件销毁取消。失败只影响波形，保留播放和重试入口。WaveSurfer 读取原始音频需要完整的 CORS 支持，HTTP 重定向的中间响应也必须满足浏览器规则。预计算 peaks 可避免该额外读取。

只有 WorkerKit 创建的播放器参与互斥播放，不会扫描并暂停页面上的其他媒体。销毁时停止播放、释放波形及取消请求；应用隐藏页签时应使用 `destroyOnHidden` 或卸载页面，不能只用 CSS 隐藏仍在播放的元素。React StrictMode 的 effect 重放也会恢复媒体源。

当前默认适配浏览器原生可解码的图片和文件音视频（如 MP3、AAC、WAV、MP4、WebM）。服务端需正确提供 Content-Type 和 Range；组件不会转码、解密 SDK 素材包或自动将 HLS/DASH 当成 MP4。Video.js 可通过它的独立 adapter 扩展流媒体；业务确实需要时再显式接入。

示例位于“组件与交互 → 媒体预览”，音频与视频为本仓库生成的测试素材，图片为自绘 SVG，均不请求第三方演示 CDN。E2E 检查真实播放时间、互斥播放、定位、波形、按需请求、错误恢复与三种视口主题截图。

音频卡片设置 `compact`，使用 Video.js 的公开 PlayButton、TimeSlider、Time 组件，仅显示播放、定位和时间，不放快进、快退、音量与倍速。已知 `duration` 在播放前直接显示；未知时长显示“—”，不为读时长预取媒体。开始播放后显示实际进度与媒体时长。详情保留默认完整控制栏，可另开 `waveform`。

## 无登录的资源浏览器

`AdminShell` 可省略 `username`，此时不显示账户菜单；`sidebarFooter` 可展示应用自己的资源数量等信息。这不会添加、关闭或替代任何服务端认证。业务是否公开仍由服务端决定。

## 开源依赖

- [Ant Design Image](https://ant.design/components/image/)：MIT，沿用现有 UI 依赖。
- [WaveSurfer](https://wavesurfer.xyz/)：BSD-3-Clause，交互波形。
- [Video.js 10](https://videojs.org/docs/guides/installation/react)：Apache-2.0，音视频控制与可访问交互。

播放器不包含 Mux Data、外部统计、广告或第三方播放器 CDN；这些扩展不在本次依赖和装配中。
