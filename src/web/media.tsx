import { lazy, Suspense } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Card, Image, Skeleton } from 'antd';

const Playback = lazy(() => import('./media-player'));

export function MediaGrid({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`wk-media-grid ${className}`}>{children}</div>;
}

/** Shared card geometry; media sources, formatting and detail actions stay in the application. */
export function MediaCard({ preview, title, description, extra, action, onOpen, loading = false }: {
  preview: ReactNode; title: string; description?: string; extra?: ReactNode;
  action?: ReactNode; onOpen?: () => void; loading?: boolean;
}) {
  return <Card role="article" className="wk-media-card" cover={preview} classNames={{ body: 'wk-media-card-body' }}
    styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', flex: 1 } }}>
    {loading ? <Skeleton active title paragraph={{ rows: 1 }} /> : <>
      <div className="wk-media-card-heading">
        {onOpen ? <button type="button" className="wk-media-card-title" title={title} onClick={onOpen}>{title}</button>
          : <span className="wk-media-card-title" title={title}>{title}</span>}
        {extra != null && <span className="wk-media-card-extra">{extra}</span>}
      </div>
      <div className="wk-media-card-meta"><span title={description}>{description}</span>{action}</div>
    </>}
  </Card>;
}

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
  /** Audio card controls: play, seek and time. Full controls remain the default for details. */
  compact?: boolean;
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
