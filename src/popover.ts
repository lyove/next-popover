import type { PopoverConfig, AnimationClass } from "./type";
import getPosition from "./getPosition";
import {
  $,
  $showElementByOpacity,
  $setStyle,
  $getStyleProperties,
  $getAbsoluteCoords,
  $getCursorCoords,
  throttle,
} from "./utils";
import { EmitType, PlacementType } from "./constant";
import "./style/index.scss";

// class name
const NextPopoverId = "next-popover";
const WrapperClassName = "popover-wrapper";
const ContentClassName = "popover-content";
const ArrowClass = "popover-arrow";

// default config
const DefaultConfig: Partial<PopoverConfig> = {
  placement: PlacementType.Top,
  showArrow: true,
  appendTo: document.body,
  autoUpdate: true,
  emit: EmitType.Click,
  animationClass: "fade",
  clickOutsideClose: true,
  enterable: true,
  openDelay: 100,
  closeDelay: 50,
  margin: 8,
};

/**
 * Popover
 * A lightweight smart javascript popover library
 */
export default class Popover {
  /* public property */
  config!: PopoverConfig;
  popoverRoot!: HTMLElement;
  popoverWrapper!: HTMLElement;
  popoverContent!: HTMLElement;
  arrowElement?: HTMLElement;
  opened = false;
  closed = true;

  /* private property */
  #isAnimating = false;
  #animationClass?: AnimationClass;
  #prevPlacement?: PlacementType;
  #showRaf?: number;
  #hideRaf?: number;
  #clearShow?: () => void;
  #clearHide?: () => void;
  #scrollElements?: HTMLElement[];
  #resizeObserver?: ResizeObserver;
  #openTimer?: any;
  #closeTimer?: any;

  /**
   * Constructor
   * @param config
   */
  constructor(config: PopoverConfig) {
    if (config) {
      this.config = this.#getConfig(config);
      const { trigger, content } = this.config;
      if (
        !trigger ||
        !(trigger instanceof HTMLElement) ||
        !content ||
        !(
          content instanceof HTMLElement ||
          typeof content === "string" ||
          typeof content === "number"
        )
      ) {
        throw new Error("Invalid configuration");
      }
      this.init();
    }
  }

  /**
   * Initialize
   */
  protected init() {
    const { trigger, appendTo, autoUpdate, defaultOpen } = this.config;

    // create popover
    this.#createPopover();

    // autoUpdate
    if (autoUpdate) {
      this.#observe();
    }

    // add event
    this.#addTriggerEvent();
    this.#addPopRootEvent();

    // set animation
    this.#setAnimationClass();

    // listen scroll
    if (this.#needListenScroll()) {
      this.#scrollElements = this.#getScrollElements(trigger as HTMLElement, appendTo!);
    }

    // default open
    if (defaultOpen) {
      requestAnimationFrame(() => this.open());
    }
  }

  /**
   * Open the Popover instance.
   */
  open() {
    const { config } = this;

    if (config.disabled) {
      return;
    }

    this.closed = false;

    const fromHide = !this.opened;
    if (fromHide) {
      if (this.#isAnimating) {
        return;
      }

      // remove existing popover when opening a new none
      this.cleanup();

      this.#showPopover();
      this.#scrollElements?.forEach((e) => {
        e.addEventListener("scroll", this.#onScroll, { passive: true });
      });
      document.addEventListener("click", this.#onDocClick);
      document.addEventListener("mousemove", this.#onMouseMove);
    }

    this.opened = true;

    if (config.trigger instanceof HTMLElement) {
      if (config.triggerOpenClass) {
        config.trigger.classList.add(config.triggerOpenClass);
      }
    }

    this.#isAnimating = true;
    if (fromHide && this.#animationClass) {
      const { enterFrom, enterActive, enterTo } = this.#animationClass;
      if (config.onBeforeEnter) {
        config.onBeforeEnter();
      }
      this.popoverWrapper.classList.add(enterFrom);
      this.#showRaf = requestAnimationFrame(() => {
        this.popoverWrapper.classList.remove(enterFrom || "");
        this.popoverWrapper.classList.add(enterActive || "", enterTo || "");
        const transitionInfo = this.#getTransitionInfo(this.popoverWrapper);
        this.#clearShow = transitionInfo.clear;
        transitionInfo.promise.then(this.#onShowTransitionEnd);
      });
    } else {
      requestAnimationFrame(() => {
        this.#isAnimating = false;
      });
    }

    const computedPosition = getPosition({
      triggerElement: config.trigger,
      popoverElement: this.popoverRoot,
      arrowElement: this.arrowElement,
      appendToElement: config.appendTo,
      placement: config.placement ? config.placement : PlacementType.Top,
      margin: config.margin,
    });

    const { placement, left: x, top: y, arrowLeft: arrowX, arrowTop: arrowY } = computedPosition;

    this.popoverWrapper.classList.remove(`placement-${this.#prevPlacement}`);
    this.popoverWrapper.classList.add(`placement-${placement}`);

    if (this.#animationClass && placement !== this.#prevPlacement) {
      if (this.#prevPlacement) {
        this.popoverWrapper.classList.remove(`${config.animationClass}-${this.#prevPlacement}`);
      }
      this.popoverWrapper.classList.add(`${config.animationClass}-${placement}`);
    }

    this.#prevPlacement = placement;

    $setStyle(this.popoverRoot, { transform: `translate3d(${x}px,${y}px,0)` });
    $showElementByOpacity(this.popoverRoot);

    if (config.showArrow && this.arrowElement) {
      $setStyle(this.arrowElement, { transform: `translate(${arrowX}px,${arrowY}px)` });
    }

    if (fromHide && config.onOpen) {
      config.onOpen();
    }
  }

