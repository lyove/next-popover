/**
 * Function Utils
 */

export function throttle(fn: () => void, ctx?: any): any {
  let pending = false;
  let first = true;

  return function (...args: any) {
    if (first) {
      first = false;
      return fn.apply(ctx, args);
    }

    if (pending) {
      return;
    }

    pending = true;

    requestAnimationFrame(() => {
      fn.apply(ctx, args);
      pending = false;
    });
  };
}

export function throttleTime(fn: () => void, time = 0, ctx?: any) {
  let pending = false;
  let first = true;

  return function (...args: any) {
    if (first) {
      first = false;
      return fn.apply(ctx, args);
    }

    if (pending) {
      return;
    }

    pending = true;

    setTimeout(() => {
      fn.apply(ctx, args);
      pending = false;
    }, time);
  };
}
