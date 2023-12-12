import Popover, { PlacementType, EmitType } from "../src";
import { $ } from "../src/utils";

window.onload = function () {
  const mountElement = document.querySelector(".mount-container") as HTMLElement;
  const offset = document.querySelector(".offset") as HTMLElement;
  const openDelay = document.querySelector(".open-delay") as HTMLElement;
  const closeDelay = document.querySelector(".close-delay") as HTMLElement;
  const triggerItems = document.querySelectorAll(".popover_trigger") as NodeListOf<HTMLElement>;

  // Box scroll top & left
  const scrollBox = document.querySelector(".scroll-box") as HTMLElement;
  const mountedRect = mountElement.getBoundingClientRect();
  if (scrollBox) {
    scrollBox.scrollTop = (1000 - mountedRect.height) / 2 + 10;
    scrollBox.scrollLeft = (2000 - mountedRect.width) / 2 + 10;
  }

  // default config
  const defaultConfig = {
    content: "Next-Popover",
    appendTo: mountElement,
    wrapperClass: "demo-popover",
    animationClass: "fade",
    placement: PlacementType.Top,
    emit: EmitType.Click,
    showArrow: true,
    openDelay: 50,
    closeDelay: 50,
    offset: 8,
  };

  // init
  const popovers: any[] = [];
  triggerItems.forEach((item) => {
    const { placement } = item.dataset;
    const content = $({
      tagName: "div",
      attributes: { class: "content-inner" },
      children: `Next-Popover<br /> Positon: ${placement}`,
    });
    const pop = new Popover({
      ...defaultConfig,
      content,
      trigger: item,
      placement: item.dataset.placement as any,
    });
    popovers.push(pop);
  });

  /**
   * Configure
   */
  const configure = document.querySelector(".configure") as HTMLElement;
  configure.onchange = ({ target }) => {
    const { name, value, checked } = target as any;
    switch (name) {
      case "emit":
        defaultConfig.emit = value;
        break;
      case "mount":
        defaultConfig.appendTo = value === "triggerParent" ? mountElement : document.body;
        break;
      case "offset":
        offset.textContent = `${value}ms`;
        defaultConfig.offset = Number(value);
        break;
      case "openDelay":
        openDelay.textContent = `${value}ms`;
        defaultConfig.openDelay = Number(value);
        break;
      case "closeDelay":
        closeDelay.textContent = `${value}ms`;
        defaultConfig.closeDelay = Number(value);
        break;
      case "extra":
        if (value === "animation") {
          defaultConfig.animationClass = checked ? "fade" : "";
        } else {
          defaultConfig[value] = checked;
        }
        break;
      default:
        defaultConfig[name] = value;
    }

    popovers.forEach((pop) => {
      pop.updateConfig({
        ...pop.config,
        ...defaultConfig,
        placement: pop.config.placement,
        content: pop.config.content,
      });
    });
  };
};
