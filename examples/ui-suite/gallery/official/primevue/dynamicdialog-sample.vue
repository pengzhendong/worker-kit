<script setup>
import { h } from 'vue';
import DynamicDialog from 'primevue/dynamicdialog';
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
const Content = { render: () => h('p', '这是运行时加载的对话框内容。') };
function showProducts() {
  dialog.open(Content, { props: { header: '产品详情', modal: true } });
}
</script>

<template>
  <div>
    <Button label="打开动态对话框" @click="showProducts" />
    <DynamicDialog />
  </div>
</template>
