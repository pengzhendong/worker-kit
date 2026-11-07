<template>
<div class="card">
        <PickList v-model="products" dataKey="id" breakpoint="1400px">
            <template #option="{ option }">
                {{ option.name }}
            </template>
        </PickList>
    </div>
</template>

<script>
const ProductService = { getProductsSmall: async () => ['苹果', '香蕉', '橙子', '葡萄'].map((name, id) => ({ id, name })) };

export default {
    data() {
        return {
            products: null
        };
    },
    mounted() {
        ProductService.getProductsSmall().then((data) => (this.products = [data, []]));
    }
};
</script>
