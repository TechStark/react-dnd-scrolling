import * as React from 'react';
import type { DragDropManager } from 'dnd-core';

export type BoxType = {
  x: number;
  w: number;
  y: number;
  h: number;
};

interface Point {
  x: number;
  y: number;
}

export type StrengthFunction = (box: BoxType, point: Point) => number;
/** @deprecated use `StrengthFunction` instead */
export type StrengthFuncton = StrengthFunction;

export function useDndScrolling(
  ref: React.Ref<any>,
  options: {
    verticalStrength?: StrengthFunction;
    horizontalStrength?: StrengthFunction;
    strengthMultiplier?: number;
    onScrollChange?: (newLeft: number, newTop: number) => void;
    dragDropManager?: DragDropManager;
  }
): void;

export function createHorizontalStrength(_buffer: number): StrengthFunction;
export function createVerticalStrength(_buffer: number): StrengthFunction;

export default function withScrolling<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<T>,
  P = React.ComponentProps<T>
>(
  component: T
): React.ComponentType<
  P & {
    verticalStrength?: StrengthFunction;
    horizontalStrength?: StrengthFunction;
    dragDropManager?: DragDropManager;
  }
>;
