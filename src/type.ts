import type { EmitType, PlacementType, ModeType } from "./constant";

export type RequireOneKey<T, K extends keyof T> = {
  [P in K]-?: T[P];
} & Omit<T, K>;

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
  onBeforeEnter?: (t?: any) => void;
  onEntered?: (t?: any) => void;
  onBeforeExit?: (t?: any) => void;
  onExited?: (t?: any) => void;
  onOpen?: (t?: any) => void;
  onClose?: (t?: any) => void;
}

export interface AnimationClass {
  enterFrom: string;
  enterActive: string;
  enterTo: string;
  exitFrom: string;
  exitActive: string;
  exitTo: string;
}
