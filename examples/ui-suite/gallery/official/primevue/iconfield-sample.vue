<template>
<div class="card flex flex-wrap justify-center gap-4">
        <IconField>
            <InputIcon class="pi pi-search" />
            <InputText v-model="value1" placeholder="Search" />
        </IconField>

        <IconField>
            <InputText v-model="value2" variant="filled" />
            <InputIcon class="pi pi-spin pi-spinner" />
        </IconField>
    </div>
</template>

<script>
export default {
    data() {
        return {
            value1: null,
            value2: null
        };
    }
};
</script>
