/**
 * Jest environment polyfill: fills in browser APIs that jsdom lacks or implements unstably,
 * so the Popover component (ResizeObserver / rAF / transition computed styles) can run normally.
 */

// ResizeObserver: not implemented by jsdom
class ResizeObserverStub {
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe() {
    return;
  }
  unobserve() {
    return;
  }
  disconnect() {
    return;
  }
}

// rAF: wrap with setTimeout so it stays controllable under jest fake timers
const raf =
  (globalThis.requestAnimationFrame =
  window.requestAnimationFrame =
    (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number);
const caf = (id: number) => clearTimeout(id);

globalThis.requestAnimationFrame = raf;
globalThis.cancelAnimationFrame = caf;
window.requestAnimationFrame = raf;
window.cancelAnimationFrame = caf;

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// getComputedStyle: jsdom has incomplete support for transition/animation computed styles,
// fall back to "0s" so #getTransitionInfo resolves a 0 timeout (rAF branch)
const realGetComputedStyle = window.getComputedStyle.bind(window);
const transitionProps = new Set([
  "transitionDelay",
  "transitionDuration",
  "animationDelay",
  "animationDuration",
]);

window.getComputedStyle = ((elt: Element) => {
  const style = realGetComputedStyle(elt);
  return new Proxy(style, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && transitionProps.has(prop)) {
        const value = Reflect.get(target, prop, receiver);
        return value || "0s";
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}) as typeof window.getComputedStyle;
