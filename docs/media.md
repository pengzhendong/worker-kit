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

## 列表工具栏与卡片

图片组直接使用 Ant Design 原生 `Image.PreviewGroup`，无需新增 WorkerKit 轮播组件。`items` 可声明当前页原图地址，不预先挂载所有大图：

```tsx
import { Image } from 'antd';

<Image.PreviewGroup items={images.map(image => ({ src: image.url, alt: image.title }))}>
  <ImageViewer src={selected.url} poster={selected.thumbnail} title={selected.title} />
</Image.PreviewGroup>
```

原生图片组处理上一张/下一张、缩放、旋转与关闭；应用负责资源范围和下载。详情播放器已经直接使用 Video.js 的 `NeutralAudioSkin` / `NeutralVideoSkin`，继续复用官方皮肤与控件；列表的紧凑排版是公开组件组合，不维护自己的播放状态机。后续选型遵守[开源优先约定](open-source-policy.md)。

`AdminShell compactContent` 为资源浏览器采用 16 px 内容边距；`PageToolbar`（普通 web 入口）统一标题、数量与常规 32 px 操作控件，工具栏到列表为 16 px。不要在应用里另叠标题行 margin。

```tsx
import { PageToolbar } from '@pengzhendong/worker-kit/web';
import { MediaCard, MediaGrid } from '@pengzhendong/worker-kit/web/media';

<PageToolbar title="全部分类" meta={`${items.length} 项`} actions={searchInput} />
<MediaGrid>{items.map(item => <MediaCard key={item.id} title={item.title}
  preview={renderPreview(item)} description={item.author} extra={formatSize(item.bytes)}
  onOpen={() => openDetails(item)} action={downloadButton(item)} />)}</MediaGrid>
```

网格间距和卡片内边距为 16 px；标题最多两行，不额外预留空白行，同一行卡片的作者与操作区沿底部对齐。卡片直接使用 Ant Design Card；媒体来源、分类、下载和弹窗内容由应用负责。`loading` 使用共享骨架正文，`preview` 可传应用自己的占位封面。

## 无登录的资源浏览器

`AdminShell` 可省略 `username`，此时不显示账户菜单；`sidebarFooter` 可展示应用自己的资源数量等信息。这不会添加、关闭或替代任何服务端认证。业务是否公开仍由服务端决定。

## 开源依赖

