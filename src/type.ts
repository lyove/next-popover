import type { EmitType, PlacementType } from "./constant";

export type RequireOneKey<T, K extends keyof T> = {
  [P in K]-?: T[P];
} & Omit<T, K>;

export interface PopoverConfig {
  trigger: HTMLElement;
  content: HTMLElement | string | number;
  placement?: `${PlacementType}`;
  showArrow?: boolean;
  appendTo?: HTMLElement;
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
  onBeforeEnter?: () => void;
  onEntered?: () => void;
  onBeforeExit?: () => void;
  onExited?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface AnimationClass {
  enterFrom: string;
  enterActive: string;
  enterTo: string;
  exitFrom: string;
  exitActive: string;
  exitTo: string;
}
