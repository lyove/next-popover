import type { EmitType, PlacementType, ModeType } from "./constant";
import type Popover from "./popover";

export type RequireOneKey<T, K extends keyof T> = {
  [P in K]-?: T[P];
} & Omit<T, K>;

export type PopoverCallback = (popover?: Popover) => void;

export interface PopoverConfig {
  trigger: HTMLElement;
  content: HTMLElement | string | number;
  placement?: `${PlacementType}`;
  showArrow?: boolean;
  appendTo?: HTMLElement;
  mode?: `${ModeType}`;
  emit?: `${EmitType}`;
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
  offset?: number;
  enterable?: boolean;
  disabled?: boolean;
  clickOutsideClose?: boolean;
  closeOnScroll?: boolean;
  triggerOpenClass?: string;
  wrapperClass?: string;
  animationClass?: string;
  onBeforeEnter?: PopoverCallback;
  onEntered?: PopoverCallback;
  onBeforeExit?: PopoverCallback;
  onExited?: PopoverCallback;
  onOpen?: PopoverCallback;
  onClose?: PopoverCallback;
}

export interface AnimationClass {
  enterFrom: string;
  enterActive: string;
  enterTo: string;
  exitFrom: string;
  exitActive: string;
  exitTo: string;
}
