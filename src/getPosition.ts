import { $getAbsoluteCoords, $setStyle } from "./utils";
import { PlacementType } from "./constant";

interface ParamProps {
  triggerElement: HTMLElement;
  popoverElement: HTMLElement;
  arrowElement?: HTMLElement;
  appendToElement?: HTMLElement;
  placement: PlacementType | "auto";
  margin?: number;
}

interface PositonResult {
  left: number;
  top: number;
  arrowLeft: number;
  arrowTop: number;
  placement: PlacementType;
}

// getm more visible sides
const getMoreVisibleSides = ($element: HTMLElement) => {
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
};

/**
 * compute popover position
 * @param {*} params
 * @returns {}
 */
export default function getPosition({
  // Trigger element
  triggerElement,
  // Popover element
  popoverElement,
  // Arrow icon in the popover
  arrowElement,
  // mount container for popover
  appendToElement = document.body,
  // Placement of popover(top, bottom, left, right, auto), default auto
  placement = "auto",
  // Space between popover and its trigger (in pixel), default 0
  margin = 0,
}: ParamProps): PositonResult {
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
    const moreVisibleSides = getMoreVisibleSides(triggerElement);
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
      top: triggerElementTop - (popoverElementTop + popoverElementHeight) - margin,
      left: triggerElementLeft - popoverElementLeft,
    },
    top: {
      top: triggerElementTop - (popoverElementTop + popoverElementHeight) - margin,
      left:
        triggerElementLeft +
        triggerElementWidth / 2 -
        (popoverElementLeft + popoverElementWidth / 2),
    },
    // top-right
    "top-end": {
      top: triggerElementTop - (popoverElementTop + popoverElementHeight) - margin,
      left: triggerElementLeft + triggerElementWidth - (popoverElementLeft + popoverElementWidth),
    },
    // bottom-left
    "bottom-start": {
      top: triggerElementTop + triggerElementHeight - popoverElementTop + margin,
      left: triggerElementLeft - popoverElementLeft,
    },
    bottom: {
      top: triggerElementTop + triggerElementHeight - popoverElementTop + margin,
      left:
        triggerElementLeft +
        triggerElementWidth / 2 -
        (popoverElementLeft + popoverElementWidth / 2),
    },
    // bottom-right
    "bottom-end": {
      top: triggerElementTop + triggerElementHeight - popoverElementTop + margin,
      left: triggerElementLeft + triggerElementWidth - (popoverElementLeft + popoverElementWidth),
    },
    // right-top
    "right-start": {
      top: triggerElementTop - popoverElementTop,
      left: triggerElementLeft + triggerElementWidth - popoverElementLeft + margin,
    },
    right: {
      top:
        triggerElementTop +
        triggerElementHeight / 2 -
        (popoverElementTop + popoverElementHeight / 2),
      left: triggerElementLeft + triggerElementWidth - popoverElementLeft + margin,
    },
    // right-bottom
    "right-end": {
      top: triggerElementTop + triggerElementHeight - (popoverElementTop + popoverElementHeight),
      left: triggerElementLeft + triggerElementWidth - popoverElementLeft + margin,
    },
    // left-top
    "left-start": {
      top: triggerElementTop - popoverElementTop,
      left: triggerElementLeft - popoverElementLeft - popoverElementWidth - margin,
    },
    left: {
      top:
        triggerElementTop +
        triggerElementHeight / 2 -
        (popoverElementTop + popoverElementHeight / 2),
      left: triggerElementLeft - popoverElementLeft - popoverElementWidth - margin,
    },
    // left-bottom
    "left-end": {
      top: triggerElementTop + triggerElementHeight - (popoverElementTop + popoverElementHeight),
      left: triggerElementLeft - popoverElementLeft - popoverElementWidth - margin,
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

  /**
   * Set arrow style
   */
  let arrowLeft = 0;
  let arrowTop = 0;
  if (arrowElement) {
    const fullLeft = left + popoverElementLeft;
    const fullTop = top + popoverElementTop;
    const triggerElementWidthCenter = triggerElementWidth / 2 + triggerElementLeft;
    const triggerElementHeightCenter = triggerElementHeight / 2 + triggerElementTop;
    const arrowWidthHalf = arrowElement.offsetWidth / 2;

    if (mainPlacement === "top" || mainPlacement === "bottom") {
      arrowLeft = triggerElementWidthCenter - fullLeft;
      if (inversePlacement) {
        arrowTop = mainPlacement === "top" ? 0 : popoverElementHeight;
      } else {
        arrowTop = mainPlacement === "top" ? popoverElementHeight : 0;
      }

      /** if arrow crossed left edge of popover element */
      if (arrowLeft < arrowWidthHalf) {
        arrowLeft = arrowWidthHalf;
      } else if (arrowLeft > popoverElementWidth - arrowWidthHalf) {
        /** if arrow crossed right edge of popover element */
        arrowLeft = popoverElementWidth - arrowWidthHalf;
      }
    } else if (mainPlacement === "left" || mainPlacement === "right") {
      arrowTop = triggerElementHeightCenter - fullTop;
      if (inversePlacement) {
        arrowLeft = mainPlacement === "left" ? 0 : popoverElementWidth;
      } else {
        arrowLeft = mainPlacement === "left" ? popoverElementWidth : 0;
      }

      /** if arrow crossed top edge of popover element */
      if (arrowTop < arrowWidthHalf) {
        arrowTop = arrowWidthHalf;
      } else if (arrowTop > popoverElementHeight - arrowWidthHalf) {
        /** if arrow crossed bottom edge of popover element */
        arrowTop = popoverElementHeight - arrowWidthHalf;
      }
    }
  }

  return {
    left,
    top,
    arrowLeft,
    arrowTop,
    placement,
  };
}
