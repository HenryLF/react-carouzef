import {
  Children,
  isValidElement,
  ReactElement,
  ReactNode,
  useRef,
  TouchEvent,
  MouseEvent,
  useEffect,
  DragEvent,
} from "react";

export function incrementIndexSafe(
  value: number,
  count: number,
  max: number,
  modular: boolean
) {
  if (modular) {
    return (max + value + count) % max;
  }
  return Math.max(Math.min(count + value, max - 1), 0);
}

export function getIndexSafe(value: number, max: number, modular: boolean) {
  if (!modular) return Math.min(max - 1, Math.max(0, value));
  return (value + max) % max;
}

export function indexDistance(
  value: number,
  target: number,
  max: number,
  modular: boolean
) {
  if (!modular) return value - target;
  const distance = value - target;
  const invDistance = distance > 0 ? distance - max : distance + max;
  if (Math.abs(distance) < Math.abs(invDistance)) {
    return distance;
  }
  return invDistance;
}
type FilteredChild = {
  activeChilds: ReactElement[];
  inactiveChilds: ReactElement[];
};
export function filterChildren(children: ReactNode, filter: string) {
  const out: FilteredChild = { activeChilds: [], inactiveChilds: [] };
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const { className } = child.props as { className: string };
      if (className?.includes(filter)) {
        out.inactiveChilds.push(child);
      } else {
        out.activeChilds.push(child);
      }
    }
  });
  return out;
}

export function duplicateChildren(children: ReactNode, itemsPerView: number) {
  const count = Children.count(children);
  if (!count) return [];

  let childArray = Children.toArray(children);
  const minItems = Math.max(itemsPerView * 2, 3);
  while (childArray.length <= minItems) {
    childArray = [...childArray, ...childArray.slice(0, count)];
  }
  return childArray;
}

export enum ItemPosition {
  HIDDEN = "hidden",
  PREV = "prev",
  NEXT = "next",
  AFTER = "after",
  BEFORE = "before",
  ACTIVE = "active",
}
export function getItemPosition(distance: number, perView: number) {
  if (distance === 0) {
    return ItemPosition.ACTIVE;
  }
  if (distance === -1) {
    return ItemPosition.PREV;
  }
  if (distance === 1) {
    return ItemPosition.NEXT;
  }
  if (Math.abs(distance) > perView / 2 + 1) {
    return ItemPosition.HIDDEN;
  }
  if (distance < 0) {
    return ItemPosition.BEFORE;
  }
  return ItemPosition.AFTER;
}

function throttle<C extends unknown, T extends unknown[]>(
  func: (this: C, ...args: T) => void,
  limit: number
): (...args: T) => void {
  let inThrottle: boolean = false;
  return function (this: C, ...args: T): void {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

interface NavigationOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onKeysUp: Record<string, () => void>;
  keyboardEventThrottle: number;
  swipeThreshold: number;
}

export function useNavigation({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onKeysUp: keyboardNavigation,
  swipeThreshold,
  keyboardEventThrottle,
}: NavigationOptions) {
  const posStart = useRef<{ clientX: number; clientY: number } | null>(null);
  const posEnd = useRef<{ clientX: number; clientY: number } | null>(null);

  const threshold = swipeThreshold;

  const onKeyUp = (ev: KeyboardEvent) => {
    for (let key in keyboardNavigation) {
      if (ev.key == key) {
        keyboardNavigation[key]();
      }
    }
  };

  /* key events */
  useEffect(() => {
    const handle = throttle(onKeyUp, keyboardEventThrottle);
    window.addEventListener("keyup", handle);
    return () => window.removeEventListener("keyup", handle);
  }, []);

  const resolveSwipeMotion = () => {
    if (!posEnd.current || !posStart.current) return;
    const distanceX = posEnd.current.clientX - posStart.current.clientX;

    const distanceY = posEnd.current.clientY - posStart.current.clientY;
    if (distanceX > threshold) {
      onSwipeRight();
    }
    if (distanceX < -threshold) {
      onSwipeLeft();
    }
    if (distanceY > threshold) {
      onSwipeDown();
    }
    if (distanceY < -threshold) {
      onSwipeUp();
    }
    posEnd.current = null;
    posStart.current = null;
  };
  /* touch events */
  const onTouchStart = (e: TouchEvent) => {
    const { clientX, clientY } = e.nativeEvent.targetTouches[0];
    posStart.current = { clientX, clientY };
    posEnd.current = { clientX, clientY };
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!posEnd.current) return;
    const { clientX, clientY } = e.nativeEvent.targetTouches[0];
    posEnd.current = { clientX, clientY };
  };

  const onDragStartCapture = (e: DragEvent) => {
    const { clientX, clientY } = e;
    posStart.current = { clientX, clientY };
    posEnd.current = { clientX, clientY };
    removeDefaultDragImage(e);
    e.stopPropagation();
  };

  const onDragEndCapture = (e: DragEvent) => {
    const { clientX, clientY } = e;
    posEnd.current = { clientX, clientY };
    resolveSwipeMotion();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: resolveSwipeMotion,
    onDragStartCapture,
    onDragEndCapture,
    draggable: true,
  };
}

function removeDefaultDragImage(e: DragEvent) {
  const dragImage = new Image();
  dragImage.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  e.dataTransfer.effectAllowed = "none";
  if (e.dataTransfer.types.length === 0) {
    e.dataTransfer.setData("text/plain", "");
  }
}
