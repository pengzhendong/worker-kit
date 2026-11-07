<template>

        <div class="card">
            <Galleria :value="images" :responsiveOptions="responsiveOptions" :numVisible="5" containerStyle="max-width: 640px">
                <template #item="slotProps">
                    <img :src="slotProps.item.itemImageSrc" :alt="slotProps.item.alt" style="width: 100%" />
                </template>
                <template #thumbnail="slotProps">
                    <img :src="slotProps.item.thumbnailImageSrc" :alt="slotProps.item.alt" />
                </template>
            </Galleria>
        </div>

</template>

<script>
const PhotoService = { getImages: async () => ['coast', 'landscape'].map((name) => ({ itemImageSrc: '/nuxt/media/' + name + '.svg', thumbnailImageSrc: '/nuxt/media/' + name + '.svg', alt: name })) };

export default {
    data() {
        return {
            images: null,
            responsiveOptions: [
                {
                    breakpoint: '1300px',
                    numVisible: 4
                },
                {
                    breakpoint: '575px',
                    numVisible: 1
                }
            ]
        };
    },
    mounted() { this.loadDemoData(); },
    methods: {
        loadDemoData() {
            PhotoService.getImages().then((data) => (this.images = data));
        }
    }
};
</script>
