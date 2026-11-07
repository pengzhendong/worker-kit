<template>
<Toast />
    <div class="card">
        <div style="position: relative; height: 500px">
            <SpeedDial :model="items" direction="up" style="position: absolute; left: calc(50% - 2rem); bottom: 0" />
            <SpeedDial :model="items" direction="down" style="position: absolute; left: calc(50% - 2rem); top: 0" />
            <SpeedDial :model="items" direction="left" style="position: absolute; top: calc(50% - 2rem); right: 0" />
            <SpeedDial :model="items" direction="right" style="position: absolute; top: calc(50% - 2rem); left: 0" />
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            items: [
                {
                    label: 'Add',
                    icon: 'pi pi-pencil',
                    command: () => {
                        this.$toast.add({ severity: 'info', summary: 'Add', detail: 'Data Added', life: 3000 });
                    }
                },
                {
                    label: 'Update',
                    icon: 'pi pi-refresh',
                    command: () => {
                        this.$toast.add({ severity: 'success', summary: 'Update', detail: 'Data Updated', life: 3000 });
                    }
                },
                {
                    label: 'Delete',
                    icon: 'pi pi-trash',
                    command: () => {
                        this.$toast.add({ severity: 'error', summary: 'Delete', detail: 'Data Deleted', life: 3000 });
                    }
                },
                {
                    label: 'Upload',
                    icon: 'pi pi-upload',
                    command: () => {
                        this.$toast.add({ severity: 'info', summary: '已选择示例', life: 2000 });
                    }
                },
                {
                    label: 'Vue Website',
                    icon: 'pi pi-external-link',
                    command: () => {
                        this.$toast.add({ severity: 'info', summary: '示例操作', life: 2000 });
                    }
                }
            ]
        };
    }
};
</script>
