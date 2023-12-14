import type { RequireOneKey, PopoverConfig, AnimationClass } from "./type";
import {
  $,
  $setStyle,
  $getStyleProperties,
  $getScrollElements,
  $getAbsoluteCoords,
  $getCursorCoords,
  $getElementBoundary,
  $getMoreVisibleSides,
  enumToObjectArray,
  debounce,
  throttle,
} from "./utils";
import { EmitType, PlacementType } from "./constant";
import "./style/index.scss";

// popover classnames
const NextPopoverId = "next-popover";
const WrapperClassName = "popover-wrapper";
const ContentClassName = "popover-content";
const ArrowClass = "popover-arrow";

// Placement Array
const PlacementArray = enumToObjectArray(PlacementType);

// default config
const defaultConfig: Partial<PopoverConfig> = {
  placement: "top",
  showArrow: true,
  appendTo: document.body,
  emit: "click",
  animationClass: "fade",
  clickOutsideClose: true,
  enterable: true,
  openDelay: 50,
  closeDelay: 50,
  offset: 8,
};

/**
 * Popover
 * A lightweight smart javascript popover library
 */
export default class Popover {
  /* public fields */
  config!: RequireOneKey<PopoverConfig, "appendTo">;
  popoverRoot!: HTMLElement;
  popoverWrapper!: HTMLElement;
  popoverContent!: HTMLElement;
  arrowElement?: HTMLElement;
  opened = false;
  closed = true;

