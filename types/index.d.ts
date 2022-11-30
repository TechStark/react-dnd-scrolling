import * as React from 'react';
import type { DragDropManager } from 'dnd-core';

export type BoxType = {
  x: number;
  w: number;
  y: number;
  h: number;
};

export type StrengthFuncton = (box: BoxType, point: number) => number;

export function useDndScrolling(
  ref: React.Ref<any>,
  options: {
    verticalStrength?: StrengthFuncton;
    horizontalStrength?: StrengthFuncton;
    strengthMultiplier?: number;
    onScrollChange?: (newLeft: number, newTop: number) => void;
    dragDropManager?: DragDropManager;
  }
): void;

export function createHorizontalStrength(_buffer: number): StrengthFuncton;
export function createVerticalStrength(_buffer: number): StrengthFuncton;

export default function withScrolling<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<T>,
  P = React.ComponentProps<T>
  >(
  component: T
): React.ComponentType<
  P & {
  verticalStrength?: StrengthFuncton;
  horizontalStrength?: StrengthFuncton;
  dragDropManager?: DragDropManager;
}
  >;
