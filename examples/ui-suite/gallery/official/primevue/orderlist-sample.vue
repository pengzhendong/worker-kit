<template>
<div class="card sm:flex sm:justify-center">
        <OrderList v-model="products" dataKey="id" breakpoint="575px" pt:pcListbox:root="w-full sm:w-56">
            <template #option="{ option }">
                {{ option.name }}
            </template>
        </OrderList>
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
        ProductService.getProductsSmall().then((data) => (this.products = data));
    }
};
</script>
