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
  $getScrollbarSize,
  enumToObjectArray,
  debounce,
  throttle,
} from "./utils";
import { EmitType, PlacementType, ModeType, StatusType } from "./constant";
import "./style/popover.scss";

// popover classnames
const NextPopoverId = "next-popover";
const WrapperClassName = "popover-wrapper";
const ContentClassName = "popover-content";
const ArrowClassName = "popover-arrow";

// Placement Array
const PlacementArray = enumToObjectArray(PlacementType);

// default config
const defaultConfig: Partial<PopoverConfig> = {
  placement: PlacementType.Top,
  showArrow: true,
  appendTo: document.body,
  emit: EmitType.Click,
  mode: ModeType.Light,
  animationClass: "fade",
  clickOutsideClose: true,
  enterable: true,
  openDelay: 50,
  closeDelay: 50,
  offset: 16,
};

/**
 * Popover
 * A lightweight smart javascript popover library
 */
export default class Popover {
  /* public fields */
  config!: RequireOneKey<PopoverConfig, "appendTo">;
  triggerElement!: HTMLElement;
  popoverElement!: HTMLElement;
  arrowElement?: HTMLElement;
  status: StatusType | null = null;

  /* private fields */
  #animationClass?: AnimationClass;
  #prevPlacement?: `${PlacementType}`;
  #showRaf?: number;
  #hideRaf?: number;
  #clearShowTransition?: () => void;
  #clearHideTransition?: () => void;
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
      offset:
        config.offset && !isNaN(config.offset) && config.offset >= 8
          ? config.offset
          : defaultConfig.offset,
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
    } else if (content instanceof HTMLElement) {
      this.config.content = content.cloneNode(true) as HTMLElement;
    }

    this.init();
  }

  /**
   * Initialize
   */
  protected init() {
    const { trigger, appendTo, defaultOpen } = this.config;

    this.triggerElement = trigger;

    // create popover
    this.#createPopover();

    // auto update
    this.#observe();

    // add event
    this.#addTriggerEvent();
    this.#addPopoverEvent();

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
    const { popoverWrapper } = this.#getPopoverChildren();

    if (
      config.disabled ||
      this.status === StatusType.Opening ||
      this.status === StatusType.Opened ||
      this.status === StatusType.Closing
    ) {
      return;
    }

    if (typeof onBeforeEnter === "function") {
      onBeforeEnter(this);
    }

    this.cleanup();

    // status
    this.status = StatusType.Opening;

    if (triggerOpenClass) {
      trigger.classList.add(triggerOpenClass);
    }
    popoverWrapper?.classList.add(`placement__${placement}`);

    this.#appendPopover();

    if (this.#animationClass) {
      const { enterFrom, enterActive, enterTo } = this.#animationClass;
      popoverWrapper?.classList.add(enterFrom);
      this.#showRaf = requestAnimationFrame(() => {
        popoverWrapper?.classList.remove(enterFrom || "");
        popoverWrapper?.classList.add(enterActive || "", enterTo || "");
        const transitionInfo = this.#getTransitionInfo(popoverWrapper);
        this.#clearShowTransition = transitionInfo.clear;
        transitionInfo.promise.then(this.#onShowTransitionEnd);
      });
    } else {
      this.#onShowTransitionEnd();
    }

    const computedPosition = this.#getPopoverPosition({
      triggerElement: trigger,
      popoverElement: this.popoverElement,
      arrowElement: this.arrowElement || null,
      appendToElement: appendTo,
      placement: placement ? placement : PlacementType.Top,
      offset: offset,
    });

    const { placement: realPlacement, left: x, top: y, arrowLeft, arrowTop } = computedPosition;

    // remove all placement class
    PlacementArray.forEach(({ value }) => {
      popoverWrapper?.classList.remove(`placement__${value}`);
    });

    popoverWrapper?.classList.add(`placement__${realPlacement}`);

    if (this.#animationClass && realPlacement !== this.#prevPlacement) {
      if (this.#prevPlacement) {
        popoverWrapper?.classList.remove(`${animationClass}__${this.#prevPlacement}`);
      }
      popoverWrapper?.classList.add(`${animationClass}__${realPlacement}`);
    }

    this.#prevPlacement = realPlacement;

    $setStyle(this.popoverElement, {
      transform: `translate(${x}px,${y}px)`,
      opacity: "1",
      pointerEvents: "auto",
    });

    if (this.arrowElement && this.arrowElement instanceof HTMLElement) {
      $setStyle(this.arrowElement, {
        position: "absolute",
        left: `${arrowLeft}px`,
        top: `${arrowTop}px`,
      });
    }

    document.addEventListener("click", this.#onDocClick);
    document.addEventListener("mousemove", this.#onMouseMove);
    this.#scrollElements?.forEach((e) => {
      e.addEventListener("scroll", this.#onScroll, { passive: true });
    });

    this.status = StatusType.Opened;

    if (typeof onOpen === "function") {
      onOpen(this);
    }
  }

  /**
   * Close the Popover instance.
   */
  close() {
    const { trigger, triggerOpenClass, onBeforeExit, onClose, onExited } = this.config;
    const { popoverWrapper } = this.#getPopoverChildren();

    if (this.status !== StatusType.Opened) {
      return;
    }

    if (typeof onBeforeExit === "function") {
      onBeforeExit(this);
    }

    // status
    this.status = StatusType.Closing;

    if (this.#animationClass) {
      const { exitFrom, exitActive, exitTo } = this.#animationClass;
      popoverWrapper?.classList.add(exitFrom);
      this.#hideRaf = requestAnimationFrame(() => {
        popoverWrapper?.classList.remove(exitFrom || "");
        popoverWrapper?.classList.add(exitActive || "", exitTo || "");
        const transitionInfo = this.#getTransitionInfo(popoverWrapper);
        this.#clearHideTransition = transitionInfo.clear;
        transitionInfo.promise.then(this.#onHideTransitionEnd);
      });
    } else {
      if (triggerOpenClass) {
        trigger.classList.remove(triggerOpenClass);
      }

      this.#subtractPopover();
      this.#removeScrollEvent();
      this.#removeDocClick();
      this.#removeMouseMove();

      // status
      this.status = StatusType.Closed;

      if (onClose) {
        onClose(this);
      }

      if (onExited) {
        onExited(this);
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
    if (this.status === StatusType.Opened) {
      const { trigger, animationClass, appendTo, placement, offset } = this.config;
      const { popoverWrapper } = this.#getPopoverChildren();
      const computedPosition = this.#getPopoverPosition({
        triggerElement: trigger,
        popoverElement: this.popoverElement,
        arrowElement: this.arrowElement || null,
        appendToElement: appendTo,
        placement: placement ? placement : PlacementType.Top,
        offset: offset,
      });
      const { placement: realPlacement, left: x, top: y, arrowLeft, arrowTop } = computedPosition;

      // remove all placement class
      PlacementArray.forEach(({ value }) => {
        popoverWrapper?.classList.remove(`placement__${value}`);
      });
      popoverWrapper?.classList.add(`placement__${realPlacement}`);

      if (this.#animationClass && realPlacement !== this.#prevPlacement) {
        if (this.#prevPlacement) {
          popoverWrapper?.classList.remove(`${animationClass}__${this.#prevPlacement}`);
        }
        popoverWrapper?.classList.add(`${animationClass}__${realPlacement}`);
      }

      this.#prevPlacement = realPlacement;

      $setStyle(this.popoverElement, {
        transform: `translate(${x}px,${y}px)`,
        opacity: "1",
        pointerEvents: "auto",
      });

      if (this.arrowElement && this.arrowElement instanceof HTMLElement) {
        $setStyle(this.arrowElement, {
          position: "absolute",
          left: `${arrowLeft}px`,
          top: `${arrowTop}px`,
        });
      }
    }
  }

  /**
   * Update config
   * @param config
   */
  updateConfig(newConfig: Partial<PopoverConfig>) {
    const { trigger, triggerOpenClass, appendTo } = this.config;
    const { popoverWrapper, popoverContent } = this.#getPopoverChildren();

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
            if (this.status === StatusType.Opened && triggerOpenClass) {
              (o as Element).classList.add(triggerOpenClass);
            }

            if (!this.#scrollElements) {
              this.#scrollElements = $getScrollElements(trigger, appendTo);
            }
          }
          break;

        case "content":
          popoverContent?.removeChild(o as HTMLElement);
          if (n instanceof HTMLElement) {
            popoverContent?.appendChild(n);
          } else {
            popoverContent.innerHTML = (n || "").toString();
          }
          break;

        case "showArrow":
          if (n) {
            this.arrowElement = this.arrowElement || this.#createArrow();
            popoverWrapper?.appendChild(this.arrowElement);
          } else {
            if (this.arrowElement && popoverWrapper?.contains(this.arrowElement)) {
              popoverWrapper?.removeChild(this.arrowElement);
            }
            this.arrowElement = undefined;
          }
          break;

        case "appendTo":
          if ((o as HTMLElement).contains(this.popoverElement)) {
            (o as HTMLElement).removeChild(this.popoverElement);
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
          this.#removePopoverEvent();
          this.#addPopoverEvent();
          this.#removeMouseMove();
          break;

        case "mode":
          popoverWrapper.classList.remove(`mode__${o}`);
          popoverWrapper.classList.add(`mode__${n}`);
          break;

        case "enterable":
          this.#removePopoverEvent();
          if (n) {
            this.#addPopoverEvent();
          }
          this.#removeMouseMove();
          break;

        case "closeOnScroll":
          {
            if (!this.#scrollElements) {
              this.#scrollElements = $getScrollElements(trigger as HTMLElement, appendTo);
              if (this.status === StatusType.Opened) {
                this.#scrollElements?.forEach((e) => {
                  e.addEventListener("scroll", this.#onScroll, { passive: true });
                });
              }
            }
          }
          break;

        case "triggerOpenClass":
          if (this.status === StatusType.Opened) {
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
    if (this.status === StatusType.Opened) {
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

    if (this.status === StatusType.Opened) {
      if (appendTo.contains(this.popoverElement)) {
        appendTo.removeChild(this.popoverElement);
      }
      $setStyle(this.popoverElement, { transform: "" });
    }

    cancelAnimationFrame(this.#showRaf!);
    cancelAnimationFrame(this.#hideRaf!);

    this.#clearShowTransition?.();
    this.#clearHideTransition?.();
    this.#removeScrollEvent();
    this.#removeDocClick();
    this.#removeTriggerEvent();
    this.#removePopoverEvent();
    this.#removeMouseMove();

    // status
    this.status = null;
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
    const { content, appendTo, wrapperClass, showArrow, mode } = this.config;

    // Positioning Element
    this.popoverElement = $({
      tagName: "div",
      attributes: {
        id: NextPopoverId,
      },
    });
    $setStyle(this.popoverElement, {
      position: "absolute",
      left: 0,
      top: 0,
      opacity: 0,
    });

    // Popover wrapper
    const popoverWrapper = $({
      tagName: "div",
      attributes: {
        class: `${WrapperClassName}${wrapperClass ? ` ${wrapperClass}` : ""} ${
          mode === ModeType.Dark ? `mode__${mode}` : `mode__${ModeType.Light}`
        }`,
      },
    });

    // Popover mounted elements
    if (appendTo !== document.body) {
      $setStyle(appendTo, { position: "relative" });
    }

    // Arrow
    if (showArrow) {
      this.arrowElement = this.#createArrow();
      popoverWrapper.appendChild(this.arrowElement);
    }

    // Popover content
    const popoverContent = $({
      tagName: "div",
      attributes: {
        class: ContentClassName,
      },
    });
    if (content instanceof HTMLElement) {
      popoverContent.appendChild(content);
    } else {
      popoverContent.innerHTML = content.toString();
    }
    popoverWrapper.appendChild(popoverContent);

    this.popoverElement.appendChild(popoverWrapper);
  }

  #createArrow() {
    const arrowElement = $({
      tagName: "div",
      attributes: { class: ArrowClassName },
    });
    $setStyle(arrowElement, {
      position: "absolute",
      left: 0,
      top: 0,
    });
    arrowElement.appendChild(
      $({
        tagName: "div",
        attributes: { class: `${ArrowClassName}-inner` },
      }),
    );
    return arrowElement;
  }

  #appendPopover() {
    const { appendTo } = this.config;
    appendTo.appendChild(this.popoverElement);
  }

  #subtractPopover() {
    const { appendTo } = this.config;
    if (appendTo.contains(this.popoverElement)) {
      appendTo.removeChild(this.popoverElement);
    }
    $setStyle(this.popoverElement, { transform: "" });
  }

  #getPopoverChildren() {
    const { popoverElement } = this;
    const popoverWrapper = popoverElement?.querySelector(`.${WrapperClassName}`) as HTMLElement;
    const popoverContent = popoverWrapper?.querySelector(`.${ContentClassName}`) as HTMLElement;
    const popoverArrow = popoverWrapper?.querySelector(`.${ArrowClassName}`) as HTMLElement;
    return {
      popoverWrapper,
      popoverContent,
      popoverArrow,
    };
  }

  #getPopoverPosition({
    // Trigger element
    triggerElement,
    // Popover element
    popoverElement,
    // Arrow element
    arrowElement,
    // mount container for popover
    appendToElement = document.body,
    // Placement of popover(top, bottom, left, right, auto), default auto
    placement = "auto",
    // Space between popover and its trigger (in pixel), default 0
    offset = 0,
  }: {
    triggerElement: HTMLElement;
    popoverElement: HTMLElement;
    arrowElement?: HTMLElement | null;
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

    // clientWidth
    const clientWidth = document.body.clientWidth || document.documentElement.clientWidth;

    // scrollbar size
    const { width: scrollbarWidth } = $getScrollbarSize();

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
    const popoverElementBottom = popoverElementCoords.bottom;
    const popoverElementLeft = popoverElementCoords.left;

    // arrow Rect
    const arrowElementCoords =
      arrowElement instanceof HTMLElement ? $getAbsoluteCoords(arrowElement) : null;
    const arrowElementWidth = arrowElementCoords?.width || 0;
    const arrowElementHeight = arrowElementCoords?.height || 0;

    // appendToElement Rect
    const appendToElementCoords = $getAbsoluteCoords(appendToElement);
    const appendToElementWidth = appendToElementCoords.width;
    const appendToElementHeight = appendToElementCoords.height;
    const appendToElementTop = appendToElementCoords.top;
    const appendToElementRight = appendToElementCoords.right;
    const appendToElementBottom = appendToElementCoords.bottom;
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
        arrowTop: number;
        arrowLeft: number;
      };
    } = {
      // top-left
      "top-start": {
        top: triggerElementTop - popoverElementBottom - offset,
        left: triggerElementLeft - popoverElementLeft,
        arrowTop: popoverElementHeight,
        arrowLeft:
          popoverElementWidth < triggerElementWidth / 2
            ? popoverElementWidth / 2 - arrowElementWidth / 2
            : triggerElementWidth / 2 - arrowElementWidth / 2,
      },
      // top
      top: {
        top: triggerElementTop - popoverElementBottom - offset,
        left:
          triggerElementLeft +
          triggerElementWidth / 2 -
          (popoverElementLeft + popoverElementWidth / 2),
        arrowTop: popoverElementHeight,
        arrowLeft: popoverElementWidth / 2 - arrowElementWidth / 2,
      },
      // top-right
      "top-end": {
        top: triggerElementTop - popoverElementBottom - offset,
        left: triggerElementRight - popoverElementRight,
        arrowTop: popoverElementHeight,
        arrowLeft:
          popoverElementWidth < triggerElementWidth / 2
            ? popoverElementWidth / 2 - arrowElementWidth / 2
            : popoverElementWidth - triggerElementWidth / 2 - arrowElementWidth / 2,
      },
      // bottom-left
      "bottom-start": {
        top: triggerElementBottom - popoverElementTop + offset,
        left: triggerElementLeft - popoverElementLeft,
        arrowTop: -arrowElementHeight,
        arrowLeft:
          popoverElementWidth < triggerElementWidth / 2
            ? popoverElementWidth / 2 - arrowElementWidth / 2
            : triggerElementWidth / 2 - arrowElementWidth / 2,
      },
      // bottom
      bottom: {
        top: triggerElementBottom - popoverElementTop + offset,
        left:
          triggerElementLeft +
          triggerElementWidth / 2 -
          (popoverElementLeft + popoverElementWidth / 2),
        arrowTop: -arrowElementHeight,
        arrowLeft: popoverElementWidth / 2 - arrowElementWidth / 2,
      },
      // bottom-right
      "bottom-end": {
        top: triggerElementBottom - popoverElementTop + offset,
        left: triggerElementRight - popoverElementRight,
        arrowTop: -arrowElementHeight,
        arrowLeft:
          popoverElementWidth < triggerElementWidth / 2
            ? popoverElementWidth / 2 - arrowElementWidth / 2
            : popoverElementWidth - triggerElementWidth / 2 - arrowElementWidth / 2,
      },
      // right-top
      "right-start": {
        top: triggerElementTop - popoverElementTop,
        left: triggerElementRight - popoverElementLeft + offset,
        arrowTop:
          popoverElementHeight < triggerElementHeight
            ? popoverElementHeight / 2 - arrowElementHeight / 2
            : triggerElementHeight / 2 - arrowElementHeight / 2,
        arrowLeft: -arrowElementWidth,
      },
      // right
      right: {
        top:
          triggerElementTop +
          triggerElementHeight / 2 -
          (popoverElementTop + popoverElementHeight / 2),
        left: triggerElementRight - popoverElementLeft + offset,
        arrowTop: popoverElementHeight / 2 - arrowElementHeight / 2,
        arrowLeft: -arrowElementWidth,
      },
      // right-bottom
      "right-end": {
        top: triggerElementBottom - popoverElementBottom,
        left: triggerElementRight - popoverElementLeft + offset,
        arrowTop:
          popoverElementHeight < triggerElementHeight
            ? popoverElementHeight / 2 - arrowElementHeight / 2
            : popoverElementHeight - triggerElementHeight / 2 - arrowElementHeight / 2,
        arrowLeft: -arrowElementWidth,
      },
      // left-top
      "left-start": {
        top: triggerElementTop - popoverElementTop,
        left: triggerElementLeft - popoverElementLeft - popoverElementWidth - offset,
        arrowTop:
          popoverElementHeight < triggerElementHeight
            ? popoverElementHeight / 2 - arrowElementHeight / 2
            : triggerElementHeight / 2 - arrowElementHeight / 2,
        arrowLeft: popoverElementWidth,
      },
      // left
      left: {
        top:
          triggerElementTop +
          triggerElementHeight / 2 -
          (popoverElementTop + popoverElementHeight / 2),
        left: triggerElementLeft - popoverElementLeft - popoverElementWidth - offset,
        arrowTop: popoverElementHeight / 2 - arrowElementHeight / 2,
        arrowLeft: popoverElementWidth,
      },
      // left-bottom
      "left-end": {
        top: triggerElementBottom - popoverElementBottom,
        left: triggerElementLeft - popoverElementLeft - popoverElementWidth - offset,
        arrowTop:
          popoverElementHeight < triggerElementHeight
            ? popoverElementHeight / 2 - arrowElementHeight / 2
            : popoverElementHeight - triggerElementHeight / 2 - arrowElementHeight / 2,
        arrowLeft: popoverElementWidth,
      },
    };

    // calculated left top style value
    let top = placementsValue[placement].top;
    let left = placementsValue[placement].left;
    let arrowLeft = placementsValue[placement].arrowLeft;
    let arrowTop = placementsValue[placement].arrowTop;

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
      }
      if (leftEdge + popoverElementLeft > triggerElementRight) {
        /** if triggerElement is hiding on left edge */
        left = triggerElementRight - popoverElementLeft;
      } else {
        left = leftEdge;
      }

      // arrow placement value
      if (mainPlacement === "top" || mainPlacement === "bottom") {
        const vertical_edge = triggerElementLeft - appendToElementLeft;
        if (vertical_edge < 0) {
          if (
            popoverElementWidth > triggerElementWidth / 2 ||
            (popoverElementWidth <= triggerElementWidth / 2 &&
              triggerElementWidth + vertical_edge < popoverElementWidth)
          ) {
            arrowLeft = (triggerElementWidth + vertical_edge) / 2 - arrowElementWidth / 2;
          }
        } else {
          arrowLeft = triggerElementWidth / 2 + vertical_edge - arrowElementWidth / 2;
        }
      }
    } else if (left + popoverElementWidth > rightEdge) {
      /* if popoverElement is hiding on right edge */
      if (mainPlacement === "right") {
        inversePlacement = `left${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      }
      if (rightEdge + popoverElementLeft < triggerElementLeft) {
        /** if triggerElement is hiding on right edge */
        left = triggerElementLeft - popoverElementRight;
      } else {
        left = rightEdge - popoverElementWidth;
      }

      // arrow placement value
      if (mainPlacement === "top" || mainPlacement === "bottom") {
        const vertical_edge = triggerElementRight - appendToElementRight;
        if (vertical_edge > 0) {
          if (
            popoverElementWidth > triggerElementWidth / 2 ||
            (popoverElementWidth <= triggerElementWidth / 2 &&
              popoverElementWidth + vertical_edge > triggerElementWidth)
          ) {
            arrowLeft =
              popoverElementWidth -
              (triggerElementWidth - vertical_edge) / 2 -
              arrowElementWidth / 2;
          }
        } else {
          arrowLeft =
            popoverElementWidth - (triggerElementWidth / 2 - vertical_edge) - arrowElementWidth / 2;
        }
      }
    }

    /* if popoverElement is hiding on top edge */
    if (top < topEdge) {
      if (mainPlacement === "top") {
        inversePlacement = `bottom${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      }
      if (topEdge + popoverElementTop > triggerElementBottom) {
        /** if triggerElement is hiding on top edge */
        top = triggerElementBottom - popoverElementTop;
      } else {
        top = topEdge;
      }

      // arrow placement value
      if (mainPlacement === "left" || mainPlacement === "right") {
        const horizontal_edge = triggerElementTop - appendToElementTop;
        if (horizontal_edge < 0) {
          if (
            popoverElementHeight > triggerElementHeight / 2 ||
            (popoverElementHeight <= triggerElementHeight / 2 &&
              triggerElementHeight + horizontal_edge < popoverElementHeight)
          ) {
            arrowTop = (triggerElementHeight + horizontal_edge) / 2 - arrowElementHeight / 2;
          }
        } else {
          arrowTop = triggerElementHeight / 2 + horizontal_edge - arrowElementHeight / 2;
        }
      }
    } else if (top + popoverElementHeight > bottomEdge) {
      /* if popoverElement is hiding on bottom edge */
      if (mainPlacement === "bottom") {
        inversePlacement = `top${secondaryPlacement ? `-${secondaryPlacement}` : ""}`;
      }
      if (bottomEdge + popoverElementTop < triggerElementTop) {
        /** if triggerElement is hiding on bottom edge */
        top = triggerElementTop - popoverElementBottom;
      } else {
        top = bottomEdge - popoverElementHeight;
      }

      // arrow placement value
      if (mainPlacement === "left" || mainPlacement === "right") {
        const horizontal_edge = triggerElementBottom - appendToElementBottom;
        if (horizontal_edge > 0) {
          if (
            popoverElementHeight > triggerElementHeight / 2 ||
            (popoverElementHeight <= triggerElementHeight / 2 &&
              popoverElementHeight + horizontal_edge > triggerElementHeight)
          ) {
            arrowTop =
              popoverElementHeight -
              (triggerElementHeight - horizontal_edge) / 2 -
              arrowElementHeight / 2;
          }
        } else {
          arrowTop =
            popoverElementHeight -
            (triggerElementHeight / 2 - horizontal_edge) -
            arrowElementHeight / 2;
        }
      }
    }

    /** if popover element is hidden in the given position, show it on opposite position */
    if (inversePlacement) {
      const inversePlacementValue = placementsValue[inversePlacement];
      placement = inversePlacement as PlacementType;

      if (mainPlacement === "top" || mainPlacement === "bottom") {
        top = inversePlacementValue.top;
        arrowTop = inversePlacementValue.arrowTop;
      } else if (mainPlacement === "left" || mainPlacement === "right") {
        left = inversePlacementValue.left;
        arrowLeft = inversePlacementValue.arrowLeft;
      }
    }

    // If there is a scrollbar on the page
    if (popoverElementWidth + left > clientWidth) {
      left = left - scrollbarWidth;
    }

    const right = left + popoverElementWidth;
    const bottom = top + popoverElementHeight;

    return {
      left,
      top,
      right,
      bottom,
      arrowLeft,
      arrowTop,
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

  #onClickTrigger = () => {
    if (this.status === StatusType.Opened) {
      this.closeWithDelay();
    } else {
      this.openWithDelay();
    }
  };

  #onMouseEnterTrigger = debounce(() => {
    this.openWithDelay();
  }, 200);

  #onMouseLeaveTrigger = debounce((event: MouseEvent) => {
    const { emit, enterable, offset } = this.config;
    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const popoverBoundary = this.#getPopoverEnterableBoundary({
        popElement: this.popoverElement,
        placement: this.#prevPlacement as PlacementType,
        offset: offset || 0,
      });
      const isHoverPopover = this.#isCursorInsideEnterableBoundary(cursorXY, popoverBoundary);
      if (isHoverPopover) {
        return;
      }
    }

    this.closeWithDelay();
  }, 200);

  #addTriggerEvent() {
    const { trigger, emit } = this.config;
    if (trigger instanceof HTMLElement && emit) {
      if (emit === EmitType.Click) {
        trigger.addEventListener("click", this.#onClickTrigger);
      } else {
        trigger.addEventListener("mouseenter", this.#onMouseEnterTrigger);
        trigger.addEventListener("mouseleave", this.#onMouseLeaveTrigger);
      }
    }
  }

  #removeTriggerEvent(element?: HTMLElement) {
    element = element || (this.config.trigger as HTMLElement);
    if (element instanceof HTMLElement) {
      element.removeEventListener("click", this.#onClickTrigger);
      element.removeEventListener("mouseenter", this.#onMouseEnterTrigger);
      element.removeEventListener("mouseleave", this.#onMouseLeaveTrigger);
    }
  }

  #onMouseEnterPopover = () => {
    this.#clearTimers();

    if (
      this.status === StatusType.Opened ||
      this.status === StatusType.Opening ||
      this.status === StatusType.Closing
    ) {
      return;
    }

    this.openWithDelay();
  };

  #onMouseLeavePopover = (event: MouseEvent) => {
    const { trigger, emit, enterable, offset } = this.config;

    this.#clearTimers();

    if (emit === EmitType.Hover && enterable) {
      const cursorXY = $getCursorCoords(event);
      const triggerBoundary = $getElementBoundary(trigger);
      const popoverBoundary = this.#getPopoverEnterableBoundary({
        popElement: this.popoverElement,
        placement: this.#prevPlacement as PlacementType,
        offset: offset || 0,
      });
      const isHoverTrigger = this.#isCursorInsideEnterableBoundary(cursorXY, triggerBoundary);
      const isHoverPopover = this.#isCursorInsideEnterableBoundary(cursorXY, popoverBoundary);
      if (isHoverTrigger || isHoverPopover) {
        return;
      }
    }

    this.closeWithDelay();
  };

  #addPopoverEvent() {
    const { enterable, emit } = this.config;
    if (enterable && emit === EmitType.Hover) {
      this.popoverElement.addEventListener("mouseenter", this.#onMouseEnterPopover);
      this.popoverElement.addEventListener("mouseleave", this.#onMouseLeavePopover);
    }
  }

  #removePopoverEvent() {
    this.popoverElement.removeEventListener("mouseenter", this.#onMouseEnterPopover);
    this.popoverElement.removeEventListener("mouseleave", this.#onMouseLeavePopover);
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
    const { popoverWrapper } = this.#getPopoverChildren();

    if (clickOutsideClose) {
      if (
        popoverWrapper?.contains(target as HTMLElement) ||
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
      const isHoverTrigger = this.#isCursorInsideEnterableBoundary(cursorXY, triggerBoundary);
      if (!isHoverTrigger) {
        const popoverBoundary = this.#getPopoverEnterableBoundary({
          popElement: this.popoverElement,
          placement: this.#prevPlacement as PlacementType,
          offset: offset || 0,
        });
        const isHoverPopover = this.#isCursorInsideEnterableBoundary(cursorXY, popoverBoundary);
        if (!isHoverPopover) {
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
    const { popoverWrapper } = this.#getPopoverChildren();
    const robs = (this.#resizeObserver = new ResizeObserver(() => this.update()));
    robs.observe(popoverWrapper);
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
    const { popoverWrapper } = this.#getPopoverChildren();
    const { enterActive, enterTo } = this.#animationClass || {};
    popoverWrapper?.classList.remove(enterActive!, enterTo!);

    if (onEntered) {
      onEntered(this);
    }
  };

  #onHideTransitionEnd = () => {
    const { trigger, triggerOpenClass, onClose, onExited } = this.config;
    const { popoverWrapper } = this.#getPopoverChildren();
    const { exitActive, exitTo } = this.#animationClass || {};

    popoverWrapper?.classList.remove(exitActive!, exitTo!);
    trigger.classList.remove(triggerOpenClass!);

    this.#subtractPopover();

    this.#removeScrollEvent();
    this.#removeDocClick();
    this.#removeMouseMove();

    // status
    this.status = StatusType.Closed;

    if (onClose) {
      onClose(this);
    }

    if (onExited) {
      onExited(this);
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
