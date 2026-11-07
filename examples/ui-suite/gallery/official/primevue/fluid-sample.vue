<template>
<div class="card flex flex-col gap-6">
        <div>
            <label for="non-fluid" class="font-bold mb-2 block">Non-Fluid</label>
            <InputText id="non-fluid" />
        </div>

        <div>
            <label for="fluid" class="font-bold mb-2 block">Fluid Prop</label>
            <InputText id="fluid" fluid />
        </div>

        <Fluid>
            <span class="font-bold mb-2 block">Fluid Container</span>
            <div class="grid grid-cols-2 gap-4">
                <div><InputText /></div>
                <div><InputText /></div>
                <div class="col-span-full"><InputText /></div>
                <div><InputText :fluid="false" placeholder="Non-Fluid" /></div>
            </div>
        </Fluid>
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
