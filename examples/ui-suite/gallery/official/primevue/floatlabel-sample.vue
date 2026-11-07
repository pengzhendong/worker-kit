<template>
<div class="card flex justify-center">
        <FloatLabel>
            <InputText id="username" v-model="value" autocomplete="off" />
            <label for="username">Username</label>
        </FloatLabel>
    </div>
</template>

<script>
export default {
    data() {
        return {
            value: null
        };
    }
};
</script>
