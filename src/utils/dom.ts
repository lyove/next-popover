/**
 * Create dom element
 * @param param
 * @returns HTMLElement
 */
export function $<T extends HTMLElement>({
  tagName,
  attributes,
  children,
  style,
}: {
  tagName?: string;
  attributes?: { [key: string]: any };
  children?: string | Array<Node>;
  style?: Partial<CSSStyleDeclaration>;
}): T {
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
    if (typeof children === "string") {
      element.innerHTML = children;
    } else {
      children.forEach((c) => element.appendChild(c));
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
 * Show element
 * @param element HTMLElement
 */
export function $showElementByOpacity(element: HTMLElement) {
  const { style } = element;
  style.opacity = "1";
  style.pointerEvents = "auto";
}

/**
 * Hide element
 * @param element HTMLElement
 */
export function $hideElementByOpacity(element: HTMLElement) {
  const { style } = element;
  style.opacity = "0";
  style.pointerEvents = "none";
}

/**
 * set style
 */
export function $setStyle($element: HTMLElement, style: { [key: string]: string }) {
  if (!$element) {
    return;
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
