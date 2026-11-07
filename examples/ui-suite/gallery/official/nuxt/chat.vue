<script setup>
import { ref } from 'vue';
const input = ref('');
const messages = ref([
  {
    id: 'welcome',
    role: 'assistant',
    parts: [{ type: 'text', text: '这是使用本地数据的对话预览。' }],
  },
]);

function send() {
  const text = input.value.trim();
  if (!text) return;
  messages.value.push(
    {
      id: String(messages.value.length),
      role: 'user',
      parts: [{ type: 'text', text }],
    },
    {
      id: String(messages.value.length + 1),
      role: 'assistant',
      parts: [{ type: 'text', text: '本地示例已收到这条消息。' }],
    },
  );
  input.value = '';
}
</script>
<template>
  <div class="grid gap-3">
    <UChatMessages
      :messages="messages"
      :should-scroll-to-bottom="false"
      class="max-h-52 overflow-y-auto"
    />
    <UChatPrompt v-model="input" placeholder="输入消息" @submit="send">
      <template #footer><UChatPromptSubmit aria-label="发送消息" /></template>
    </UChatPrompt>
  </div>
</template>
