import { $getScrollbarSize, throttle } from "../src/utils";

describe("utils 工具函数", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("throttle", () => {
    it("首调立即执行，间隔内合并，到期尾随执行", async () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttled = throttle(fn, 300);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1); // leading
      await jest.advanceTimersByTimeAsync(299);
      expect(fn).toHaveBeenCalledTimes(1); // not fired within the interval
      await jest.advanceTimersByTimeAsync(2);
      expect(fn).toHaveBeenCalledTimes(2); // trailing
    });

    it("超过间隔后的新调用立即执行", async () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      throttled();
      await jest.advanceTimersByTimeAsync(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("第三参作为执行上下文传入", () => {
      const ctx = { count: 0 };
      const fn = function (this: { count: number }) {
        this.count++;
      };
      const throttled = throttle(fn as () => void, 0, ctx);
      throttled();
      expect(ctx.count).toBe(1);
    });
  });

  describe("$getScrollbarSize", () => {
    it("结果按窗口缓存，多次调用返回同一对象", () => {
      const a = $getScrollbarSize();
      const b = $getScrollbarSize();
      expect(a).toBe(b);
    });
  });
});
