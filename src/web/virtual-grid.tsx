import {useCallback, useLayoutEffect, useRef, useState} from 'react';
import type {CSSProperties, HTMLAttributes, Key, ReactNode, Ref} from 'react';
import {useVirtualizer} from '@tanstack/react-virtual';

export type VirtualGridProps<T> = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => Key;
  /** Fixed card height, excluding the gap. Variable-height masonry is not supported. */
  itemHeight: number;
  minItemWidth?: number;
  gap?: number;
  overscan?: number;
  totalCount?: number;
  empty?: ReactNode;
  loading?: boolean;
  /** Initial skeletons fill complete rows, using the measured column count. */
  renderPlaceholder?: (index: number) => ReactNode;
  placeholderRows?: number;
  /** Defaults to the enclosing AdminShell content region. */
  getScrollElement?: () => HTMLElement | null;
  ref?: Ref<HTMLDivElement>;
};

/** Optional TanStack Virtual adapter. Data fetching and media remain application-owned. */
export function VirtualGrid<T>({items, renderItem, getItemKey, itemHeight, minItemWidth = 240,
  gap = 16, overscan = 1, totalCount, empty, loading = false, renderPlaceholder, placeholderRows = 2,
  getScrollElement, ref, className = '', style, ...props}: VirtualGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({columns: 1, margin: 0});
  const height = Math.max(1, itemHeight), spacing = Math.max(0, gap), width = Math.max(1, minItemWidth);
  const scrollElement = useCallback(() => getScrollElement ? getScrollElement()
    : gridRef.current?.closest<HTMLElement>('[data-workerkit-region=content]') ?? null, [getScrollElement]);
  const setRef = useCallback((element: HTMLDivElement | null) => {
    gridRef.current = element;
    if (typeof ref === 'function') return ref(element);
    if (ref) ref.current = element;
  }, [ref]);

  useLayoutEffect(() => {
    const grid = gridRef.current, root = scrollElement();
    if (!grid || !root) return;
    const measure = () => {
      const columns = Math.max(1, Math.floor((grid.clientWidth + spacing) / (width + spacing)));
      const margin = grid.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop + root.scrollTop;
      setLayout(old => old.columns === columns && old.margin === margin ? old : {columns, margin});
    };
    const observer = new ResizeObserver(measure);
    observer.observe(grid); observer.observe(root); measure();
    return () => observer.disconnect();
  }, [scrollElement, width, spacing]);

  const placeholders = loading && items.length === 0 && !!renderPlaceholder;
  const rowCount = placeholders ? Math.max(1, Math.floor(placeholderRows)) : Math.ceil(items.length / layout.columns);
  const virtualizer = useVirtualizer({count: rowCount,
    getScrollElement: scrollElement, estimateSize: () => height, gap: spacing,
    scrollMargin: layout.margin, overscan: Math.max(0, overscan)});
  useLayoutEffect(() => {virtualizer.measure();}, [height, spacing, layout.columns]);
  const geometry = {'--wk-grid-gap': `${spacing}px`, height: rowCount ? virtualizer.getTotalSize() : undefined} as CSSProperties;
  return <div {...props} ref={setRef} role="list" aria-busy={loading || props['aria-busy']} className={`wk-virtual-grid ${className}`} style={{...style, ...geometry}}>
    {rowCount ? virtualizer.getVirtualItems().map(row => <div key={row.key} className="wk-virtual-grid-row" role="presentation"
      style={{height: row.size, gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        transform: `translateY(${row.start - layout.margin}px)`}}>
      {(placeholders ? Array.from({length: layout.columns}, () => null) : items.slice(row.index * layout.columns, (row.index + 1) * layout.columns)).map((item, offset) => {
        const index = row.index * layout.columns + offset;
        return placeholders
          ? <div key={`placeholder-${index}`} className="wk-virtual-grid-item" aria-hidden>{renderPlaceholder!(index)}</div>
          : <div key={getItemKey(item as T, index)} role="listitem" className="wk-virtual-grid-item"
            aria-posinset={index + 1} aria-setsize={totalCount ?? items.length}>{renderItem(item as T, index)}</div>;
      })}
    </div>) : empty}
  </div>;
}
