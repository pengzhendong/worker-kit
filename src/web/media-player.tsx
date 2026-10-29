import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Alert, Button, Flex, Typography, theme } from 'antd';
import { I18nProvider } from '@videojs/react/i18n';
import { Container, PlayButton, Time, TimeSlider } from '@videojs/react';
import { CaretRightOutlined, PauseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Audio, AudioPlayer, NeutralAudioSkin } from '@videojs/react/audio';
import { Video, VideoPlayer, NeutralVideoSkin } from '@videojs/react/video';
import '@videojs/react/audio/neutral-skin.css';
import '@videojs/react/video/neutral-skin.css';
import type { MediaPlayerProps } from './media';
import { useWorkerKitTheme } from './provider';
import { claimPlayback, releasePlayback } from './media-session';

function formatDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const whole = Math.floor(seconds), minutes = Math.floor(whole / 60);
  return `${minutes >= 60 ? `${Math.floor(minutes / 60)}:` : ''}${minutes >= 60 ? String(minutes % 60).padStart(2, '0') : minutes}:${String(whole % 60).padStart(2, '0')}`;
}

function CompactPlayback({ title, duration, children, video = false }: Pick<MediaPlayerProps, 'title' | 'duration'> & { children: React.ReactNode; video?: boolean }) {
  const knownDuration = formatDuration(duration);
  return <Container className={video ? "wk-video-compact" : "wk-audio-compact"} aria-label={`${title}播放器`}>
    {video ? <div className="wk-media-visual">{children}</div> : children}
    <div className="wk-media-controls">
    <PlayButton className="wk-audio-play" render={(attributes, state) => <button {...attributes}>
      {state.ended ? <ReloadOutlined /> : state.paused ? <CaretRightOutlined /> : <PauseOutlined />}
    </button>} />
    <TimeSlider.Root className="wk-audio-seek">
      <TimeSlider.Track className="wk-audio-track"><TimeSlider.Buffer className="wk-audio-buffer" /><TimeSlider.Fill className="wk-audio-fill" /></TimeSlider.Track>
      <TimeSlider.Thumb className="wk-audio-thumb" />
    </TimeSlider.Root>
    <Time.Group className="wk-audio-time">
      <Time.Value type="current" className="wk-audio-current" />
      <Time.Separator />
      <Time.Value type="duration" render={(attributes, state) => <time {...attributes}
        aria-label={state.unavailable ? `总时长 ${knownDuration === '—' ? '未知' : knownDuration}` : attributes['aria-label']}
        dateTime={state.unavailable && knownDuration !== '—' ? `PT${Math.floor(duration!)}S` : state.datetime}>
        {state.unavailable ? knownDuration : state.text}
      </time>} />
    </Time.Group>
    </div>
  </Container>;
}

function Waveform({ media, source }: { media: HTMLAudioElement; source: MediaPlayerProps }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const { token } = theme.useToken();
  const instance = useRef<import('wavesurfer.js').default | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    setState('loading');
    void import('wavesurfer.js').then(async ({ default: WaveSurfer }) => {
      let peaks = source.peaks, duration = source.duration;
      if (source.waveformUrl) {
        const response = await fetch(source.waveformUrl, { signal: abort.signal });
        if (!response.ok) throw new Error('Waveform unavailable');
        const data: unknown = await response.json();
        const value = data as { peaks?: unknown; duration?: unknown };
        if (!Number.isFinite(value?.duration) || Number(value.duration) <= 0 || !Array.isArray(value.peaks) ||
            value.peaks.length < 1 || value.peaks.length > 8 || !value.peaks.every(channel => Array.isArray(channel) && channel.length > 0 && channel.length <= 10000 && channel.every(sample => typeof sample === 'number' && Number.isFinite(sample)))) throw new Error('Invalid waveform');
        peaks = value.peaks; duration = Number(value.duration);
      }
      if (disposed || !container.current) return;
      const wave = WaveSurfer.create({ container: container.current, media, height: 80,
        waveColor: token.colorPrimaryBorder, progressColor: token.colorPrimary,
        cursorColor: token.colorText, barWidth: 2, barGap: 2, barRadius: 2,
        dragToSeek: true, url: source.src, peaks, duration,
        fetchParams: { signal: abort.signal } });
      instance.current = wave;
      wave.on('ready', () => { if (!disposed) setState('ready'); });
      wave.on('error', () => { if (!disposed) setState('error'); });
    }).catch(() => { if (!disposed) setState('error'); });
    return () => { disposed = true; abort.abort(); instance.current?.destroy(); instance.current = null; };
  }, [media, source.src, source.peaks, source.duration, source.waveformUrl, attempt]);
  useEffect(() => { instance.current?.setOptions({ waveColor: token.colorPrimaryBorder, progressColor: token.colorPrimary, cursorColor: token.colorText }); }, [token]);
  return <div className="wk-waveform-panel">
    <div ref={container} className="wk-waveform" aria-label={`${source.title}波形`} />
    {state === 'loading' && <Typography.Text type="secondary" role="status">正在生成波形…</Typography.Text>}
    {state === 'error' && <Flex align="center" gap={8} wrap><Typography.Text type="secondary" role="status">波形不可用，仍可直接播放</Typography.Text><Button size="small" onClick={() => setAttempt(v => v + 1)}>重试波形</Button></Flex>}
    {state === 'ready' && <Typography.Text type="secondary">点击或拖动波形定位，键盘定位可使用下方进度条</Typography.Text>}
  </div>;
}

