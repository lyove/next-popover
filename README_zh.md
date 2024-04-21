# Next-Popover

![Header Image](public/Popover.png)

Next-Popover 是一个轻量级、简单的弹出框工具库，可用于Poopver、Tooltip、Dropdown等，没有任何依赖，且支持Typescript。[Onlin Demo](https://vywrrk-3000.csb.app/)

[![Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/next-popover-vywrrk)

[English](./README_zh.md)

## 安装

```
npm i next-popover
```
或
```
yarn add next-popover
```
或
```
pnpm add next-popover
```

或者通过 CDN 使用

```html
<script src="https://unpkg.com/next-popover@latest/dist/popover.umd.js"></script>
<script>
  const { NextPopover } = window;
  const { PlacementType, EmitType } = NextPopover;
  // 注意要使用 `NextPopover.default`
  new NextPopover.default({
    // config
  });
</script>
```

## 快速开始

```js
import Popover, { PlacementType, EmitType } from 'next-popover'

const trigger = document.querySelector('.trigger'); 

const content = "Hello Next-Popover";
// 或者
// const content = document.createElement('div');
// content.classList.add('content');
// content.innerHTML = "Hello Next-Popover";

const appendTo = document.querySelector('.mount-container'); // 默认: document.body

const popover = new Popover({
  trigger, // 必填
  content, // 必填
  appendTo,
  placement: PlacementType.Top, // 设置弹框位置
  emit: EmitType.Hover // 设置鼠标 hover 在 trigger 上时打开弹框
});

trigger.onclick = () => {
  popover.toggle();
  // 或者
  // if (popover.opened) {
  //   popover.close();
  // } else {
  //   popover.open();
  // }
}

// 销毁 popover
popover.destroy();
```

### CSS 动画

通过 `animationClass` 参数可以在弹框显示和隐藏时，添加 CSS 动画。

```js
const popover = new Popover({
  animationClass: 'fade'
});
```

Popover 会通过 `animationClass` 添加下面 6 个类。

```js
`${animationClass}-enter-from` // 开始显示，下一帧被移除
`${animationClass}-enter-active` // 下一帧被添加，动画结束时移除
`${animationClass}-enter-to` // 下一帧被添加，动画结束时移除
`${animationClass}-exit-from` // 开始隐藏，下一帧被移除
`${animationClass}-exit-active` // 下一帧被添加，动画结束时移除
`${animationClass}-exit-to` // 下一帧被添加，动画结束时移除
`${animationClass}-${placement}` // 当前弹窗位置
```

你可以编写如下 css 样式。

```css
.fade-enter-from,
.fade-exit-to {
  transform: scale(.7);
  opacity: 0;
}
.fade-enter-active,
.fade-exit-active {
  transition: transform .1s ease, opacity .1s ease;
}
```

### 滚动

`closeOnScroll` 参数控制 `trigger` 元素滚动时，弹框自动关闭。

### 钩子

Popover 提供了丰富的钩子函数，可以在弹框的各个生命周期执行代码。

```js
new Popover({
  onBeforeEnter() {
    // css 展示动画开始前
  },
  onEntered() {
    // css 展示动画完成后
  },
  onBeforeExit() {
    // css 关闭动画开始前
  },
  onExited() {
    // css 关闭动画完成后
  },
  onOpen() {
    // 弹框展示时
  },
  onClose() {
    // 弹框关闭时
  }
});
```

## API

### 配置

| 参数 | 类型 | 默认 | 描述 |
| -- | -- | -- | -- |
| `trigger` | `HTMLElement` | | `必需`，触发元素 |
| `content` | `HTMLElement \| string \| number` | | `必需`，要弹出的内容元素 |
| `appendTo` | `HTMLElement` | `document.body` | 弹框的挂载容器 |
| `placement` | `PlacementType` | `PlacementType.Top` | 弹框的位置 |
| `showArrow` | `Boolean` | `true` | 是否显示箭头元素 |
| `emit` | `EmitType` | `EmitType.Click`  | 触发弹出类型 |
| `defaultOpen` | `boolean` | | 是否默认打开弹框 |
| `openDelay` | `number` | `100` | 打开延迟 |
| `closeDelay` | `number` | `100` | 关闭延迟 |
| `offset` | `number` | `8` | 弹框偏移数值 |
| `enterable` | `boolean` | `true` | 当 `emit` 等于 `hover` 时，鼠标是否可进入弹框 |
| `disabled` | `boolean` | | 是否禁用 |
| `clickOutsideClose` | `boolean` | `true` | 点击外部自动关闭弹出 |
| `closeOnScroll` | `boolean` | | 是否在滚动时自动关闭 |
| `triggerOpenClass` | `string` | | 弹窗开启时给 `trigger` 添加的 `class` |
| `wrapperClass` | `string` | | `popoverWrapper` 自定义class |
| `animationClass` | `string` | | css 动画类名 |
| `onBeforeEnter` | `() => void` | | css 进入动画开始之前 |
| `onEntered` | `() => void` | | css 进入动画完成时 |
| `onBeforeExit` | `() => void` | | css 关闭动画开始之前 |
| `onExited` | `() => void` | | css 关闭动画完成 |
| `onOpen` | `() => void` | | 当弹框展示 |
| `onClose` | `() => void` | | 当弹框关闭 |

### 实例属性

| 参数 | 类型 | 描述 |
| -- | -- | -- |
| `config` | `PopoverConfig` | Popover 配置参数 |
| `popoverRoot` | `HTMLElement` | 弹框根元素 |
| `popoverWrapper` | `HTMLElement` | 弹框元素 |
| `popoverContent` | `HTMLElement` | 弹框内容元素 |
| `arrowElement` | `HTMLElement` | 箭头元素 |
| `opened` | `boolean` | 当前弹框是否显示 |

### 方法

#### open()

开启弹框

```ts
open(): void;
```

#### close()

关闭弹框

```ts
close(): void;
```

#### toggle()

如果弹框是关闭的则打开，否则关闭

```ts
toggle(): void;
```

#### openWithDelay()

在 `config.openDelay` 时间之后，打开弹框

```ts
openWithDelay(): void;
```

#### closeWithDelay()

在 `config.closeDelay` 时间之后，关闭弹框

```ts
closeWithDelay(): void;
```

#### enable()

启用弹出。

```ts
enable(): void
```

#### disable()

禁用并关闭弹出。

```ts
disable(): void
```

#### updateConfig()

更新参数。

```ts
updateConfig(config: Partial<PopoverConfig>): void;
```

#### destroy()

销毁 popover 实例

```ts
destroy(): void;
```

#### onScroll()

手动触发 onScroll 事件。

```ts
onScroll(): void;
```

#### update()

手动更新弹框位置。

```ts
update(): void;
```
