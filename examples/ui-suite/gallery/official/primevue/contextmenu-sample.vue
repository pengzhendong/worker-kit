<template>
<div class="card flex md:justify-center">
        <img alt="Logo" :src="'/nuxt/media/coast.svg'" class="w-full md:w-[30rem] rounded shadow-lg" @contextmenu="onImageRightClick" aria-haspopup="true" />
        <ContextMenu ref="menu" :model="items" />
    </div>
</template>

<script>
export default {
    data() {
        return {
            items: [
                { label: 'Copy', icon: 'pi pi-copy' },
                { label: 'Rename', icon: 'pi pi-file-edit' }
            ]
        };
    },
    methods: {
        onImageRightClick(event) {
            this.$refs.menu.show(event);
        }
    }
};
</script>
