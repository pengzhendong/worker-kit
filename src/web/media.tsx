import { lazy, Suspense, useState } from 'react';
import type { ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button, Card, Image, Skeleton } from 'antd';
import { AudioOutlined, EyeOutlined, FileOutlined, PictureOutlined } from '@ant-design/icons';

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
  /** Compact audio/video controls: play, seek and time. Full controls remain the default for details. */
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

/** Compact mixed-media list. Applications own detail dialogs and download actions. */
export function MediaList({ children, layout = 'list', className = '', ...props }: ComponentPropsWithRef<'div'> & {
  layout?: 'list' | 'grid';
}) {
  return <div {...props} role="list" className={`wk-media-list ${layout === 'grid' ? 'wk-media-list-grid' : ''} ${className}`}>{children}</div>;
}

export function MediaRow({ kind, title, description, extra, action, onOpen, loading = false, ...source }: MediaSource & {
  kind: 'image' | 'audio' | 'video' | 'file'; description?: string; extra?: ReactNode;
  action?: ReactNode; onOpen: () => void; loading?: boolean;
}) {
  return <Row key={`${kind}:${source.src}:${source.poster || ''}`} {...source} kind={kind} title={title}
    description={description} extra={extra} action={action} onOpen={onOpen} loading={loading} />;
}

function Row({ kind, title, description, extra, action, onOpen, loading, ...source }: MediaSource & {
  kind: 'image' | 'audio' | 'video' | 'file'; description?: string; extra?: ReactNode;
  action?: ReactNode; onOpen: () => void; loading: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const playable = kind === 'audio' || kind === 'video';
  const poster = source.poster || (kind === 'image' ? source.src : undefined);
  return <div role="listitem" className="wk-media-row" data-workerkit-media-row={kind} aria-busy={loading}>
    {loading ? <>
      <div className="wk-media-thumbnail"><Skeleton.Image active /></div>
      <div className="wk-media-row-info"><Skeleton active title paragraph={{ rows: 0 }} /></div>
      <div className="wk-media-row-tools"><Skeleton.Button active block /></div>
    </> : <>
      <button type="button" className={`wk-media-thumbnail ${kind === 'video' ? 'wk-media-thumbnail-video' : ''}`}
        aria-label={`预览 ${title}`} onClick={onOpen}>
        {kind !== 'video' && (poster && !failed ? <img src={poster} alt="" loading="lazy" onError={() => setFailed(true)} />
          : kind === 'audio' ? <AudioOutlined aria-hidden /> : kind === 'image' ? <PictureOutlined aria-hidden /> : <FileOutlined aria-hidden />)}
      </button>
      <div className="wk-media-row-info">
        <button type="button" className="wk-media-row-title" title={title} onClick={onOpen}>{title}</button>
        <div className="wk-media-row-meta"><span title={description}>{description}</span><span className="wk-media-mobile-extra">{extra}</span></div>
      </div>
      {playable ? <MediaPlayer {...source} title={title} kind={kind} compact />
        : <div className="wk-media-row-tools"><Button type="text" icon={<EyeOutlined aria-hidden />} aria-label={`查看 ${title}`} onClick={onOpen} /></div>}
      <div className="wk-media-row-extra">{extra}</div><div className="wk-media-row-action">{action}</div>
    </>}
  </div>;
}

/** Separate opt-in entry: the normal web/server imports never load player dependencies. */
export function MediaPlayer(props: MediaPlayerProps) {
  return <Suspense fallback={<div className="wk-media-loading" role="status" aria-label="正在加载播放器"><Skeleton active paragraph={{ rows: 1 }} /></div>}>
    <Playback key={`${props.kind}:${props.src}`} {...props} />
  </Suspense>;
}
