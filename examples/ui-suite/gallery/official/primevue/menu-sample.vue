<template>
<div class="card flex justify-center">
        <Menu :model="items" />
    </div>
</template>

<script>
export default {
    data() {
        return {
            items: [
                { label: 'New', icon: 'pi pi-plus' },
                { label: 'Search', icon: 'pi pi-search' }
            ]
        };
    }
};
</script>
