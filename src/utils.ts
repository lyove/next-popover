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
  Object.entries(style || {}).forEach(([key, val]) => {
    if (typeof key !== "number") {
      (<any>element.style)[key] = val;
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

  Object.entries(style || {}).forEach(([key, val]) => {
    if (typeof key !== "number") {
      (<any>$element.style)[key] = val;
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
export function $setData($element: HTMLElement, data: { [key: string]: any }) {
  if (!$element) {
    throw new Error("Invalid param");
  }

  Object.entries(data || {}).forEach(([key, val]) => {
    if (typeof key !== "number") {
      $element.dataset[key] = val;
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
  const styles = window.getComputedStyle($element);
  return (styles as any)[key]?.split(", ");
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
export function $getScrollElements($element: HTMLElement, $appendTo: HTMLElement) {
  const scrollElements: HTMLElement[] = [];
  const isScrollElement = (el: HTMLElement) => {
    return el.scrollHeight > el.offsetHeight || el.scrollWidth > el.offsetWidth;
  };
  while ($element instanceof HTMLElement && $element !== $appendTo) {
    if (isScrollElement($element)) {
      scrollElements.push($element);
    }
    if ($element.parentElement instanceof HTMLElement) {
      $element = $element.parentElement;
    }
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
export function $getScrollbarSize() {
  // Creating invisible container
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll"; // forcing scrollbar to appear
  // @ts-ignore
  outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
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

  return {
    width: scrollbarWidth,
    height: scrollbarHeight,
  };
}

/**
 * Function Utils
 */

/**
 * Enum To ObjectArray
 * @param enums
 * @returns Array
 */
export function enumToObjectArray(enums: any): any[] {
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
/*
export function debounce(fn: (arg?: any) => any, delay = 0, immediate?: boolean) {
  let timer: any = null;
  return function (...args: any) {
    if (timer) {
      clearTimeout(timer);
    }
    if (!timer && immediate) {
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    }
  };
}
*/
export function debounce(fn: (arg?: any) => any, delay: number, immediate?: boolean) {
  let timeout: any = null;
  return function (...args: any) {
    const _this = this;
    if (timeout) {
      clearTimeout(timeout);
    }
    if (immediate) {
      const callNow = !timeout;
      timeout = setTimeout(() => {
        timeout = null;
      }, delay);
      if (callNow) {
        fn.apply(_this, args);
      }
    } else {
      timeout = setTimeout(() => {
        fn.apply(_this, args);
      }, delay);
    }
  };
}

/**
 * Throttle
 * @param {function} fn
 * @param {any} ctx
 */
export function throttle(fn: () => void, ctx?: any): any {
  let pending = false;
  let first = true;

  return function (...args: any) {
    if (first) {
      first = false;
      return fn.apply(ctx, args);
    }

    if (pending) {
      return;
    }

    pending = true;

    requestAnimationFrame(() => {
      fn.apply(ctx, args);
      pending = false;
    });
  };
}
