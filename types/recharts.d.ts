/**
 * Fallback types when `recharts` is not installed (e.g. disk full). Remove after `npm install` succeeds.
 */
declare module 'recharts' {
  import type { ComponentType, ReactNode } from 'react';

  export const ResponsiveContainer: ComponentType<{ width?: string | number; height?: string | number; children?: ReactNode }>;
  export const ScatterChart: ComponentType<{ margin?: { top?: number; right?: number; bottom?: number; left?: number }; children?: ReactNode }>;
  export const Scatter: ComponentType<{
    data?: unknown[];
    shape?: ((props: Record<string, unknown>) => ReactNode) | ComponentType<Record<string, unknown>>;
  }>;
  export const CartesianGrid: ComponentType<{ strokeDasharray?: string; stroke?: string; strokeOpacity?: number }>;
  export const XAxis: ComponentType<Record<string, unknown>>;
  export const YAxis: ComponentType<Record<string, unknown>>;
  export const Tooltip: ComponentType<{
    cursor?: Record<string, unknown>;
    content?: ComponentType<{ active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }>;
  }>;
}
