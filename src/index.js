import React, { useEffect, useRef, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import defaults from 'defaults';
import { DndContext } from 'react-dnd';
import throttle from 'lodash.throttle';
import raf from 'raf';
import hoist from 'hoist-non-react-statics';
import { noop, intBetween, getCoords } from './util.js';

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

const defaultProps = {
  onScrollChange: noop,
  verticalStrength: defaultVerticalStrength,
  horizontalStrength: defaultHorizontalStrength,
  strengthMultiplier: 30,
  dragDropManager: null
};

export function useDndScrolling(componentRef, passedOptions) {
  const props = defaults(passedOptions, defaultProps);
  const scaleX = useRef(0);
  const scaleY = useRef(0);
  const frame = useRef(0);
  const attached = useRef(false);
  const dragging = useRef(false);

  const { dragDropManager: dragDropManagerCtx } = useContext(DndContext);
  const dragDropManager = props.dragDropManager ?? dragDropManagerCtx;

  if (!dragDropManager) {
    throw new Error(
      'Unable to get dragDropManager from context. Provide DnDContext or pass dragDropManager via options to useDndScrolling.'
    );
  }

  const monitor = React.useMemo(() => dragDropManager.getMonitor(), [dragDropManager]);

  const startScrolling = React.useCallback(() => {
    let i = 0;
    const tick = () => {
      const { strengthMultiplier, onScrollChange } = props;

      // stop scrolling if there's nothing to do
      if (strengthMultiplier === 0 || scaleX.current + scaleY.current === 0) {
        // eslint-disable-next-line no-use-before-define
        stopScrolling();
        return;
      }

      // there's a bug in safari where it seems like we can't get
      // mousemove events from a container that also emits a scroll
      // event that same frame. So we double the strengthMultiplier and only adjust
      // the scroll position at 30fps
      if (i++ % 2) {
        const {
          scrollLeft,
          scrollTop,
          scrollWidth,
          scrollHeight,
          clientWidth,
          clientHeight
        } = componentRef.current;

        const newLeft = scaleX.current
          ? // eslint-disable-next-line no-param-reassign
            (componentRef.current.scrollLeft = intBetween(
              0,
              scrollWidth - clientWidth,
              scrollLeft + scaleX.current * strengthMultiplier
            ))
          : scrollLeft;

        const newTop = scaleY.current
          ? // eslint-disable-next-line no-param-reassign
            (componentRef.current.scrollTop = intBetween(
              0,
              scrollHeight - clientHeight,
              scrollTop + scaleY.current * strengthMultiplier
            ))
          : scrollTop;

        onScrollChange(newLeft, newTop);
      }
      frame.current = raf(tick);
    };

    tick();
  }, []);

  // Update scaleX and scaleY every 100ms or so
  // and start scrolling if necessary
  const updateScrolling = React.useMemo(
    () =>
      throttle(
        evt => {
          if (!componentRef.current) {
            return;
          }

          const {
            left: x,
            top: y,
            width: w,
            height: h
          } = componentRef.current.getBoundingClientRect();
          const box = { x, y, w, h };
          const coords = getCoords(evt);

          // calculate strength
          scaleX.current = props.horizontalStrength(box, coords);
          scaleY.current = props.verticalStrength(box, coords);

          // start scrolling if we need to
          if (!frame.current && (scaleX.current || scaleY.current)) {
            startScrolling();
          }
        },
        100,
        { trailing: false }
      ),
    []
  );

  const attach = useCallback(() => {
    attached.current = true;
    window.document.body.addEventListener('dragover', updateScrolling);
    window.document.body.addEventListener('touchmove', updateScrolling);
  }, []);

  const detach = useCallback(() => {
    attached.current = false;
    window.document.body.removeEventListener('dragover', updateScrolling);
    window.document.body.removeEventListener('touchmove', updateScrolling);
  }, []);

  const stopScrolling = React.useCallback(() => {
    detach();
    scaleX.current = 0;
    scaleY.current = 0;

    if (frame.current) {
      raf.cancel(frame.current);
      frame.current = null;
    }
  }, []);

  const handleEvent = useCallback(
    evt => {
      if (dragging.current && !attached.current) {
        attach();
        updateScrolling(evt);
      }
    },
    [dragDropManager]
  );

  useEffect(() => {
    if (!dragging.current && monitor.isDragging()) {
      dragging.current = true;
    } else if (dragging.current && !monitor.isDragging()) {
      dragging.current = false;
      stopScrolling();
    }
  }, [monitor.isDragging()]);

  useEffect(() => {
    if (!componentRef.current) {
      return () => {};
    }
    componentRef.current.addEventListener('dragover', handleEvent);
    // touchmove events don't seem to work across siblings, so we unfortunately
    // have to attach the listeners to the body
    window.document.body.addEventListener('touchmove', handleEvent);

    return () => {
      if (componentRef.current) {
        componentRef.current.removeEventListener('dragover', handleEvent);
      }
      window.document.body.removeEventListener('touchmove', handleEvent);
      stopScrolling();
    };
  }, [dragDropManager]);
}

export default function createScrollingComponent(WrappedComponent) {
  function ScrollingComponent({
    strengthMultiplier,
    verticalStrength,
    horizontalStrength,
    onScrollChange,
    dragDropManager,

    ...passedProps
  }) {
    const ref = useRef(null);
    useDndScrolling(ref, {
      strengthMultiplier,
      verticalStrength,
      horizontalStrength,
      onScrollChange,
      dragDropManager
    });

    return <WrappedComponent {...passedProps} ref={ref} />;
  }

  ScrollingComponent.displayName = `Scrolling(${getDisplayName(WrappedComponent)})`;
  ScrollingComponent.propTypes = {
    onScrollChange: PropTypes.func,
    verticalStrength: PropTypes.func,
    horizontalStrength: PropTypes.func,
    strengthMultiplier: PropTypes.number,
    dragDropManager: PropTypes.any
  };
  ScrollingComponent.defaultProps = defaultProps;

  return hoist(ScrollingComponent, WrappedComponent);
}