export default function Playback(props: MediaPlayerProps) {
  const { src, title, poster, kind, waveform = false, compact = false, className } = props;
  const media = useRef<HTMLMediaElement | null>(null);
  const [showWave, setShowWave] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { token } = theme.useToken();
  const { dark } = useWorkerKitTheme();
  const colors = { '--media-accent-color': token.colorPrimary, '--media-accent-text-color': '#fff', '--media-font-family': token.fontFamily,
    colorScheme: dark ? 'dark' : 'light' } as CSSProperties;
  // Missing size/duration must not turn a potentially huge stream into a browser decode.
  const canDecode = Boolean(props.waveformUrl) || Boolean(props.peaks?.length && props.duration && props.duration > 0) ||
    Boolean(props.bytes && props.bytes > 0 && props.bytes <= 32 * 1024 ** 2 && props.duration && props.duration > 0 && props.duration <= 600);
  useEffect(() => {
    const element = media.current;
    // React StrictMode replays effects; restore a source removed by the replay cleanup.
    if (element && !element.getAttribute('src')) element.src = src;
    return () => {
      if (!element) return;
      element.pause(); element.removeAttribute('src'); element.load();
      releasePlayback(element);
    };
  }, [src, attempt]);
  const events = { src, preload: 'none' as const, onPlay: (event: React.SyntheticEvent<HTMLMediaElement>) => { setFailed(false); claimPlayback(event.currentTarget); },
    onError: () => setFailed(true), 'aria-label': title };
  return <div className={`wk-media-player wk-media-${kind} ${className || ''}`} style={colors} data-workerkit-media={kind}>
    <I18nProvider locale="zh-CN">
      {kind === 'video' ? <VideoPlayer poster={poster}>{compact ? <CompactPlayback key={attempt} title={title} duration={props.duration} video>
        <Video {...events} poster={poster} ref={element => { media.current = element; }} playsInline />
      </CompactPlayback> : <NeutralVideoSkin key={attempt} className="wk-video-skin" aria-label={`${title}播放器`}>
        <Video {...events} ref={element => { media.current = element; }} playsInline />
      </NeutralVideoSkin>}</VideoPlayer> : <AudioPlayer title={title}>
        {waveform && <div className="wk-waveform-toolbar">
          {showWave && media.current ? <Waveform media={media.current as HTMLAudioElement} source={props} />
            : <Button size="small" disabled={!canDecode} onClick={() => setShowWave(true)}>加载波形</Button>}
          {!canDecode && <Typography.Text type="secondary">大音频或时长未知，使用流式试听</Typography.Text>}
        </div>}
        {compact ? <CompactPlayback key={attempt} title={title} duration={props.duration}><Audio {...events} ref={element => { media.current = element; }} /></CompactPlayback>
          : <NeutralAudioSkin key={attempt} className="wk-audio-skin"><Audio {...events} ref={element => { media.current = element; }} /></NeutralAudioSkin>}
      </AudioPlayer>}
    </I18nProvider>
    {failed && (compact ? <div className="wk-media-compact-error" role="alert"><Button type="text" aria-label="无法播放，点击重试" icon={<ReloadOutlined aria-hidden />}
      onClick={() => { setFailed(false); setAttempt(v => v + 1); }}>无法播放，点击重试</Button></div> : <Alert type="warning" title="暂时无法播放" description="请重试，或下载后使用本地播放器打开。"
      action={<Button size="small" onClick={() => { setFailed(false); setShowWave(false); setAttempt(v => v + 1); }}>重试播放</Button>} />)}
  </div>;
}
