# next-popover

<a href="https://github.com/lyove/next-popover/stargazers"><img src="https://img.shields.io/github/stars/lyove/next-popover" alt="Stars Badge"/></a>
<a href="https://github.com/lyove/next-popover/network/members"><img src="https://img.shields.io/github/forks/lyove/next-popover" alt="Forks Badge"/></a>
<a href="https://github.com/lyove/next-popover/pulls"><img src="https://img.shields.io/github/issues-pr/lyove/next-popover" alt="Pull Requests Badge"/></a>
<a href="https://github.com/lyove/next-popover/issues"><img src="https://img.shields.io/github/issues/lyove/next-popover" alt="Issues Badge"/></a>
<a href="https://github.com/lyove/next-popover/graphs/contributors"><img src="https://img.shields.io/github/contributors/lyove/next-popover?color=2b9348" alt="GitHub contributors"></a>
<a href="https://github.com/lyove/next-popover/blob/master/LICENSE"><img src="https://img.shields.io/github/license/lyove/next-popover?color=2b9348" alt="License Badge"/></a>

![Header Image](public/Popover.png)

Next-Popover is a lightweight and simple popover, tooltip, dropdown library, with no other dependencies, and Typescript friendly.

[![Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/next-popover-vywrrk)

[中文文档](./README_zh.md)

## Install

```
npm i next-popover
```
or
```
yarn add next-popover
```
or
```
pnpm add next-popover
```

or via CDN

```html
<script src="https://unpkg.com/next-popover@latest/dist/popover.umd.js"></script>
<script>
  const { NextPopover } = window;
  const { PlacementType, EmitType } = NextPopover;
  // use `NextPopover.default`
  new NextPopover.default({
    // config
  });
</script>
```

## Usage

```js
import Popover, { PlacementType, EmitType } from 'next-popover'

const trigger = document.querySelector('.trigger'); 

const content = "Hello Next-Popover";
// or
// const content = document.createElement('div'); // You need to pop up the displayed content
// content.classList.add('content');
// content.innerHTML = "Hello Next-Popover";

const appendTo = document.querySelector('.mount-container'); // default: document.body

const popover = new Popover({
  trigger, // required
  content, // required
  appendTo,
  placement: "top", // Set the position of the popover
  emit: "hover" // Set to open the popover when the mouse hovers over the trigger
});

trigger.onclick = () => {
  popover.toggle();
  // or
  // if (popover.opened) {
  //   popover.close();
  // } else {
  //   popover.open();
  // }
}

// if you don't need it anymore
popover.destroy();
```

### CSS Animation

The animationClass parameter allows you to add CSS animations when showing and hiding the popover.

```js
const popover = new Popover({
  animationClass: 'fade'
});
```

Popover will add the following 6 classes through the animationClass.

```js
`${animationClass}-enter-from` // Starts displaying and is removed in the next frame.
`${animationClass}-enter-active` // Added in the next frame and removed when the animation ends.
`${animationClass}-enter-to` // Added in the next frame and removed when the animation ends.
`${animationClass}-exit-from` // Starts hiding and is removed in the next frame.
`${animationClass}-exit-active` // Added in the next frame and removed when the animation ends.
`${animationClass}-exit-to` // Added in the next frame and removed when the animation ends.
`${animationClass}-${placement}` // Current popover placement
```

You can write CSS styles like this:

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

### Scroll

The closeOnScroll parameter controls whether the popover automatically closes when the trigger element is scrolled.

### Hook

Popover provides rich hook functions that can execute code during various stages of the popover's lifecycle.

```js
new Popover({
  onBeforeEnter() {
    // Executed before the CSS display animation starts.
  },
  onEntered() {
    // Executed after the CSS display animation completes.
  },
  onBeforeExit() {
    // Executed before the CSS hide animation starts.
  },
  onExited() {
    // Executed after the CSS hide animation completes.
  },
  onOpen() {
    // Executed when the popover is displayed.
  },
  onClose() {
    // Executed when the popover is closed.
  }
});
```

## API

### Config

| Name | Type | Default | Description |
| -- | -- | -- | -- |
| `trigger` | `HTMLElement ` | | `Required`. The trigger element |
| `content` | `HTMLElement \| string \| number` | | `Required`. The content element to be popped up |
| `appendTo` | `HTMLElement` | `document.body` | The element to append the popover to. |
| `placement` | `top` `left` `right` `bottom` `top-left` `top-right` `bottom-left` `bottom-right` `left-top` `left-bottom` `right-top` `right-bottom` | `top` | The placement of the popover. |
| `showArrow` | `Boolean` | `true` | Whether to show arrow |
| `emit` | `click` or `hover` | `click` | Trigger emit type |
| `open` | `boolean` |  | Whether to open the popover box by default |
| `openDelay` | `number` | `100` | Open delay |
| `closeDelay` | `number` | `100` | Close delay |
| `offset` | `number` | `8` | Popover offset |
| `enterable` | `boolean` | `true` | When `emit` is set to `hover`, can the mouse enter the popover |
| `disabled` | `boolean` | | Disabled |
| `clickOutsideClose` | `boolean` | `true` | Automatically close the popover when clicking outside |
| `closeOnScroll` | `boolean` | | Whether to automatically close the popover when the trigger element is scrolled. |
| `triggerOpenClass` | `string` | | The `class` added to the `trigger` when the popover is opened. |
| `wrapperClass` | `string` | | The `class` added to the `popoverWrapper`. |
| `animationClass` | `string` | | The CSS animation class name. |
| `onBeforeEnter` | `() => void` | | Called before the CSS enter animation starts. |
| `onEntered` | `() => void` | | 	Called when the CSS enter animation ends. |
| `onBeforeExit` | `() => void` | | Called before the CSS exit animation starts. |
| `onExited` | `() => void` | | Called when the CSS exit animation ends. |
| `onOpen` | `() => void` | | Called when the popover is opened. |
| `onClose` | `() => void` | |Called when the popover is closed. |

### Instance properties

| Name | Type | Description |
| -- | -- | -- |
| `config` | `PopoverConfig` | Popover configuration object |
| `popoverRoot` | `HTMLElement` | The popover root element |
| `popoverWrapper` | `HTMLElement` | The popover wrapper element |
| `popoverContent` | `HTMLElement` | The popover Content element |
| `arrowElement` | `HTMLElement` | The popover arrow element |
| `opened` | `boolean` | Indicates whether the popover is currently displayed |

### Methods

#### open()

Open the Popover instance.

```ts
open(): void;
```

#### close()

Close the Popover instance.

```ts
close(): void;
```

#### toggle()

Toggle the Popover instance open or close.

```ts
toggle(): void;
```

#### openWithDelay()

Open the popover after `config.openDelay` time.

```ts
openWithDelay(): void;
```

#### closeWithDelay()

Close the popover after `config.closeDelay` time.

```ts
closeWithDelay(): void;
```

#### enable()

Enable.

```ts
enable(): void
```

#### disable()

Disable and close popover.

```ts
disable(): void
```

#### updateConfig()

Update config.

```ts
updateConfig(config: Partial<PopoverConfig>): void;
```

#### destroy()

Destroy the Popover instance.

```ts
destroy(): void;
```

#### onScroll()

Manually trigger the `onScroll` event.

```ts
onScroll(): void;
```

#### update()

Manually update the position of the Popover instance.

```ts
update(): void;
```
