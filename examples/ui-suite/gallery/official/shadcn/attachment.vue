<script setup lang="ts">
import { ref } from "vue"
import { FileCodeIcon, XIcon } from '@lucide/vue'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from './registry/attachment'
import { Spinner } from './registry/spinner'

const uploading = ref(true)
const attached = ref(true)

const images = [
  {
    name: 'workspace.png',
    meta: 'PNG · 820 KB',
    src: '/shadcn/media/coast.svg',
    alt: 'Workspace',
  },
  {
    name: 'desk-reference.jpg',
    meta: 'JPG · 1.1 MB',
    src: '/shadcn/media/landscape.svg',
    alt: 'Desk',
  },
  {
    name: 'office-reference.jpg',
    meta: 'JPG · 940 KB',
    src: '/shadcn/media/coast.svg',
    alt: 'Office',
  },
]
</script>

<template>
  <div class="mx-auto flex w-full max-w-sm flex-col gap-3 py-12">
    <AttachmentGroup>
      <template v-for="image in images" :key="image.name">
        <Attachment orientation="vertical">
          <AttachmentMedia variant="image">
            <img :src="image.src" :alt="image.alt">
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{{ image.name }}</AttachmentTitle>
            <AttachmentDescription>{{ image.meta }}</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </template>
    </AttachmentGroup>
    <Attachment v-if="uploading" state="uploading" class="w-full">
      <AttachmentMedia>
        <Spinner />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>sales-dashboard.pdf</AttachmentTitle>
        <AttachmentDescription>Uploading · 64%</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Cancel upload" @click="uploading = false">
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
    <Attachment v-if="attached" class="w-full">
      <AttachmentMedia>
        <FileCodeIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>message-renderer.vue</AttachmentTitle>
        <AttachmentDescription>TypeScript · 12 KB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove message-renderer.vue" @click="attached = false">
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  </div>
</template>
