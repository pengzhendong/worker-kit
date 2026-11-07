<template>
<div class="card flex justify-center">
        <VirtualScroller :items="items" :itemSize="50" class="border border-surface-200 dark:border-surface-700 rounded" style="width: 200px; height: 200px">
            <template v-slot:item="{ item, options }">
                <div :class="['flex items-center p-2', { 'bg-surface-100 dark:bg-surface-700': options.odd }]" style="height: 50px">{{ item }}</div>
            </template>
        </VirtualScroller>
    </div>
</template>

<script>
export default {
    data() {
        return {
            items: null
        };
    },
    mounted() {
        this.items = Array.from({ length: 100000 }).map((_, i) => `Item #${i}`);
    }
};
</script>