  /**
   * Close the Popover instance.
   */
  close() {
    const { trigger, triggerOpenClass, onBeforeExit, onClose } = this.config;
    this.closed = true;

    if (this.#isAnimating || !this.opened) {
      return;
    }

    this.opened = false;

    if (this.#animationClass) {
      const { exitFrom, exitActive, exitTo } = this.#animationClass;
      if (onBeforeExit) {
        onBeforeExit();
      }
      this.popoverWrapper.classList.add(exitFrom);
      this.#isAnimating = true;
      this.#hideRaf = requestAnimationFrame(() => {
        this.popoverWrapper.classList.remove(exitFrom || "");
        this.popoverWrapper.classList.add(exitActive || "", exitTo || "");
        const transitionInfo = this.#getTransitionInfo(this.popoverWrapper);
        this.#clearHide = transitionInfo.clear;
        transitionInfo.promise.then(this.#onHideTransitionEnd);
      });
    } else {
      this.#hidePopover();
    }

    if (triggerOpenClass) {
      trigger.classList.remove(triggerOpenClass);
    }

    this.#removeScrollEvent();
    this.#removeDocClick();
    this.#removeMouseMove();
    if (onClose) {
      onClose();
    }
  }

  /**
   * Open the popover after `config.openDelay` time.
   */
  openWithDelay() {
    this.#clearTimers();
    const { openDelay } = this.config;
    if (openDelay) {
      this.#openTimer = setTimeout(() => {
        this.open();
      }, openDelay);
    } else {
      this.open();
    }
  }

  /**
   * Close the popover after `config.closeDelay` time.
   */
  closeWithDelay() {
    this.#clearTimers();
    const { closeDelay } = this.config;
    if (closeDelay) {
      this.#closeTimer = setTimeout(() => {
        this.close();
      }, closeDelay);
    } else {
      this.close();
    }
  }

  /**
   * Update
   */
  update() {
    if (this.opened && !this.#isAnimating) {
      this.open();
    }
  }

  /**
   * Update config
   * @param config
   */
  updateConfig(newConfig: Partial<PopoverConfig>) {
    const { trigger, triggerOpenClass, appendTo } = this.config;

    function getChangedAttrs<T extends Record<string, any>>(
      newV: Partial<T>,
      oldV: Partial<T>,
      updateOld = false,
    ) {
      const patch: [keyof T, Partial<T>[keyof T], Partial<T>[keyof T]][] = [];
      Object.keys(newV).forEach((x: keyof T) => {
        if (newV[x] !== oldV[x]) {
          patch.push([x, newV[x], oldV[x]]);
          if (updateOld) {
            oldV[x] = newV[x];
          }
        }
      });
      return patch;
    }

    const changedAttrs = getChangedAttrs(newConfig, this.config, true);

    if (!changedAttrs.length) {
      return;
    }

    changedAttrs.forEach(([k, n, o]) => {
      // k: key, n: new,  o：old
      switch (k) {
        case "trigger":
          {
            this.#removeTriggerEvent(o as HTMLElement);
            if (triggerOpenClass) {
              (o as Element).classList.remove(triggerOpenClass);
            }
            if (this.#resizeObserver) {
              this.#resizeObserver.unobserve(o as HTMLElement);
              this.#resizeObserver.observe(n as HTMLElement);
            }
            this.#addTriggerEvent();
            if (this.opened && triggerOpenClass) {
              (o as Element).classList.add(triggerOpenClass);
            }

            const need = this.#needListenScroll();
            if (need) {
              if (!this.#scrollElements) {
                this.#scrollElements = this.#getScrollElements(trigger, appendTo!);
              }
            } else if (this.#scrollElements) {
              this.#removeScrollEvent();
              this.#scrollElements = undefined;
            }
          }
          break;

        case "content":
          this.popoverContent.removeChild(o as HTMLElement);
          if (n instanceof HTMLElement) {
            this.popoverContent.appendChild(n);
          } else {
            this.popoverContent.innerHTML = (n || "").toString();
          }
          break;

        case "showArrow":
          if (n) {
            this.arrowElement = this.arrowElement || this.#createArrow();
            this.popoverWrapper.appendChild(this.arrowElement);
          } else {
            if (this.arrowElement && this.popoverWrapper.contains(this.arrowElement)) {
              this.popoverWrapper.removeChild(this.arrowElement);
            }
            this.arrowElement = undefined;
          }
          break;

        case "appendTo":
          if ((o as HTMLElement).contains(this.popoverRoot)) {
            (o as HTMLElement).removeChild(this.popoverRoot);
          }
          if (!n || !(n instanceof HTMLElement)) {
            this.config.appendTo = document.body;
          }
          this.config.appendTo = n as HTMLElement;
          if (this.#resizeObserver) {
            this.#resizeObserver.unobserve(o as HTMLElement);
            this.#resizeObserver.observe(n as HTMLElement);
          }
          break;

        case "emit":
          this.#removeTriggerEvent();
          if (n) {
            this.#addTriggerEvent();
          }
          this.#removePopRootEvent();
          this.#addPopRootEvent();
          this.#removeMouseMove();
          break;

        case "autoUpdate":
          if (n) {
            if (!this.#resizeObserver) {
              this.#observe();
            }
          } else if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = undefined;
          }
          break;

        case "enterable":
          this.#removePopRootEvent();
          if (n) {
            this.#addPopRootEvent();
          }
          this.#removeMouseMove();
          break;

        case "closeOnScroll":
          {
            const need = this.#needListenScroll();
            if (need) {
              if (!this.#scrollElements) {
                this.#scrollElements = this.#getScrollElements(trigger as HTMLElement, appendTo!);
                if (this.opened) {
                  this.#scrollElements?.forEach((e) => {
                    e.addEventListener("scroll", this.#onScroll, { passive: true });
                  });
                }
              }
            } else if (this.#scrollElements) {
              this.#removeScrollEvent();
              this.#scrollElements = undefined;
            }
          }
          break;

        case "triggerOpenClass":
          if (this.opened) {
            if (o) {
              (trigger as Element).classList.remove(o as string);
            }
            if (n) {
              (trigger as Element).classList.add(n as string);
            }
          }
          break;

        case "animationClass":
          this.#setAnimationClass();
          break;

        case "disabled":
          if (n) this.disable();
          break;
      }
    });

    this.update();
  }

  /**
   * Toggle the Popover instance open or close.
   */
  toggle() {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Enable
   */
  enable() {
    this.config.disabled = false;
  }

  /**
   * Disable and close popover.
   */
  disable() {
    this.config.disabled = true;
    this.close();
  }

  /**
   * Destroy the Popover instance.
   */
  destroy() {
    const { appendTo } = this.config;
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = undefined;
    }
    if (this.opened) {
      if (appendTo?.contains(this.popoverRoot)) {
        appendTo?.removeChild(this.popoverRoot);
      }
      $setStyle(this.popoverRoot, { transform: "" });
    }

    cancelAnimationFrame(this.#showRaf!);
    cancelAnimationFrame(this.#hideRaf!);

    this.opened = false;
    this.closed = true;
    this.#isAnimating = false;
    this.#clearShow?.();
    this.#clearHide?.();
    this.#removeScrollEvent();
    this.#removeDocClick();
    this.#removeTriggerEvent();
    this.#removePopRootEvent();
    this.#removeMouseMove();
  }

  /**
   * Remove existing popovers
   */
  cleanup() {
    const popovers = document.querySelectorAll(`#${NextPopoverId}`);
    Array.from(popovers).forEach((pop) => {
      if (pop.parentElement) {
        pop.parentElement?.removeChild(pop);
      }
    });
  }

  #getConfig(config: PopoverConfig) {
    const cfg = {
      ...DefaultConfig,
      ...config,
    };
    if (!cfg.appendTo) {
      cfg.appendTo = document.body;
    }
    return cfg;
  }

  #createPopover() {
    const { content, appendTo, wrapperClass, showArrow } = this.config;

    // Positioning Element
    this.popoverRoot = $({
      tagName: "div",
      attributes: {
        id: NextPopoverId,
      },
    });

    // Popover wrapper
    this.popoverWrapper = $({
      tagName: "div",
      attributes: {
        class: `${WrapperClassName}${wrapperClass ? ` ${wrapperClass}` : ""}`,
      },
    });
    this.popoverRoot.appendChild(this.popoverWrapper);

    // Popover mounted elements
    if (appendTo && appendTo !== document.body) {
      $setStyle(appendTo, { position: "relative" });
    }

    if (showArrow) {
      this.arrowElement = this.#createArrow();
      this.popoverWrapper.appendChild(this.arrowElement);
    }

    // Popover content
    this.popoverContent = $({
      tagName: "div",
      attributes: {
        class: ContentClassName,
      },
    });
    if (content instanceof HTMLElement) {
      this.popoverContent.appendChild(content);
    } else {
      this.popoverContent.innerHTML = content.toString();
    }
    this.popoverWrapper.appendChild(this.popoverContent);
  }

  #createArrow() {
    return $({
      tagName: "div",
      attributes: { class: ArrowClass },
    });
  }

  #showPopover() {
    const { appendTo } = this.config;
    appendTo!.appendChild(this.popoverRoot);
  }

  #hidePopover() {
    const { appendTo } = this.config;
    if (appendTo?.contains(this.popoverRoot)) {
      appendTo!.removeChild(this.popoverRoot);
    }
    $setStyle(this.popoverRoot, { transform: "" });
  }

  #setAnimationClass() {
    const { animationClass } = this.config;
    this.#animationClass = animationClass
      ? {
          enterFrom: `${animationClass}-enter-from`,
          enterActive: `${animationClass}-enter-active`,
          enterTo: `${animationClass}-enter-to`,
          exitFrom: `${animationClass}-exit-from`,
          exitActive: `${animationClass}-exit-active`,
          exitTo: `${animationClass}-exit-to`,
        }
      : undefined;
  }

  #onTriggerClick = () => {
    if (this.opened) {
      this.closeWithDelay();
    } else {
      this.openWithDelay();
    }
  };

  #onTriggerEnter = () => {
    this.#clearTimers();
    if (this.#isAnimating) {
      this.closed = false;
    }
    if (this.opened) {
      return;
    }
    this.openWithDelay();
  };

  #onTriggerLeave = (event: MouseEvent) => {
    const { emit, enterable, margin } = this.config;

    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const interactiveBoundary = this.#getPopInteractiveBoundary({
        popElement: this.popoverRoot,
        placement: this.#prevPlacement as PlacementType,
        margin: margin || 0,
      });
      const isHoverOver = this.#isCursorInsideInteractiveBoundary(cursorXY, interactiveBoundary);
      if (isHoverOver) {
        return;
      }
    }

    if (this.#isAnimating) {
      this.closed = true;
    }
    this.closeWithDelay();
  };

  #addTriggerEvent() {
    const { trigger, emit } = this.config;
    if (trigger instanceof HTMLElement && emit) {
      if (emit === EmitType.Click) {
        trigger.addEventListener("click", this.#onTriggerClick);
      } else {
        trigger.addEventListener("mouseenter", this.#onTriggerEnter);
        trigger.addEventListener("mouseleave", this.#onTriggerLeave);
      }
    }
  }

  #removeTriggerEvent(element?: HTMLElement) {
    element = element || (this.config.trigger as HTMLElement);
    if (element instanceof HTMLElement) {
      element.removeEventListener("click", this.#onTriggerClick);
      element.removeEventListener("mouseenter", this.#onTriggerEnter);
      element.removeEventListener("mouseleave", this.#onTriggerLeave);
    }
  }

  #onPopRootEnter = () => {
    this.#clearTimers();
    if (this.#isAnimating) {
      this.closed = true;
    }
    if (this.opened || this.#isAnimating) {
      return;
    }
    this.openWithDelay();
  };

  #onPopRootLeave = (event: MouseEvent) => {
    const { emit, enterable, margin } = this.config;

    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const interactiveBoundary = this.#getPopInteractiveBoundary({
        popElement: this.popoverRoot,
        placement: this.#prevPlacement as PlacementType,
        margin: margin || 0,
      });
      const isHoverOver = this.#isCursorInsideInteractiveBoundary(cursorXY, interactiveBoundary);
      if (isHoverOver) {
        return;
      }
    }

    this.#clearTimers();
    if (this.#isAnimating) {
      this.closed = true;
    }
    this.closeWithDelay();
  };

  #addPopRootEvent() {
    const { enterable, emit } = this.config;
    if (enterable && emit === EmitType.Hover) {
      this.popoverRoot.addEventListener("mouseenter", this.#onPopRootEnter);
      this.popoverRoot.addEventListener("mouseleave", this.#onPopRootLeave);
    }
  }

  #removePopRootEvent() {
    this.popoverRoot.removeEventListener("mouseenter", this.#onPopRootEnter);
    this.popoverRoot.removeEventListener("mouseleave", this.#onPopRootLeave);
  }

  #onScroll = throttle(() => {
    if (this.config.closeOnScroll) {
      this.close();
    } else {
      this.update();
    }
  });

  #removeScrollEvent() {
    this.#scrollElements?.forEach((e) => e.removeEventListener("scroll", this.#onScroll));
  }

  #onDocClick = ({ target }: MouseEvent) => {
    const { trigger, onClickOutside, clickOutsideClose } = this.config;

    if (onClickOutside || clickOutsideClose) {
      if (
        this.popoverWrapper?.contains(target as HTMLElement) ||
        (trigger instanceof HTMLElement && trigger.contains(target as HTMLElement))
      ) {
        return;
      }

      if (onClickOutside) {
        onClickOutside();
      }
      if (clickOutsideClose) {
        this.closeWithDelay();
      }
    }
  };

  #removeDocClick = () => {
    document.removeEventListener("click", this.#onDocClick);
  };

  #onMouseMove = (event: MouseEvent) => {
    const { emit, enterable, trigger, margin } = this.config;
    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const triggerBoundary = this.#getTrigInteractiveBoundary(trigger);
      const isHoverTrig = this.#isCursorInsideInteractiveBoundary(cursorXY, triggerBoundary);
      if (!isHoverTrig) {
        const popoverBoundary = this.#getPopInteractiveBoundary({
          popElement: this.popoverRoot,
          placement: this.#prevPlacement as PlacementType,
          margin: margin || 0,
        });
        const isHoverPop = this.#isCursorInsideInteractiveBoundary(cursorXY, popoverBoundary);
        if (!isHoverPop) {
          this.closeWithDelay();
        }
      }
    }
  };

  #removeMouseMove = () => {
    document.removeEventListener("mousemove", this.#onMouseMove);
  };

  #getTransitionInfo(element: HTMLElement) {
    const transitionDelays = $getStyleProperties(element, "transitionDelay");
    const transitionDurations = $getStyleProperties(element, "transitionDuration");
    const animationDelays = $getStyleProperties(element, "animationDelay");
    const animationDurations = $getStyleProperties(element, "animationDuration");

    function getTimeout(delays: string[], durations: string[]): number {
      const toMs = (s: string): number => {
        return Number(s.slice(0, -1).replace(",", ".")) * 1000;
      };
      while (delays.length < durations.length) {
        delays = delays.concat(delays);
      }
      return Math.max(...durations.map((d, i) => toMs(d) + toMs(delays[i])));
    }

    const transitionTimeout = getTimeout(transitionDelays, transitionDurations);
    const animationTimeout = getTimeout(animationDelays, animationDurations);

    const timeout = Math.max(transitionTimeout, animationTimeout);

    let event: undefined | string;
    if (timeout > 0) {
      event = transitionTimeout > animationTimeout ? "transitionend" : "animationend";
    }

    let clear: undefined | (() => void);

    const promise = new Promise((resolve) => {
      if (timeout) {
        const fn = () => {
          clear?.();
          resolve(null);
        };
        element.addEventListener(event!, fn);
        const timer = setTimeout(() => {
          clear?.();
          resolve(null);
        }, timeout + 2);
        clear = () => {
          clearTimeout(timer);
          element.removeEventListener(event!, fn);
        };
      } else {
        requestAnimationFrame(resolve);
      }
    });

    return {
      promise,
      clear,
    };
  }

  #onShowTransitionEnd = () => {
    const { onEntered } = this.config;
    const { enterActive, enterTo } = this.#animationClass || {};
    this.popoverWrapper.classList.remove(enterActive!, enterTo!);
    this.#isAnimating = false;
    if (onEntered) {
      onEntered();
    }
    if (this.closed) {
      this.closeWithDelay();
    }
  };

  #onHideTransitionEnd = () => {
    this.#hidePopover();
    const { exitActive, exitTo } = this.#animationClass || {};
    this.popoverWrapper.classList.remove(exitActive!, exitTo!);
    this.#isAnimating = false;
    const { onExited } = this.config;
    if (onExited) {
      onExited();
    }
    if (!this.closed) {
      this.openWithDelay();
    }
  };

  #needListenScroll() {
    const { trigger, appendTo } = this.config;
    return trigger instanceof HTMLElement && appendTo;
  }

  #getScrollElements(element: HTMLElement, appendTo: HTMLElement) {
    const scrollElements: HTMLElement[] = [];
    const isScrollElement = (el: HTMLElement) => {
      return el.scrollHeight > el.offsetHeight || el.scrollWidth > el.offsetWidth;
    };
    while (element instanceof HTMLElement && element !== appendTo) {
      if (isScrollElement(element)) {
        scrollElements.push(element);
      }
      element = element.parentElement!;
    }
    return scrollElements;
  }

  #getTrigInteractiveBoundary = (trigElement: HTMLElement) => {
    const trigElementCoords = $getAbsoluteCoords(trigElement);
    const left = trigElementCoords.left;
    const top = trigElementCoords.top;
    const bottom = trigElementCoords.bottom;
    const right = trigElementCoords.right;
    return {
      left: Math.trunc(left),
      top: Math.trunc(top),
      bottom: Math.trunc(bottom),
      right: Math.trunc(right),
    };
  };

  #getPopInteractiveBoundary = ({
    popElement,
    placement,
    margin = 0,
  }: {
    popElement: HTMLElement;
    placement: PlacementType;
    margin: number;
  }) => {
    const {
      Top,
      TopStart,
      TopEnd,
      Left,
      LeftStart,
      LeftEnd,
      Bottom,
      BottomStart,
      BottomEnd,
      Right,
      RightStart,
      RightEnd,
    } = PlacementType;
    const popElementCoords = $getAbsoluteCoords(popElement);
    let left = popElementCoords.left;
    let top = popElementCoords.top;
    let bottom = popElementCoords.bottom;
    let right = popElementCoords.right;

    if (placement === Top || placement === TopStart || placement === TopEnd) {
      bottom += margin;
    }

    if (placement === Bottom || placement === BottomStart || placement === BottomEnd) {
      top -= margin;
    }

    if (placement === Left || placement === LeftStart || placement === LeftEnd) {
      right += margin;
    }
    if (placement === Right || placement === RightStart || placement === RightEnd) {
      left -= margin;
    }
    return {
      left: Math.trunc(left),
      top: Math.trunc(top),
      bottom: Math.trunc(bottom),
      right: Math.trunc(right),
    };
  };

  #isCursorInsideInteractiveBoundary = (
    cursorXY: { x: number; y: number },
    interactiveBoundary: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    },
  ) => {
    const { x, y } = cursorXY;
    const { left, top, right, bottom } = interactiveBoundary;

    return x >= left && x <= right && y >= top && y <= bottom;
  };

  #observe() {
    const { trigger, appendTo } = this.config;
    const robs = (this.#resizeObserver = new ResizeObserver(() => this.update()));
    robs.observe(this.popoverWrapper);
    robs.observe(appendTo!);
    if (trigger instanceof HTMLElement) {
      robs.observe(trigger);
    }
  }

  #clearTimers = () => {
    clearTimeout(this.#openTimer);
    clearTimeout(this.#closeTimer);
  };
}
