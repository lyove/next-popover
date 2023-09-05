import type { EmitType, PlacementType } from "./constant";

export interface PopoverConfig {
  trigger: HTMLElement;
  content: HTMLElement | string | number;
  mountContainer?: HTMLElement;
  placement?: PlacementType;
  showArrow?: boolean;
  emit?: EmitType;
  autoUpdate?: boolean;
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
  enterable?: boolean;
  disabled?: boolean;
  clickOutsideClose?: boolean;
  closeOnScroll?: boolean;
  triggerOpenClass?: string;
  wrapperClass?: string;
  animationClass?: string;
  onBeforeEnter?: () => void;
  onEntered?: () => void;
  onBeforeExit?: () => void;
  onExited?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onClickOutside?: () => void;
}

export interface AnimationClass {
  enterFrom: string;
  enterActive: string;
  enterTo: string;
  exitFrom: string;
  exitActive: string;
  exitTo: string;
}
