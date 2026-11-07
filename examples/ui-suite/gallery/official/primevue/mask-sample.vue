<template>
<div class="card flex justify-center">
        <InputMask id="basic" v-model="value" mask="99-999999" placeholder="99-999999" />
    </div>
</template>

<script>
export default {
    data() {
        return {
            value: ''
        };
    }
};
</script>