  /* private fields */
  #isAnimating = false;
  #animationClass?: AnimationClass;
  #prevPlacement?: `${PlacementType}`;
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
    this.config = {
      ...defaultConfig,
      ...config,
      appendTo: config.appendTo || document.body,
    };
    const { trigger, content } = this.config;
    if (
      !(trigger instanceof HTMLElement) ||
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

  /**
   * Initialize
   */
  protected init() {
    const { trigger, appendTo, defaultOpen } = this.config;

    // create popover
    this.#createPopover();

    // auto update
    this.#observe();

    // add event
    this.#addTriggerEvent();
    this.#addPopRootEvent();

    // set animation
    this.#setAnimationClass();

    // listen scroll
    this.#scrollElements = $getScrollElements(trigger as HTMLElement, appendTo);

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
    const {
      trigger,
      triggerOpenClass,
      animationClass,
      appendTo,
      placement,
      offset,
      onBeforeEnter,
      onOpen,
    } = this.config;

    if (config.disabled || this.opened || !this.closed || this.#isAnimating) {
      return;
    }

    if (typeof onBeforeEnter === "function") {
      onBeforeEnter();
    }

    this.cleanup();

    this.closed = false;
    this.#isAnimating = true;

    if (trigger instanceof HTMLElement) {
      if (triggerOpenClass) {
        trigger.classList.add(triggerOpenClass);
      }
    }

    this.popoverWrapper.classList.add(`placement-${placement}`);
    this.#showPopover();

    if (this.#animationClass) {
      const { enterFrom, enterActive, enterTo } = this.#animationClass;
      this.popoverWrapper.classList.add(enterFrom);
      this.#showRaf = requestAnimationFrame(() => {
        this.popoverWrapper.classList.remove(enterFrom || "");
        this.popoverWrapper.classList.add(enterActive || "", enterTo || "");
        const transitionInfo = this.#getTransitionInfo(this.popoverWrapper);
        this.#clearShow = transitionInfo.clear;
        transitionInfo.promise.then(this.#onShowTransitionEnd);
      });
    } else {
      this.#onShowTransitionEnd();
    }

    const computedPosition = this.#getPopoverPosition({
      triggerElement: trigger,
      popoverElement: this.popoverRoot,
      appendToElement: appendTo,
      placement: placement ? placement : PlacementType.Top,
      offset: offset,
    });

    const { placement: position, left: x, top: y } = computedPosition;

    // remove all placement class
    PlacementArray.forEach(({ key, value }) => {
      this.popoverWrapper.classList.remove(`placement-${value}`);
    });

    this.popoverWrapper.classList.add(`placement-${position}`);

    if (this.#animationClass && position !== this.#prevPlacement) {
      if (this.#prevPlacement) {
        this.popoverWrapper.classList.remove(`${animationClass}-${this.#prevPlacement}`);
      }
      this.popoverWrapper.classList.add(`${animationClass}-${position}`);
    }

    this.#prevPlacement = position;

    $setStyle(this.popoverRoot, {
      transform: `translate3d(${x}px,${y}px,0)`,
      opacity: "1",
      pointerEvents: "auto",
    });

    document.addEventListener("click", this.#onDocClick);
    document.addEventListener("mousemove", this.#onMouseMove);
    this.#scrollElements?.forEach((e) => {
      e.addEventListener("scroll", this.#onScroll, { passive: true });
    });

    this.opened = true;

    if (typeof onOpen === "function") {
      onOpen();
    }
  }

  /**
   * Close the Popover instance.
   */
  close() {
    const { trigger, triggerOpenClass, onBeforeExit, onClose, onExited } = this.config;

    if (this.closed || !this.opened || this.#isAnimating) {
      return;
    }

    if (typeof onBeforeExit === "function") {
      onBeforeExit();
    }

    this.opened = false;
    this.#isAnimating = true;

    if (this.#animationClass) {
      const { exitFrom, exitActive, exitTo } = this.#animationClass;
      this.popoverWrapper.classList.add(exitFrom);
      this.#hideRaf = requestAnimationFrame(() => {
        this.popoverWrapper.classList.remove(exitFrom || "");
        this.popoverWrapper.classList.add(exitActive || "", exitTo || "");
        const transitionInfo = this.#getTransitionInfo(this.popoverWrapper);
        this.#clearHide = transitionInfo.clear;
        transitionInfo.promise.then(this.#onHideTransitionEnd);
      });
    } else {
      trigger.classList.remove(triggerOpenClass!);

      this.#hidePopover();
      this.#removeScrollEvent();
      this.#removeDocClick();
      this.#removeMouseMove();

      this.closed = true;
      this.#isAnimating = false;

      if (onClose) {
        onClose();
      }

      if (onExited) {
        onExited();
      }
    }
  }

  /**
   * Open the popover after `config.openDelay` time.
   */
  openWithDelay() {
    const { openDelay } = this.config;
    this.#clearTimers();
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
      const { trigger, animationClass, appendTo, placement, offset } = this.config;
      const computedPosition = this.#getPopoverPosition({
        triggerElement: trigger,
        popoverElement: this.popoverRoot,
        appendToElement: appendTo,
        placement: placement ? placement : PlacementType.Top,
        offset: offset,
      });
      const { placement: position, left: x, top: y } = computedPosition;

      // remove all placement class
      PlacementArray.forEach(({ key, value }) => {
        this.popoverWrapper.classList.remove(`placement-${value}`);
      });
      this.popoverWrapper.classList.add(`placement-${position}`);

      if (this.#animationClass && position !== this.#prevPlacement) {
        if (this.#prevPlacement) {
          this.popoverWrapper.classList.remove(`${animationClass}-${this.#prevPlacement}`);
        }
        this.popoverWrapper.classList.add(`${animationClass}-${position}`);
      }

      this.#prevPlacement = position;

      $setStyle(this.popoverRoot, {
        transform: `translate3d(${x}px,${y}px,0)`,
        opacity: "1",
        pointerEvents: "auto",
      });
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

            if (!this.#scrollElements) {
              this.#scrollElements = $getScrollElements(trigger, appendTo);
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

        case "enterable":
          this.#removePopRootEvent();
          if (n) {
            this.#addPopRootEvent();
          }
          this.#removeMouseMove();
          break;

        case "closeOnScroll":
          {
            if (!this.#scrollElements) {
              this.#scrollElements = $getScrollElements(trigger as HTMLElement, appendTo);
              if (this.opened) {
                this.#scrollElements?.forEach((e) => {
                  e.addEventListener("scroll", this.#onScroll, { passive: true });
                });
              }
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
      if (appendTo.contains(this.popoverRoot)) {
        appendTo.removeChild(this.popoverRoot);
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

  /**
   * Popover class private field
   */

  #createPopover() {
    const { content, appendTo, wrapperClass, showArrow } = this.config;

    // Positioning Element
    this.popoverRoot = $({
      tagName: "div",
      attributes: {
        id: NextPopoverId,
      },
    });
    $setStyle(this.popoverRoot, {
      opacity: "0",
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
    if (appendTo !== document.body) {
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
    appendTo.appendChild(this.popoverRoot);
  }

  #hidePopover() {
    const { appendTo } = this.config;
    if (appendTo.contains(this.popoverRoot)) {
      appendTo.removeChild(this.popoverRoot);
    }
    $setStyle(this.popoverRoot, { transform: "" });
  }

  #getPopoverPosition({
    // Trigger element
    triggerElement,
    // Popover element
    popoverElement,
    // mount container for popover
    appendToElement = document.body,
    // Placement of popover(top, bottom, left, right, auto), default auto
    placement = "auto",
    // Space between popover and its trigger (in pixel), default 0
    offset = 0,
  }: {
    triggerElement: HTMLElement;
    popoverElement: HTMLElement;
    appendToElement?: HTMLElement;
    placement: `${PlacementType}` | "auto";
    offset?: number;
  }) {
    // init
    if (!triggerElement || !popoverElement) {
      throw new Error("Couldn't initiate");
    }

    // reset popover style
    $setStyle(popoverElement, {
      transform: "",
    });

    // trigger Rect
    const triggerElementCoords = $getAbsoluteCoords(triggerElement);
    const triggerElementWidth = triggerElementCoords.width;
    const triggerElementHeight = triggerElementCoords.height;
    const triggerElementTop = triggerElementCoords.top;
    const triggerElementRight = triggerElementCoords.right;
    const triggerElementBottom = triggerElementCoords.bottom;
    const triggerElementLeft = triggerElementCoords.left;

    // popover Rect
    const popoverElementCoords = $getAbsoluteCoords(popoverElement);
    const popoverElementWidth = popoverElementCoords.width;
    const popoverElementHeight = popoverElementCoords.height;
    const popoverElementTop = popoverElementCoords.top;
    const popoverElementRight = popoverElementCoords.right;
    const popoverElementBotttom = popoverElementCoords.bottom;
    const popoverElementLeft = popoverElementCoords.left;

    // appendToElement Rect
    const appendToElementCoords = $getAbsoluteCoords(appendToElement);
    const appendToElementWidth = appendToElementCoords.width;
    const appendToElementHeight = appendToElementCoords.height;
    const appendToElementTop = appendToElementCoords.top;
    const appendToElementLeft = appendToElementCoords.left;

    /** find the placement which has more space */
    if (placement === "auto") {
      const moreVisibleSides = $getMoreVisibleSides(triggerElement);
      placement = moreVisibleSides.vertical as PlacementType;
    }

    // placements splitting
    const mainPlacement: string = placement.split("-")[0];
    const secondaryPlacement = placement.split("-")[1];

    // placements value
    const placementsValue: {
      [key: string]: {
        top: number;
        left: number;
      };
    } = {
      // top-left
      "top-start": {
        top: triggerElementTop - (popoverElementTop + popoverElementHeight) - offset,
        left: triggerElementLeft - popoverElementLeft,
      },
      top: {
        top: triggerElementTop - (popoverElementTop + popoverElementHeight) - offset,
        left:
          triggerElementLeft +
          triggerElementWidth / 2 -
          (popoverElementLeft + popoverElementWidth / 2),
      },
      // top-right
      "top-end": {
        top: triggerElementTop - (popoverElementTop + popoverElementHeight) - offset,
        left: triggerElementLeft + triggerElementWidth - (popoverElementLeft + popoverElementWidth),
      },
      // bottom-left
      "bottom-start": {
        top: triggerElementTop + triggerElementHeight - popoverElementTop + offset,
        left: triggerElementLeft - popoverElementLeft,
      },
      bottom: {
        top: triggerElementTop + triggerElementHeight - popoverElementTop + offset,
        left:
          triggerElementLeft +
          triggerElementWidth / 2 -
          (popoverElementLeft + popoverElementWidth / 2),
      },
      // bottom-right
      "bottom-end": {
        top: triggerElementTop + triggerElementHeight - popoverElementTop + offset,
        left: triggerElementLeft + triggerElementWidth - (popoverElementLeft + popoverElementWidth),
      },
      // right-top
      "right-start": {
        top: triggerElementTop - popoverElementTop,
        left: triggerElementLeft + triggerElementWidth - popoverElementLeft + offset,
      },
      right: {
        top:
          triggerElementTop +
          triggerElementHeight / 2 -
          (popoverElementTop + popoverElementHeight / 2),
        left: triggerElementLeft + triggerElementWidth - popoverElementLeft + offset,
      },
      // right-bottom
      "right-end": {
        top: triggerElementTop + triggerElementHeight - (popoverElementTop + popoverElementHeight),
        left: triggerElementLeft + triggerElementWidth - popoverElementLeft + offset,
      },
      // left-top
      "left-start": {
        top: triggerElementTop - popoverElementTop,
        left: triggerElementLeft - popoverElementLeft - popoverElementWidth - offset,
      },
      left: {
        top:
          triggerElementTop +
          triggerElementHeight / 2 -
          (popoverElementTop + popoverElementHeight / 2),
        left: triggerElementLeft - popoverElementLeft - popoverElementWidth - offset,
      },
      // left-bottom
      "left-end": {
        top: triggerElementTop + triggerElementHeight - (popoverElementTop + popoverElementHeight),
        left: triggerElementLeft - popoverElementLeft - popoverElementWidth - offset,
      },
    };

    // calculated left top style value
    let top = placementsValue[placement].top;
    let left = placementsValue[placement].left;

    // edge
    let topEdge = window.scrollY - popoverElementTop;
    let bottomEdge = window.innerHeight + topEdge;
    let leftEdge = window.scrollX - popoverElementLeft;
    let rightEdge = window.innerWidth + leftEdge;
    if (appendToElement !== document.body && appendToElement.contains(triggerElement)) {
      topEdge = appendToElementTop - popoverElementTop;
      bottomEdge = appendToElementHeight + topEdge;
      leftEdge = appendToElementLeft - popoverElementLeft;
      rightEdge = appendToElementWidth + leftEdge;
    }

    // inverse placement
    let inversePlacement;

    /* if popoverElement is hiding on left edge */
    if (left < leftEdge) {
      if (mainPlacement === "left") {
        inversePlacement = `right${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      } else if (leftEdge + popoverElementLeft > triggerElementRight) {
        /** if triggerElement is hiding on left edge */
        left = triggerElementRight - popoverElementLeft;
      } else {
        left = leftEdge;
      }
    } else if (left + popoverElementWidth > rightEdge) {
      /* if popoverElement is hiding on right edge */
      if (mainPlacement === "right") {
        inversePlacement = `left${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      } else if (rightEdge + popoverElementLeft < triggerElementLeft) {
        /** if triggerElement is hiding on right edge */
        left = triggerElementLeft - popoverElementRight;
      } else {
        left = rightEdge - popoverElementWidth;
      }
    }

    /* if popoverElement is hiding on top edge */
    if (top < topEdge) {
      if (mainPlacement === "top") {
        inversePlacement = `bottom${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      } else if (topEdge + popoverElementTop > triggerElementBottom) {
        /** if triggerElement is hiding on top edge */
        top = triggerElementBottom - popoverElementTop;
      } else {
        top = topEdge;
      }
    } else if (top + popoverElementHeight > bottomEdge) {
      /* if popoverElement is hiding on bottom edge */
      if (mainPlacement === "bottom") {
        inversePlacement = `top${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      } else if (bottomEdge + popoverElementTop < triggerElementTop) {
        /** if triggerElement is hiding on bottom edge */
        top = triggerElementTop - popoverElementBotttom;
      } else {
        top = bottomEdge - popoverElementHeight;
      }
    }

    /** if popover element is hidden in the given position, show it on opposite position */
    if (inversePlacement) {
      const inversePlacementValue = placementsValue[inversePlacement];
      placement = inversePlacement as PlacementType;

      if (mainPlacement === "top" || mainPlacement === "bottom") {
        top = inversePlacementValue.top;
      } else if (mainPlacement === "left" || mainPlacement === "right") {
        left = inversePlacementValue.left;
      }
    }

    return {
      left,
      top,
      placement,
    };
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

  #onTriggerEnter = debounce(() => {
    this.openWithDelay();
  }, 200);

  #onTriggerLeave = debounce((event: MouseEvent) => {
    const { emit, enterable, offset } = this.config;

    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const interactiveBoundary = this.#getPopoverEnterableBoundary({
        popElement: this.popoverRoot,
        placement: this.#prevPlacement as PlacementType,
        offset: offset || 0,
      });
      const isHoverOver = this.#isCursorInsideEnterableBoundary(cursorXY, interactiveBoundary);
      if (isHoverOver) {
        return;
      }
    }

    this.closeWithDelay();
  }, 200);

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

    if (this.opened || this.#isAnimating) {
      return;
    }

    this.openWithDelay();
  };

  #onPopRootLeave = (event: MouseEvent) => {
    const { emit, enterable, offset } = this.config;

    this.#clearTimers();

    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const interactiveBoundary = this.#getPopoverEnterableBoundary({
        popElement: this.popoverRoot,
        placement: this.#prevPlacement as PlacementType,
        offset: offset || 0,
      });
      const isHoverOver = this.#isCursorInsideEnterableBoundary(cursorXY, interactiveBoundary);
      if (isHoverOver) {
        return;
      }
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
  }, 300);

  #removeScrollEvent() {
    this.#scrollElements?.forEach((e) => e.removeEventListener("scroll", this.#onScroll));
  }

  #onDocClick = ({ target }: MouseEvent) => {
    const { trigger, clickOutsideClose } = this.config;

    if (clickOutsideClose) {
      if (
        this.popoverWrapper?.contains(target as HTMLElement) ||
        (trigger instanceof HTMLElement && trigger.contains(target as HTMLElement))
      ) {
        return;
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
    const { emit, enterable, trigger, offset } = this.config;
    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const triggerBoundary = $getElementBoundary(trigger);
      const isHoverTrig = this.#isCursorInsideEnterableBoundary(cursorXY, triggerBoundary);
      if (!isHoverTrig) {
        const popoverBoundary = this.#getPopoverEnterableBoundary({
          popElement: this.popoverRoot,
          placement: this.#prevPlacement as PlacementType,
          offset: offset || 0,
        });
        const isHoverPop = this.#isCursorInsideEnterableBoundary(cursorXY, popoverBoundary);
        if (!isHoverPop) {
          this.closeWithDelay();
        }
      }
    }
  };

  #removeMouseMove = () => {
    document.removeEventListener("mousemove", this.#onMouseMove);
  };

  #observe() {
    const { trigger, appendTo } = this.config;
    const robs = (this.#resizeObserver = new ResizeObserver(() => this.update()));
    robs.observe(this.popoverWrapper);
    robs.observe(appendTo);
    if (trigger instanceof HTMLElement) {
      robs.observe(trigger);
    }
  }

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
  };

  #onHideTransitionEnd = () => {
    const { trigger, triggerOpenClass, onClose, onExited } = this.config;
    const { exitActive, exitTo } = this.#animationClass || {};

    this.popoverWrapper.classList.remove(exitActive!, exitTo!);
    trigger.classList.remove(triggerOpenClass!);

    this.#hidePopover();

    this.#removeScrollEvent();
    this.#removeDocClick();
    this.#removeMouseMove();

    this.closed = true;
    this.#isAnimating = false;

    if (onClose) {
      onClose();
    }

    if (onExited) {
      onExited();
    }
  };

  #getPopoverEnterableBoundary = ({
    popElement,
    placement,
    offset = 0,
  }: {
    popElement: HTMLElement;
    placement: `${PlacementType}`;
    offset: number;
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
      bottom += offset;
    }

    if (placement === Bottom || placement === BottomStart || placement === BottomEnd) {
      top -= offset;
    }

    if (placement === Left || placement === LeftStart || placement === LeftEnd) {
      right += offset;
    }
    if (placement === Right || placement === RightStart || placement === RightEnd) {
      left -= offset;
    }
    return {
      left: Math.trunc(left),
      top: Math.trunc(top),
      bottom: Math.trunc(bottom),
      right: Math.trunc(right),
    };
  };

  #isCursorInsideEnterableBoundary = (
    cursorXY: { x: number; y: number },
    enterableBoundary: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    },
  ) => {
    const { x, y } = cursorXY;
    const { left, top, right, bottom } = enterableBoundary;

    return x >= left && x <= right && y >= top && y <= bottom;
  };

  #clearTimers = () => {
    clearTimeout(this.#openTimer);
    clearTimeout(this.#closeTimer);
  };
}
