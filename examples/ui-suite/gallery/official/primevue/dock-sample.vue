<template>
<div class="card dock-demo">
        <div class="flex flex-wrap gap-4 mb-8">
            <div v-for="pos of positions" :key="pos.label" class="flex items-center">
                <RadioButton v-model="position" :value="pos.value" :inputId="pos.label" name="dock" />
                <label :for="pos.label" class="ml-2"> {{ pos.label }} </label>
            </div>
        </div>
        <div class="dock-window" style="backgroundimage: 'url(/nuxt/media/landscape.svg)'">
            <Dock :model="items" :position="position">
                <template #itemicon="{ item }">
                    <img v-tooltip.top="item.label" :alt="item.label" :src="item.icon" style="width: 100%" />
                </template>
            </Dock>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            items: [
                {
                    label: 'Finder',
                    icon: '/primevue/favicon.svg'
                },
                {
                    label: 'App Store',
                    icon: '/primevue/favicon.svg'
                },
                {
                    label: 'Photos',
                    icon: '/primevue/favicon.svg'
                },
                {
                    label: 'Trash',
                    icon: '/primevue/favicon.svg'
                }
            ],
            position: 'bottom',
            positions: [
                {
                    label: 'Bottom',
                    value: 'bottom'
                },
                {
                    label: 'Top',
                    value: 'top'
                },
                {
                    label: 'Left',
                    value: 'left'
                },
                {
                    label: 'Right',
                    value: 'right'
                }
            ]
        };
    }
};
</script>

<style scoped>
.dock-demo > .dock-window {
    width: 100%;
    height: 450px;
    position: relative;
    background-image: url('/primevue/favicon.svg');
    background-repeat: no-repeat;
    background-size: cover;
    z-index: 1;
}

.dock-demo > .p-dock {
    z-index: 1000;
}

.dock-demo .p-menubar {
    padding: 0;
    border-radius: 0;
}
</style>