- [Ant Design Image](https://ant.design/components/image/)：MIT，沿用现有 UI 依赖。
- [WaveSurfer](https://wavesurfer.xyz/)：BSD-3-Clause，交互波形。
- [Video.js 10](https://videojs.org/docs/guides/installation/react)：Apache-2.0，音视频控制与可访问交互。

播放器不包含 Mux Data、外部统计、广告或第三方播放器 CDN；这些扩展不在本次依赖和装配中。

## 紧凑混合媒体列表

素材检索和批量浏览优先使用 `MediaList`、`MediaRow`。每行高 64 px，桌面缩略图 56×40 px，名称/作者、行内预览、大小和下载操作在同一行；手机缩略图为 40×40 px，大小合并到副信息，保留播放和下载，进度定位在详情中完成。图片、音频、视频和普通文件保持相同高度，没有类型角标与独立卡片脚注。

```tsx
<MediaList>{items.map(item => <MediaRow key={item.id} kind={item.kind}
  src={item.url} poster={item.poster} title={item.title} description={item.author}
  duration={item.duration} extra={formatSize(item.bytes)}
  onOpen={() => openDetails(item)} action={downloadButton(item)} />)}</MediaList>
```

音视频仍使用 Video.js 的原生播放、定位、时长组件，`preload=none`，不为填充时长主动下载媒体，也不加载波形。播放视频时缩略图显示实际画面；打开完整预览由应用的 `onOpen` 负责。播放失败与重试占用原来的控件位置，避免行高跳动。`loading` 使用相同行高的骨架。详情使用 `ImageViewer` 或默认完整 `MediaPlayer`。

设计参考 [PhotoPrism 的 List View](https://docs.photoprism.app/user-guide/search/views/) 和 [Navidrome SongList](https://github.com/navidrome/navidrome/blob/master/ui/src/song/SongList.jsx)：借鉴缩略图、信息列、行内操作和响应式信息取舍，未引入它们的应用运行时或复制业务代码。

## 按窗口高度分页

`useAutoPageSize` 从普通 web 入口导出。把 `listRef` 交给持续挂载的 `MediaList`，把 `paginationRef` 交给分页外层；测量完成前 `pageSize` 为 `null`，此时不请求列表。它扣除列表顶部已占空间、边框、分页实际高度和外边距、内容底部 padding，以共享 64 px 行高计算整行数量。窗口缩放、工具栏换行和分页换行通过 ResizeObserver 更新，120 ms 合并连续变化，滚动不会改变容量。

```tsx
const { pageSize, listRef, paginationRef } = useAutoPageSize({ max: 48 });
// 业务按 pageSize 请求数据，并取消上一次请求。
<MediaList ref={listRef}>{rows}</MediaList>
<div ref={paginationRef}><Pagination pageSize={pageSize || 1} showSizeChanger={false} /></div>
```

`rowHeight` 可适配其他等高列表；`min` 默认 1，`max` 默认 100，由业务按后端限制设置。极矮窗口至少显示一行并允许内容滚动。页码与数据查询由消费项目负责；剪映保留首条资源的索引，容量改变后定位到包含该资源的页面。

## 观影交互

需要固定观影控制栏的应用可选用 `@pengzhendong/worker-kit/web/video-player` 的 `VideoPlayer`，并导入 `@pengzhendong/worker-kit/web/video-player/styles.css`。它与资源试听共用 Video.js 10，不另安装播放器引擎。播放、音量、进度、原生全屏、画中画、菜单和键盘使用上游公开组件；只为网页全屏、点击显隐、触摸滑动十秒、长按临时 2 倍速及截图/画面比例补充适配。

```tsx
import { VideoPlayer } from '@pengzhendong/worker-kit/web/video-player';
import '@pengzhendong/worker-kit/web/video-player/styles.css';

<VideoPlayer src={url} title="影片" poster={poster} sourceKey={episodeId} preload="none">
  {businessOverlay}
</VideoPlayer>
```

`videoRef` 取得原生 HTMLVideoElement；使用原生事件处理选集、续播和统计。`playerRef.current.prepareSourceChange()` 在读取当前倍速及修改来源前调用，先结束临时倍速和手势。保持组件挂载、变更 `src`，可保留同一个视频元素与全屏；倍速需要应用在修改来源前保存，并在 canplay/loadedmetadata 后恢复。不要给组件设置随集数变化的 React key。

也可以不传 `src`，由消费应用通过 `videoRef` 将自己的 hls.js 实例 attach 到原生 video；引擎加载、参数、线路回退及销毁属于应用。`live` 隐藏点播定位和倍速，不从网络推断直播状态。`message`、`loading` 用于应用的解析提示，`allowScreenshot={false}` 禁止不满足跨域画布要求的来源截图。`children` 放置业务覆盖层，在元素全屏和网页全屏中保留。

控制栏默认随活动显示；点击画面固定显隐，键盘仍可进入控件。全屏右半侧按住 450ms 临时 2×，松开、取消、移动超过阈值、失焦、暂停、切源或卸载恢复；左右触屏滑动定位十秒，直播不滑动定位。Esc 退出网页全屏并恢复页面滚动。网页全屏保留 DOM 归属，未把播放器移动到 body；不要把组件放进带 transform/contain 的裁剪祖先。

观影 UI 继承 WorkerKit 的字体、字号和主色 CSS token，也可通过 `style` 的 `--wk-video-accent` 显式设定应用强调色。非全屏画面允许纵向滚动页面，横向滑动仍用于定位；进入全屏后关闭画面上的浏览器原生平移。
