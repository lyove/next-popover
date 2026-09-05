/**
 * Create dom element
 * @param param
 * @returns HTMLElement
 */
interface ParamsObject {
  tagName?: string;
  attributes?: { [key: string]: unknown };
  children?: string | Array<Node>;
  style?: Partial<CSSStyleDeclaration>;
}
type ParamsType = string | ParamsObject;

export function $<T extends HTMLElement>(params: ParamsType): T {
  if (typeof params === "string") {
    return document.createElement(params) as T;
  }

  const { tagName, attributes, children, style } = params;
  const element = document.createElement(tagName || "div");

  // attributes of Boolean type
  const booleanTypes = ["disabled", "checked", "selected"];

  // set attribute
  Object.entries(attributes || {}).forEach(([key, val]) => {
    if (val) {
      if (booleanTypes.includes(key)) {
        element.setAttribute(key, "true");
      } else {
        element.setAttribute(key, `${val}`);
      }
    }
  });

  // set children
  if (children) {
    if (Array.isArray(children)) {
      children.forEach((c) => element.appendChild(c));
    } else {
      element.innerHTML = children.toString();
    }
  }
  // set style
  const cssStyle = element.style as unknown as Record<string, string | number>;
  Object.entries(style || {}).forEach(([key, val]) => {
    if (typeof key !== "number") {
      cssStyle[key] = val as string | number;
    }
  });

  return element as T;
}

/**
 * Clear all child elements of an element
 * @param $element
 */
export function $clearChildren($element: Element) {
  while ($element.firstChild) {
    if ($element.lastChild) {
      $element.removeChild($element.lastChild);
    }
  }
}

/**
 * get element style
 */
export function $getStyle($element: HTMLElement, propName: string) {
  if (!($element instanceof HTMLElement)) {
    throw new Error("Invalid param");
  }
  const computedStyle = getComputedStyle($element, null);
  return computedStyle.getPropertyValue(propName);
}

/**
 * set element style
 */
export function $setStyle($element: HTMLElement, style: { [key: string]: string | number }) {
  if (!($element instanceof HTMLElement)) {
    throw new Error("Invalid param");
  }

  const cssStyle = $element.style as unknown as Record<string, string | number>;
  Object.entries(style || {}).forEach(([key, val]) => {
    if (typeof key !== "number") {
      cssStyle[key] = val as string | number;
    }
  });
}

/**
 * set data-* attribute value
 * @param $element HTMLElement
 * @param name string
 * @param value any
 * @returns HTMLElement
 */
export function $setData(
  $element: HTMLElement,
  data: { [key: string]: string | number | boolean },
) {
  if (!$element) {
    throw new Error("Invalid param");
  }

  Object.entries(data || {}).forEach(([key, val]) => {
    if (typeof key !== "number") {
      $element.dataset[key] = String(val);
    }
  });
}

/**
 * get style properties
 * @param $element HTMLElement
 * @param key string
 * @returns string
 */
export function $getStyleProperties($element: HTMLElement, key: string) {
  const styles = window.getComputedStyle($element) as unknown as Record<string, string>;
  return styles[key]?.split(", ");
}

/**
 * Get Element Width & Height
 * @param $element HTMLElement
 * @returns {width: number, height: number}
 */
export function $getElementWidthHeight($element: HTMLElement) {
  if (!($element instanceof HTMLElement)) {
    throw new Error("Invalid param");
  }
  const style = getComputedStyle($element, null);
  const width = style.getPropertyValue("width").replace(/(\d+(\.\d+)?)(px|em|rem)/g, "$1");
  const height = style.getPropertyValue("height").replace(/(\d+(\.\d+)?)(px|em|rem)/g, "$1");
  return {
    width: Number(width),
    height: Number(height),
  };
}

/*
 * get scroll elements
 * @param $element HTMLElement
 * @param $appendTo HTMLElement
 * @returns HTMLElement
 */
export function $getScrollElements($element: HTMLElement | null, $appendTo: HTMLElement) {
  const scrollElements: HTMLElement[] = [];
  const isScrollElement = (el: HTMLElement) => {
    return el.scrollHeight > el.offsetHeight || el.scrollWidth > el.offsetWidth;
  };
  while ($element instanceof HTMLElement && $element !== $appendTo) {
    if (isScrollElement($element)) {
      scrollElements.push($element);
    }
    // Bail out explicitly when parentElement is null, avoiding an infinite loop when appendTo is not in the ancestor chain
    $element = $element.parentElement as HTMLElement | null;
  }
  return scrollElements;
}

/**
 * get absolute coords of the element
 * @param $element HTMLElement
 * @returns object
 */
