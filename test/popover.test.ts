import Popover, { PlacementType, EmitType, StatusType } from "../src";

describe("Popover 组件核心行为", () => {
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = `<button id="t">trigger</button>`;
    trigger = document.getElementById("t") as HTMLButtonElement;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.useRealTimers();
  });

  const getPopoverEl = () => document.querySelector('[id^="next-popover"]') as HTMLElement | null;

  it("open() 挂载 DOM、状态置为 opened、placement 类正确", () => {
    const p = new Popover({
      trigger,
      content: "hello",
      placement: PlacementType.Top,
      emit: EmitType.Click,
    });
    p.open();
    expect(p.status).toBe(StatusType.Opened);
    const el = getPopoverEl();
    expect(el).toBeTruthy();
    // In jsdom every rect is 0, so the edge-flip logic may turn top into bottom;
    // assert a placement__-prefixed class exists instead (the flip itself is correct behavior)
    const wrapperClassList = (el as HTMLElement).querySelector(".popover-wrapper") as HTMLElement;
    expect(Array.from(wrapperClassList.classList).some((c) => c.startsWith("placement__"))).toBe(
      true,
    );
    expect(
      ((el as HTMLElement).querySelector(".popover-content") as HTMLElement).innerHTML,
    ).toContain("hello");
    p.destroy();
    expect(getPopoverEl()).toBeNull();
  });

  it("close() 走退出动画后移除 DOM 并置 Closed", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x" });
    p.open();
    expect(p.status).toBe(StatusType.Opened);
    p.close();
    expect(p.status).toBe(StatusType.Closing);
    await jest.advanceTimersByTimeAsync(50);
    expect(p.status).toBe(StatusType.Closed);
    expect(getPopoverEl()).toBeNull();
    p.destroy();
  });

  it("toggle() 在打开/关闭间切换", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x" });
    p.toggle();
    expect(p.status).toBe(StatusType.Opened);
    p.toggle();
    expect(p.status).toBe(StatusType.Closing);
    await jest.advanceTimersByTimeAsync(50);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  it("updateConfig 字符串→字符串不抛错且内容更新", () => {
    const p = new Popover({ trigger, content: "hello", emit: EmitType.Click });
    p.open();
    expect(() => p.updateConfig({ content: "world" })).not.toThrow();
    expect((p.popoverElement.querySelector(".popover-content") as HTMLElement).innerHTML).toBe(
      "world",
    );
    p.destroy();
  });

  it("updateConfig 元素→元素正常替换", () => {
    const divA = document.createElement("div");
    divA.textContent = "A";
    const p = new Popover({ trigger, content: divA, emit: EmitType.Click });
    p.open();
    const divB = document.createElement("div");
    divB.textContent = "B";
    p.updateConfig({ content: divB });
    expect((p.popoverElement.querySelector(".popover-content") as HTMLElement).innerHTML).toContain(
      "B",
    );
    p.destroy();
  });

  it("updateConfig 字符串→元素正常替换", () => {
    const p = new Popover({ trigger, content: "text", emit: EmitType.Click });
    p.open();
    const div = document.createElement("div");
    div.textContent = "elem";
    p.updateConfig({ content: div });
    expect((p.popoverElement.querySelector(".popover-content") as HTMLElement).innerHTML).toContain(
      "elem",
    );
    p.destroy();
  });

  it("offset: 0 与小于 8 的正值不被静默改写", () => {
    const p = new Popover({ trigger, content: "x", offset: 0 });
    expect(p.config.offset).toBe(0);
    p.destroy();
    const p2 = new Popover({ trigger, content: "x", offset: 4 });
    expect(p2.config.offset).toBe(4);
    p2.destroy();
  });

  it("offset 非法值（负数）回退默认 16", () => {
    const p = new Popover({ trigger, content: "x", offset: -5 });
    expect(p.config.offset).toBe(16);
    p.destroy();
  });

  it("click 触发打开/关闭（含 openDelay/closeDelay）", async () => {
    jest.useFakeTimers();
    const p = new Popover({
      trigger,
      content: "x",
      emit: EmitType.Click,
      openDelay: 50,
      closeDelay: 50,
    });
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(60);
    expect(p.status).toBe(StatusType.Opened);
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // close timer(50ms) + the animation rAF chain; leave enough headroom on the timeline
    await jest.advanceTimersByTimeAsync(200);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  it("destroy() 清理 DOM、事件与状态", () => {
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
    p.open();
    expect(getPopoverEl()).toBeTruthy();
    p.destroy();
    expect(getPopoverEl()).toBeNull();
    expect(p.status).toBeNull();
  });

  it("disable() 后 open() 不生效", () => {
    const p = new Popover({ trigger, content: "x" });
    p.disable();
    p.open();
    expect(p.status).not.toBe(StatusType.Opened);
    expect(getPopoverEl()).toBeNull();
    p.destroy();
  });

  it("trigger 为非法类型时抛出 Invalid configuration", () => {
    expect(() => new Popover({ trigger: null as unknown as HTMLElement, content: "x" })).toThrow(
      "Invalid configuration",
    );
  });

  // ---------- P1 regression: multi-instance exclusivity ----------

  it("多实例互斥：B 打开时 A 被完整关闭（状态/动画/DOM 同步）", async () => {
    jest.useFakeTimers();
    const t2 = document.createElement("button");
    t2.id = "t2";
    document.body.appendChild(t2);
    const a = new Popover({ trigger, content: "A", emit: EmitType.Click });
    const b = new Popover({ trigger: t2, content: "B", emit: EmitType.Click });
    a.open();
    expect(a.status).toBe(StatusType.Opened);
    b.open();
    // A must run the full close flow (not be left with stale state after a brutal removeChild)
    expect(b.status).toBe(StatusType.Opened);
    expect(a.status).toBe(StatusType.Closing);
    await jest.advanceTimersByTimeAsync(100);
    expect(a.status).toBe(StatusType.Closed);
    expect(document.body.contains(a.popoverElement)).toBe(false);
    expect(document.body.contains(b.popoverElement)).toBe(true);
    a.destroy();
    b.destroy();
    t2.remove();
  });

  it("cleanup() 关闭其他实例而非删除全部 DOM", async () => {
    jest.useFakeTimers();
    const t2 = document.createElement("button");
    t2.id = "t2";
    document.body.appendChild(t2);
    const a = new Popover({ trigger, content: "A", emit: EmitType.Click });
    const b = new Popover({ trigger: t2, content: "B", emit: EmitType.Click });
    a.open();
    b.open();
    await jest.advanceTimersByTimeAsync(100);
    expect(a.status).toBe(StatusType.Closed);
    expect(b.status).toBe(StatusType.Opened);
    a.destroy();
    b.destroy();
    t2.remove();
  });

  // ---------- P1 regression: destroy state machine ----------

  it("onBeforeEnter 中 destroy() 后 open() 不再继续（DOM 不挂载）", () => {
    const p = new Popover({
      trigger,
      content: "x",
      onBeforeEnter() {
        p.destroy();
      },
    });
    p.open();
    expect(p.status).toBeNull();
    expect(getPopoverEl()).toBeNull();
  });

  it("Opening 态（defaultOpen + 异步 open）destroy 也能清理 DOM", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", defaultOpen: true });
    // defaultOpen opens asynchronously via rAF; destroy may hit Opening or unmounted state
    p.destroy();
    jest.runOnlyPendingTimers();
    expect(getPopoverEl()).toBeNull();
    expect(p.status).toBeNull();
  });

  // ---------- P1 regression: updateConfig switching ----------

  it("updateConfig 更换 trigger：triggerOpenClass 绑定到新元素", () => {
    const t2 = document.createElement("button");
    t2.id = "t2";
    document.body.appendChild(t2);
    const p = new Popover({
      trigger,
      content: "x",
      emit: EmitType.Click,
      triggerOpenClass: "is-open",
    });
    p.open();
    expect(trigger.classList.contains("is-open")).toBe(true);
    p.updateConfig({ trigger: t2 });
    expect(trigger.classList.contains("is-open")).toBe(false);
    expect(t2.classList.contains("is-open")).toBe(true);
    p.destroy();
    t2.remove();
  });

  it("updateConfig 更换 trigger：事件跟随新元素（点击新 trigger 可关闭）", async () => {
    jest.useFakeTimers();
    const t2 = document.createElement("button");
    t2.id = "t2";
    document.body.appendChild(t2);
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
    p.open();
    p.updateConfig({ trigger: t2 });
    t2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(300);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
    t2.remove();
  });

  it("updateConfig 更换 appendTo：打开状态下重新挂载到新容器", () => {
    const mount = document.createElement("div");
    mount.id = "mount";
    document.body.appendChild(mount);
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
    p.open();
    expect(p.popoverElement.parentElement).toBe(document.body);
    p.updateConfig({ appendTo: mount });
    expect(p.popoverElement.parentElement).toBe(mount);
    p.destroy();
    mount.remove();
  });

  // ---------- P1 regression: emit switching ----------

  it("emit 从 click 切到 hover：光标移出后可触发关闭（mousemove 已挂载）", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click, enterable: true });
    p.open();
    p.updateConfig({ emit: EmitType.Hover });
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 9999, clientY: 9999, bubbles: true }),
    );
    await jest.advanceTimersByTimeAsync(300);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  it("emit 从 hover 切到 click：mousemove 不再触发关闭", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover, enterable: true });
    p.open();
    p.updateConfig({ emit: EmitType.Click });
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 9999, clientY: 9999, bubbles: true }),
    );
    await jest.advanceTimersByTimeAsync(100);
    expect(p.status).toBe(StatusType.Opened);
    p.destroy();
  });

  // ---------- P2 regression: a11y ----------

  it("打开后设置 role/aria-expanded/aria-describedby，关闭后同步", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
    p.open();
    expect(p.popoverElement.getAttribute("role")).toBe("tooltip");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBe(p.popoverElement.id);
    p.close();
    await jest.advanceTimersByTimeAsync(100);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    p.destroy();
  });

  it("ESC 关闭：打开态按 Escape 后走完整关闭流程", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
    p.open();
    expect(p.status).toBe(StatusType.Opened);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(p.status).toBe(StatusType.Closing);
    await jest.advanceTimersByTimeAsync(100);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  it("destroy 后清理 aria 属性", () => {
    const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
    p.open();
    p.destroy();
    expect(trigger.hasAttribute("aria-expanded")).toBe(false);
    expect(trigger.hasAttribute("aria-describedby")).toBe(false);
  });

  // ---------- P2 regression: content clone consistency ----------

  it("updateConfig 切换元素 content：挂载克隆而非搬走原节点（可被多实例复用）", () => {
    const shared = document.createElement("div");
    shared.id = "shared-content";
    shared.textContent = "shared";
    const t2 = document.createElement("button");
    document.body.appendChild(t2);
    const p1 = new Popover({ trigger, content: shared, emit: EmitType.Click });
    const p2 = new Popover({ trigger: t2, content: "other", emit: EmitType.Click });
    p2.open();
    p2.updateConfig({ content: shared });
    // the content area mounts a clone: it contains an element with the same id, but not the original node
    const cloned = p2.popoverElement.querySelector("#shared-content");
    expect(cloned).not.toBeNull();
    expect(cloned).not.toBe(shared);
    // the original node was not moved away
    expect(shared.parentElement).toBeNull();
    p1.destroy();
    p2.destroy();
    t2.remove();
  });

  // ---------- B1: cancellable pending-hide model ----------

  it("B1 越界后 mousemove 不重置隐藏定时器（光标持续移动仍会关闭）", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover, enterable: true });
    p.open();
    // first exit: start the closeDelay=200ms timer
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 9999, clientY: 9999, bubbles: true }),
    );
    // move again after 150ms (the old implementation reset the timer and never closed)
    await jest.advanceTimersByTimeAsync(150);
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 9998, clientY: 9998, bubbles: true }),
    );
    // 150+150=300 > 200 -> the timer fires
    await jest.advanceTimersByTimeAsync(150);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  it("B1 越界后光标回到安全区取消挂起隐藏", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover, enterable: true });
    p.open();
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 9999, clientY: 9999, bubbles: true }),
    );
    await jest.advanceTimersByTimeAsync(150);
    // cursor returns to the trigger (jsdom rects are all 0, so (0,0) is inside the boundary)
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0, bubbles: true }));
    await jest.advanceTimersByTimeAsync(300);
    expect(p.status).toBe(StatusType.Opened);
    p.destroy();
  });

  // ---------- B2/B4: directional delays ----------

  it("B2 hover 打开走 openDelay（默认 80ms，无硬编码 debounce）", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover });
    trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(p.status).toBeNull(); // 80ms not reached yet, open flow not started
    await jest.advanceTimersByTimeAsync(50);
    expect(p.status).toBeNull();
    await jest.advanceTimersByTimeAsync(50);
    expect(p.status).toBe(StatusType.Opened);
    p.destroy();
  });

  // ---------- B3: fast hide when enterable=false ----------

  it("B3 enterable=false：移出 trigger 立即关闭（不等 closeDelay）", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover, enterable: false });
    p.open();
    expect(p.status).toBe(StatusType.Opened);
    trigger.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(p.status).toBe(StatusType.Closing); // enters closing synchronously, no delay
    await jest.advanceTimersByTimeAsync(100);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  // ---------- B5: focus/blur keyboard reachability ----------

  it("B5 键盘可达：focus 打开、blur 关闭", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover });
    trigger.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(100);
    expect(p.status).toBe(StatusType.Opened);
    trigger.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(300);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  // ---------- B6: prefers-reduced-motion ----------

  it("B6 prefers-reduced-motion：跳过动画直接完成开/关", () => {
    const matchMediaMock = jest
      .fn()
      .mockReturnValue({ matches: true, media: "(prefers-reduced-motion: reduce)" });
    (window as unknown as { matchMedia?: unknown }).matchMedia = matchMediaMock;
    try {
      const p = new Popover({ trigger, content: "x", emit: EmitType.Click });
      p.open();
      expect(p.status).toBe(StatusType.Opened); // completed synchronously
      p.close();
      expect(p.status).toBe(StatusType.Closed); // completed synchronously
      p.destroy();
    } finally {
      delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    }
  });

  // ---------- B7: interactiveBorder boundary expansion ----------

  it("B7 interactiveBorder：popover 边缘外 5px 仍视为安全区（不触发隐藏）", async () => {
    jest.useFakeTimers();
    const p = new Popover({ trigger, content: "x", emit: EmitType.Hover, enterable: true });
    p.open();
    // jsdom all-zero rects: the popover boundary expands to [-10,-10,10,10]
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: -5, clientY: -5, bubbles: true }),
    );
    await jest.advanceTimersByTimeAsync(300);
    expect(p.status).toBe(StatusType.Opened);
    // only beyond the boundary (-15) does hide trigger
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: -15, clientY: -15, bubbles: true }),
    );
    await jest.advanceTimersByTimeAsync(300);
    expect(p.status).toBe(StatusType.Closed);
    p.destroy();
  });

  // ---------- Scroll-follow: real-time repositioning (rAF coalescing, replacing throttle(300)) ----------

  const mockScrollable = () => {
    // jsdom scrollHeight/offsetHeight are always 0; mock the size so $getScrollElements can collect the scroll container
    const orig = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 100;
      },
    });
    return () => {
      if (orig) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", orig);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
      }
    };
  };

  it("滚动容器滚动时实时重定位：同一帧多次 scroll 合并为一次 update", async () => {
    jest.useFakeTimers();
    const outer = document.createElement("div");
    document.body.appendChild(outer);
    const container = document.createElement("div");
    container.style.overflow = "scroll";
    outer.appendChild(container);
    const t = document.createElement("button");
    container.appendChild(t);

    const restore = mockScrollable();
    try {
      const p = new Popover({ trigger: t, content: "x", emit: EmitType.Click, appendTo: outer });
      p.open();
      await jest.advanceTimersByTimeAsync(100);
      expect(p.status).toBe(StatusType.Opened);

      const updateSpy = jest.spyOn(p, "update");
      container.dispatchEvent(new Event("scroll"));
      container.dispatchEvent(new Event("scroll"));
      container.dispatchEvent(new Event("scroll"));
      // Under jest fake timers a 0ms timer needs one tick of advance to flush
      await jest.advanceTimersByTimeAsync(16);
      expect(updateSpy).toHaveBeenCalledTimes(1); // coalesced within the same frame

      container.dispatchEvent(new Event("scroll"));
      await jest.advanceTimersByTimeAsync(16);
      expect(updateSpy).toHaveBeenCalledTimes(2); // re-follows on the next frame
      updateSpy.mockRestore();
      p.destroy();
    } finally {
      restore();
      outer.remove();
    }
  });

  it("closeOnScroll=true：滚动触发关闭（close 分支不受 rAF 改造影响）", async () => {
    jest.useFakeTimers();
    const outer = document.createElement("div");
    document.body.appendChild(outer);
    const container = document.createElement("div");
    container.style.overflow = "scroll";
    outer.appendChild(container);
    const t = document.createElement("button");
    container.appendChild(t);

    const restore = mockScrollable();
    try {
      const p = new Popover({
        trigger: t,
        content: "x",
        emit: EmitType.Click,
        appendTo: outer,
        closeOnScroll: true,
      });
      p.open();
      await jest.advanceTimersByTimeAsync(100);
      expect(p.status).toBe(StatusType.Opened);

      container.dispatchEvent(new Event("scroll"));
      expect(p.status).toBe(StatusType.Closing); // close branch closes synchronously
      await jest.advanceTimersByTimeAsync(100);
      expect(p.status).toBe(StatusType.Closed);
      p.destroy();
    } finally {
      restore();
      outer.remove();
    }
  });
});
