<script setup>
import { ref } from 'vue';
import UContentToc from '@nuxt/ui/components/content/ContentToc.vue';

const preview = ref(null);
const active = ref('gallery-start');
const links = [
  { id: 'gallery-start', text: '开始使用', depth: 2 },
  { id: 'gallery-settings', text: '应用配置', depth: 2 },
  { id: 'gallery-release', text: '部署应用', depth: 2 },
];

function move(id) {
  active.value = id;
  const target = preview.value.querySelector('#' + id);
  if (target) preview.value.scrollTop = target.offsetTop;
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <UContentToc
      :links="links"
      :active-headings="[active]"
      highlight
      :ui="{ root: 'static' }"
      @move="move"
    />
    <article
      ref="preview"
      class="relative h-40 overflow-y-auto rounded-lg border border-default"
    >
      <section
        v-for="link in links"
        :id="link.id"
        :key="link.id"
        class="min-h-40 p-4"
      >
        <h3 class="font-semibold">{{ link.text }}</h3>
      </section>
    </article>
  </div>
</template>
