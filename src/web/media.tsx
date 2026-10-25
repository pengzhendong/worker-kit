import { lazy, Suspense } from 'react';
import { Image, Skeleton } from 'antd';

const Playback = lazy(() => import('./media-player'));

export interface MediaSource {
  src: string;
  title: string;
  poster?: string;
  /** Original bytes; only used to decide whether browser waveform decoding is appropriate. */
  bytes?: number;
  duration?: number;
  /** Precomputed waveform channels allow large audio to avoid a full-file fetch/decode. */
  peaks?: Array<number[] | Float32Array>;
  /** Same-origin endpoint returning { peaks: number[][], duration: number }. Fetched on demand. */
  waveformUrl?: string;
}

export interface MediaPlayerProps extends MediaSource {
  kind: 'audio' | 'video';
  /** Offer waveform loading in a detail view; lists keep this off. */
  waveform?: boolean;
  className?: string;
}

/** Uses Ant Design's existing zoom, rotate, keyboard and touch image viewer. */
export function ImageViewer({ src, title, poster, className }: MediaSource & { className?: string }) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return <Image className={className} src={poster || src} alt={title} width="100%" height="100%"
    styles={{ image: { width: '100%', height: '100%', objectFit: 'contain' } }}
    preview={{ src, cover: '查看大图', ...(reduceMotion ? { motionName: '' } : {}) }} placeholder={<Skeleton.Image active />} />;
}

/** Separate opt-in entry: the normal web/server imports never load player dependencies. */
export function MediaPlayer(props: MediaPlayerProps) {
  return <Suspense fallback={<div className="wk-media-loading" role="status" aria-label="正在加载播放器"><Skeleton active paragraph={{ rows: 1 }} /></div>}>
    <Playback key={`${props.kind}:${props.src}`} {...props} />
  </Suspense>;
}
