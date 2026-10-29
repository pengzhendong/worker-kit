import { useEffect, useRef, useState } from 'react';
import { workerKitLayout } from './design';

/** Fit fixed-height list/grid rows, reserving the real pagination and content padding. */
export function useAutoPageSize({ rowHeight, min = 1, max = 100 }: {
  rowHeight?: number; min?: number; max?: number;
} = {}) {
  const listRef = useRef<HTMLDivElement>(null), paginationRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<number | null>(null);
  useEffect(() => {
    const list = listRef.current, pagination = paginationRef.current;
    if (!list || !pagination) return;
    const viewport = list.closest<HTMLElement>('[data-workerkit-region="content"]') ?? document.documentElement;
    const inner = viewport.firstElementChild as HTMLElement | null;
    const pixels = (value: string) => Number.parseFloat(value) || 0;
    const measure = () => {
      const listStyle = getComputedStyle(list), footerStyle = getComputedStyle(pagination);
      const offset = viewport === document.documentElement ? list.getBoundingClientRect().top + window.scrollY
        : list.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
      const chrome = pixels(listStyle.borderTopWidth) + pixels(listStyle.borderBottomWidth) + pixels(listStyle.paddingTop) + pixels(listStyle.paddingBottom);
      const footer = Math.max(pagination.getBoundingClientRect().height, pagination.scrollHeight) + pixels(footerStyle.marginTop) + pixels(footerStyle.marginBottom);
      const bottom = viewport === document.documentElement || !inner ? 0 : pixels(getComputedStyle(inner).paddingBottom);
      const height = viewport === document.documentElement ? window.innerHeight : viewport.clientHeight;
      const itemHeight = rowHeight ?? (pixels(listStyle.getPropertyValue('--wk-media-row-height')) || workerKitLayout.mediaRowHeight);
      const grid = listStyle.display === 'grid';
      const columns = grid ? Math.max(1, listStyle.gridTemplateColumns.split(' ').filter(Boolean).length) : 1;
      const gap = grid ? pixels(listStyle.rowGap) : 0;
      const rows = Math.max(1, Math.floor((height - offset - chrome - footer - bottom + gap) / (itemHeight + gap)));
      const next = Math.max(min, Math.min(max, rows * columns));
      setPageSize(previous => previous === next ? previous : next);
    };
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(measure, 120); };
    const observer = new ResizeObserver(schedule);
    for (const element of new Set([viewport, inner, list, list.parentElement, pagination])) if (element) observer.observe(element);
    window.addEventListener('resize', schedule);
    measure();
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', schedule); };
  }, [rowHeight, min, max]);
  return { pageSize, listRef, paginationRef };
}
