import React, { useEffect, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import defaults from 'defaults';
import { DndContext } from 'react-dnd';
import hoist from 'hoist-non-react-statics';
import { noop } from './util.js';
import ScrollingMonitor from './ScrollingMonitor.js';

const DEFAULT_BUFFER = 150;

const getDisplayName = PassedComponent =>
  PassedComponent.displayName ||
  PassedComponent.name ||
  (typeof PassedComponent === 'string' && PassedComponent.length > 0
    ? PassedComponent
    : 'Unknown');

export function createHorizontalStrength(_buffer) {
  return function defaultHorizontalStrength({ x, w, y, h }, point) {
    const buffer = Math.min(w / 2, _buffer);
    const inRange = point.x >= x && point.x <= x + w;
    const inBox = inRange && point.y >= y && point.y <= y + h;

    if (inBox) {
      if (point.x < x + buffer) {
        return (point.x - x - buffer) / buffer;
      } else if (point.x > x + w - buffer) {
        return -(x + w - point.x - buffer) / buffer;
      }
    }

    return 0;
  };
}

export function createVerticalStrength(_buffer) {
  return function defaultVerticalStrength({ y, h, x, w }, point) {
    const buffer = Math.min(h / 2, _buffer);
    const inRange = point.y >= y && point.y <= y + h;
    const inBox = inRange && point.x >= x && point.x <= x + w;

    if (inBox) {
      if (point.y < y + buffer) {
        return (point.y - y - buffer) / buffer;
      } else if (point.y > y + h - buffer) {
        return -(y + h - point.y - buffer) / buffer;
      }
    }

    return 0;
  };
}

export const defaultHorizontalStrength = createHorizontalStrength(DEFAULT_BUFFER);

export const defaultVerticalStrength = createVerticalStrength(DEFAULT_BUFFER);

const defaultOptions = {
  onScrollChange: noop,
  verticalStrength: defaultVerticalStrength,
  horizontalStrength: defaultHorizontalStrength,
  strengthMultiplier: 30
};

export function useDndScrolling(componentRef, passedOptions) {
  const { dragDropManager } = useContext(DndContext);
  if (!dragDropManager) {
    throw new Error(
      'Unable to get dragDropManager from context. Wrap this in <DndProvider>.'
    );
  }

  useEffect(() => {
    if (!componentRef.current) {
      return () => {};
    }
    const options = defaults(passedOptions, defaultOptions);
    const monitor = new ScrollingMonitor(dragDropManager, componentRef.current, options);
    monitor.start();
    return () => {
      monitor.stop();
    };
  }, [componentRef.current, dragDropManager, passedOptions]);
}

export default function createScrollingComponent(WrappedComponent) {
  function ScrollingComponent({
    strengthMultiplier,
    verticalStrength,
    horizontalStrength,
    onScrollChange,

    ...passedProps
  }) {
    const ref = useRef(null);
    useDndScrolling(ref, {
      strengthMultiplier,
      verticalStrength,
      horizontalStrength,
      onScrollChange
    });

    return <WrappedComponent {...passedProps} ref={ref} />;
  }

  ScrollingComponent.displayName = `Scrolling(${getDisplayName(WrappedComponent)})`;
  ScrollingComponent.propTypes = {
    onScrollChange: PropTypes.func,
    verticalStrength: PropTypes.func,
    horizontalStrength: PropTypes.func,
    strengthMultiplier: PropTypes.number
  };
  ScrollingComponent.defaultProps = defaultOptions;

  return hoist(ScrollingComponent, WrappedComponent);
}
