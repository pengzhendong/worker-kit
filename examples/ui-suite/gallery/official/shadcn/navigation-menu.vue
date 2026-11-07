<script setup lang="ts">
import { ref } from 'vue'
import { CircleCheckIcon, CircleHelpIcon, CircleIcon } from '@lucide/vue'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from './registry/navigation-menu'
// eslint-disable-next-line import/no-named-default
import { default as ListItem } from './NavigationMenuDemoItem.vue'

const selected = ref('')

const components: { title: string, description: string }[] = [
  {
    title: 'Alert Dialog',
    description:
      'A modal dialog that interrupts the user with important content and expects a response.',
  },
  {
    title: 'Hover Card',
    description:
      'For sighted users to preview content available behind a link.',
  },
  {
    title: 'Progress',
    description:
      'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.',
  },
  {
    title: 'Scroll-area',
    description: 'Visually or semantically separates content.',
  },
  {
    title: 'Tabs',
    description:
      'A set of layered sections of content—known as tab panels—that are displayed one at a time.',
  },
  {
    title: 'Tooltip',
    description:
      'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.',
  },
]
</script>

<template>
  <NavigationMenu :viewport="false">
    <NavigationMenuList class="flex-wrap justify-start">
      <NavigationMenuItem>
        <NavigationMenuTrigger>Home</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul class="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
            <li class="row-span-3">
              <NavigationMenuLink as-child>
                <a
                  class="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
                  href="#navigation-menu" @click.prevent="selected = 'shadcn/ui'"
                >
                  <div class="mt-4 mb-2 text-lg font-medium">
                    shadcn/ui
                  </div>
                  <p class="text-muted-foreground text-sm leading-tight">
                    Beautifully designed components built with Tailwind CSS.
                  </p>
                </a>
              </NavigationMenuLink>
            </li>
            <ListItem title="Introduction" @select="selected = $event">
              Re-usable components built using Radix UI and Tailwind CSS.
            </ListItem>
            <ListItem title="Installation" @select="selected = $event">
              How to install dependencies and structure your app.
            </ListItem>
            <ListItem title="Typography" @select="selected = $event">
              Styles for headings, paragraphs, lists...etc
            </ListItem>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Components</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul class="grid w-[min(400px,80vw)] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
            <ListItem
              v-for="component in components"
              :key="component.title"
              :title="component.title"
              @select="selected = $event"
            >
              {{ component.description }}
            </ListItem>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
          <a href="#navigation-menu" @click.prevent="selected = 'Docs'">Docs</a>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>List</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul class="grid w-[min(300px,80vw)] gap-4">
            <li>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Components'">
                  <div class="font-medium">Components</div>
                  <div class="text-muted-foreground">
                    Browse all components in the library.
                  </div>
                </a>
              </NavigationMenuLink>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Documentation'">
                  <div class="font-medium">Documentation</div>
                  <div class="text-muted-foreground">
                    Learn how to use the library.
                  </div>
                </a>
              </NavigationMenuLink>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Blog'">
                  <div class="font-medium">Blog</div>
                  <div class="text-muted-foreground">
                    Read our latest blog posts.
                  </div>
                </a>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Simple</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul class="grid w-[200px] gap-4">
            <li>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Components'">Components</a>
              </NavigationMenuLink>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Documentation'">Documentation</a>
              </NavigationMenuLink>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Blocks'">Blocks</a>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>With Icon</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul class="grid w-[200px] gap-4">
            <li>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Backlog'" class="flex-row items-center gap-2">
                  <CircleHelpIcon />
                  Backlog
                </a>
              </NavigationMenuLink>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'To Do'" class="flex-row items-center gap-2">
                  <CircleIcon />
                  To Do
                </a>
              </NavigationMenuLink>
              <NavigationMenuLink as-child>
                <a href="#navigation-menu" @click.prevent="selected = 'Done'" class="flex-row items-center gap-2">
                  <CircleCheckIcon />
                  Done
                </a>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
  <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">{{ selected ? `已选择 ${selected}` : '选择菜单项查看结果。' }}</p>
</template>
