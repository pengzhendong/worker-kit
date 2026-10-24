import type { ComponentPropsWithoutRef } from 'react';
import { workerKitLayout } from './design';

/** Keeps SVG and custom navigation icons on the same alignment box. */
export function IconBox({ children, style, ...props }: ComponentPropsWithoutRef<'span'>) {
  return <span {...props} data-workerkit-icon style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: workerKitLayout.iconSize, height: workerKitLayout.iconSize, flexShrink: 0, lineHeight: 1, ...style }}>{children}</span>;
}
