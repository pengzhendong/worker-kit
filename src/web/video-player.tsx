import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentProps, ReactNode, Ref } from 'react';
import { BufferingIndicator, Container, Controls, FullscreenButton, Hotkey, Menu, MuteButton, PiPButton, PlayButton, Time, TimeSlider, VolumeSlider } from '@videojs/react';
import { Video, VideoPlayer as Player, usePlayer } from '@videojs/react/video';
import { I18nProvider } from '@videojs/react/i18n';
import { CameraOutlined, CheckOutlined, ExpandOutlined, FullscreenExitOutlined, FullscreenOutlined, MutedOutlined, PauseOutlined, PictureOutlined, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';
import { bindVideoInteractions } from './video-interactions';
import { claimPlayback, releasePlayback } from './media-session';

export interface VideoPlayerProps extends Omit<ComponentProps<typeof Video>, 'ref' | 'children' | 'title'> {
  title?: string;
  live?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
  playerRef?: Ref<VideoPlayerHandle>;
  children?: ReactNode;
  message?: string;
  loading?: boolean;
  allowScreenshot?: boolean;
  /** Application chooses the source/episode; this only cancels in-progress gestures before a switch. */
  sourceKey?: string | number;
  playbackRates?: readonly number[];
}
export interface VideoPlayerHandle { prepareSourceChange: () => void; }
const rates = [.5, .75, 1, 1.25, 1.5, 2, 2.5, 3];

/** Native Video.js media and controls, with opt-in viewing interactions. No source resolvers or storage. */
export function VideoPlayer(props: VideoPlayerProps) {
  return <I18nProvider locale="zh-CN"><Player title={props.title} poster={props.poster}>
    <ViewingPlayer {...props} />
  </Player></I18nProvider>;
}

function ChoiceMenu({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  return <Menu.Root side="top" align="end" boundary="container">
    <Menu.Trigger className="wk-view-button" aria-label={label}>{options.find(item => item.value === value)?.label || value}</Menu.Trigger>
    <Menu.Popup className="wk-view-menu" data-player-control><Menu.Content>
      <Menu.RadioGroup aria-label={label} value={value} onValueChange={onChange}>
        {options.map(option => <Menu.RadioItem className="wk-view-menu-item" value={option.value} key={option.value}>
          {option.label}<Menu.ItemIndicator checked={value === option.value}><CheckOutlined /></Menu.ItemIndicator>
        </Menu.RadioItem>)}
      </Menu.RadioGroup>
    </Menu.Content></Menu.Popup>
  </Menu.Root>;
}

function ViewingPlayer({ title, live = false, videoRef, playerRef, children, message, loading, allowScreenshot = true, style,
  sourceKey, playbackRates = rates, className = '', onPlay, ...mediaProps }: VideoPlayerProps) {
  const store = usePlayer();
  const rate = usePlayer(state => state.playbackRate);
  const nativeFullscreen = usePlayer(state => state.isFullscreen);
  const error = usePlayer(state => state.error);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [webFullscreen, setWebFullscreen] = useState(false);
  const [manualControls, setManualControls] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [aspect, setAspect] = useState('auto');
  const container = useRef<HTMLDivElement>(null);
  const interactions = useRef<ReturnType<typeof bindVideoInteractions> | null>(null);
  useImperativeHandle(playerRef, () => ({ prepareSourceChange() {
    interactions.current?.cancel(); setManualControls(null); setNotice('');
  } }), []);
  const receiveVideo = useCallback((element: HTMLVideoElement | null) => {
    setVideo(element);
    if (typeof videoRef === 'function') videoRef(element);
    else if (videoRef) videoRef.current = element;
  }, [videoRef]);
  useEffect(() => {
    if (!video || !container.current) return;
    const binding = bindVideoInteractions(video, {
      fullscreen: () => Boolean(document.fullscreenElement?.contains(video) || container.current?.dataset.webFullscreen === 'true'),
      live: () => Boolean(container.current?.dataset.live === 'true'), notice: setNotice,
    });
    interactions.current = binding;
    return () => { binding.dispose(); interactions.current = null; };
  }, [video]);
  useEffect(() => { interactions.current?.cancel(); setManualControls(null); setNotice(''); }, [sourceKey]);
  useEffect(() => { interactions.current?.cancel(); }, [webFullscreen, nativeFullscreen]);
  useEffect(() => {
    if (manualControls !== true) return;
    return store.requestControlsLock();
  }, [manualControls, store]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 2400); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!webFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setWebFullscreen(false); };
    document.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape); };
  }, [webFullscreen]);
  useEffect(() => () => { if (video) { video.pause(); video.removeAttribute('src'); video.load(); releasePlayback(video); } }, [video]);
  const screenshot = () => {
    if (!video?.videoWidth) return setNotice('画面尚未就绪');
    try {
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      const link = document.createElement('a'); link.download = 'video-screenshot.png'; link.href = canvas.toDataURL('image/png'); link.click();
    } catch { setNotice('当前来源不允许截图'); }
  };
  return <Container ref={container} className={`wk-view-player ${className}`} style={style} data-workerkit-video-player
    data-web-fullscreen={webFullscreen} data-live={live} data-manual-controls={manualControls === null ? 'auto' : String(manualControls)}
    aria-label={title ? `${title}播放器` : '视频播放器'}
    onClick={event => {
      if ((event.target as Element).closest('[data-player-control]') || interactions.current?.suppressClick()) return;
      container.current?.focus({ preventScroll: true });
      setManualControls(previous => !(previous ?? store.state.controlsVisible));
    }}>
    <Video {...mediaProps} ref={receiveVideo} className="wk-view-media" playsInline
      style={aspect === 'auto' ? undefined : { aspectRatio: aspect, width: 'auto', objectFit: 'fill' }}
      onPlay={event => { claimPlayback(event.currentTarget); setNotice(''); onPlay?.(event); }} />
    {children}
    {loading ? <div className="wk-view-loading" data-visible role="status" aria-label="正在缓冲"><span /></div>
      : <BufferingIndicator className="wk-view-loading" aria-label="正在缓冲"><span /></BufferingIndicator>}
    {(notice || message || error) && <div className="wk-view-notice" role="status">{notice || message || (error ? '当前来源无法播放，请重试或切换线路' : '')}</div>}
    <Controls.Root><Controls.Content className="wk-view-controls" data-player-control>
      {!live && <TimeSlider.Root className="wk-view-seek" changeThrottle={50}>
        <TimeSlider.Track className="wk-view-track"><TimeSlider.Buffer className="wk-view-buffer" /><TimeSlider.Fill className="wk-view-fill" /></TimeSlider.Track>
        <TimeSlider.Thumb className="wk-view-thumb" />
        <TimeSlider.Preview className="wk-view-seek-preview"><TimeSlider.Value type="pointer" /></TimeSlider.Preview>
      </TimeSlider.Root>}
      <div className="wk-view-bar">
        <PlayButton className="wk-view-button" render={(attributes, state) => <button {...attributes}>{state.paused ? <PlayCircleOutlined /> : <PauseOutlined />}</button>} />
        <MuteButton className="wk-view-button" render={(attributes, state) => <button {...attributes}>{state.muted ? <MutedOutlined /> : <SoundOutlined />}</button>} />
        <VolumeSlider.Root className="wk-view-volume"><VolumeSlider.Track className="wk-view-track"><VolumeSlider.Fill className="wk-view-fill" /></VolumeSlider.Track><VolumeSlider.Thumb className="wk-view-thumb" /></VolumeSlider.Root>
        {live ? <span className="wk-view-live">直播</span> : <Time.Group className="wk-view-time"><Time.Value type="current" /><Time.Separator /><Time.Value type="duration" /></Time.Group>}
        <span className="wk-view-spacer" />
        {!live && <ChoiceMenu label="播放速度" value={String(rate)} options={playbackRates.map(value => ({value: String(value), label: `${value}×`}))} onChange={value => store.setPlaybackRate(Number(value))} />}
        <ChoiceMenu label="画面比例" value={aspect} options={[{value:'auto',label:'原始比例'},{value:'16/9',label:'16:9'},{value:'4/3',label:'4:3'}]} onChange={setAspect} />
        {allowScreenshot && <button className="wk-view-button wk-view-screenshot" aria-label="截图" onClick={screenshot}><CameraOutlined /></button>}
        <PiPButton className="wk-view-button" render={(attributes) => <button {...attributes}><PictureOutlined /></button>} />
        <button className="wk-view-button" aria-label={webFullscreen ? '退出网页全屏' : '网页全屏'} aria-pressed={webFullscreen}
          onClick={() => { if (nativeFullscreen) void store.exitFullscreen(); setWebFullscreen(value => !value); }}>{webFullscreen ? <FullscreenExitOutlined /> : <ExpandOutlined />}</button>
        <FullscreenButton className="wk-view-button" render={(attributes, state) => <button {...attributes}>{state.fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}</button>} />
      </div>
    </Controls.Content></Controls.Root>
    <Hotkey keys="Space" action="togglePaused" /><Hotkey keys="m" action="toggleMuted" />
    <Hotkey keys="f" action="toggleFullscreen" /><Hotkey keys="i" action="togglePictureInPicture" />
    <Hotkey keys="ArrowLeft" action="seekStep" value={-5} disabled={live} /><Hotkey keys="ArrowRight" action="seekStep" value={5} disabled={live} />
    <Hotkey keys="ArrowUp" action="volumeStep" value={.05} /><Hotkey keys="ArrowDown" action="volumeStep" value={-.05} />
  </Container>;
}