export function $getAbsoluteCoords($element: HTMLElement) {
  if (!$element) {
    throw new Error("Invalid param");
  }

  const boxRect = $element.getBoundingClientRect();

  const pageX =
    window.scrollX !== undefined
      ? window.scrollX
      : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  const pageY =
    window.scrollY !== undefined
      ? window.scrollY
      : (document.documentElement || document.body.parentNode || document.body).scrollTop;

  return {
    width: boxRect.width,
    height: boxRect.height,
    top: boxRect.top + pageY,
    right: boxRect.right + pageX,
    bottom: boxRect.bottom + pageY,
    left: boxRect.left + pageX,
  };
}

/**
 * Get mouse coordinates
 * @param event MouseEvent
 * @returns ojbect
 */
export function $getCursorCoords(event: MouseEvent) {
  const x = event.pageX || event.clientX + document.body.scrollLeft;
  const y = event.pageY || event.clientY + document.body.scrollTop;
  return {
    x,
    y,
  };
}

/**
 * get element boundary
 * @param $element HTMLElement
 * @returns object
 */
export function $getElementBoundary($element: HTMLElement) {
  const elementCoords = $getAbsoluteCoords($element);
  const left = elementCoords.left;
  const top = elementCoords.top;
  const bottom = elementCoords.bottom;
  const right = elementCoords.right;
  return {
    left: Math.trunc(left),
    top: Math.trunc(top),
    bottom: Math.trunc(bottom),
    right: Math.trunc(right),
  };
}

/**
 * getm more visible sides
 * @param $element HTMLElement
 * @returns object
 */
export function $getMoreVisibleSides($element: HTMLElement) {
  if (!$element) {
    return {};
  }

  const boxRect = $element.getBoundingClientRect();
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;

  const leftArea = boxRect.left;
  const topArea = boxRect.top;
  const rightArea = availableWidth - leftArea - boxRect.width;
  const bottomArea = availableHeight - topArea - boxRect.height;

  const horizontal = leftArea > rightArea ? "left" : "right";
  const vertical = topArea > bottomArea ? "top" : "bottom";

  return {
    horizontal,
    vertical,
  };
}

/**
 * Detect Scrollbar Width and Height
 * @returns { width: number, height: number }
 */
let scrollbarSizeCache: { width: number; height: number } | null = null;

export function $getScrollbarSize() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { width: 0, height: 0 };
  }
  if (scrollbarSizeCache) {
    return scrollbarSizeCache;
  }

  // Creating invisible container
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll"; // forcing scrollbar to appear
  // msOverflowStyle is a legacy IE/Edge non-standard property not covered by the standard types
  (outer.style as unknown as { msOverflowStyle: string }).msOverflowStyle = "scrollbar";
  outer.style.position = "absolute";
  outer.style.top = "-9999px";
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement("div");
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  const scrollbarHeight = outer.offsetHeight - inner.offsetHeight;

  // Removing temporary elements from the DOM
  document.body.removeChild(outer);

  scrollbarSizeCache = {
    width: scrollbarWidth,
    height: scrollbarHeight,
  };
  window.addEventListener("resize", () => {
    scrollbarSizeCache = null;
  });

  return scrollbarSizeCache;
}

/**
 * Function Utils
 */

/**
 * Enum To ObjectArray
 * @param enums
 * @returns Array
 */
export function enumToObjectArray<T extends Record<string, string | number>>(
  enums: T,
): { name: string; value: string | number }[] {
  return Object.keys(enums).map((key) => ({
    name: key,
    value: enums[key],
  }));
}

/**
 * @desc Debounce
 * @param {function} fn
 * @param {number} delay
 * @param {Boolean} immediate
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
  immediate?: boolean,
): (...args: A) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: A) {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (immediate) {
      const callNow = !timeout;
      timeout = setTimeout(() => {
        timeout = null;
      }, delay);
      if (callNow) {
        fn.apply(this, args);
      }
    } else {
      timeout = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    }
  };
}

/**
 * Throttle (leading + trailing)
 * @param {function} fn
 * @param {number} delay
 * @param {any} ctx
 */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 0,
  ctx?: unknown,
): (...args: A) => void {
  let first = true;
  let pending = false;
  let lastRun = 0;

  return function (...args: A) {
    const now = Date.now();

    if (first) {
      first = false;
      lastRun = now;
      return fn.apply(ctx, args);
    }

    const remaining = delay - (now - lastRun);
    if (remaining <= 0) {
      lastRun = now;
      return fn.apply(ctx, args);
    }

    if (!pending) {
      pending = true;
      setTimeout(() => {
        pending = false;
        lastRun = Date.now();
        fn.apply(ctx, args);
      }, remaining);
    }
  };
}
