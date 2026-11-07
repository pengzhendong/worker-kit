<!-- eslint-disable no-console -->
<!-- eslint-disable no-template-curly-in-string -->
<script setup lang="ts">
import { Toaster, toast } from 'vue-sonner'

import { Button } from './registry/button'
</script>

<template>
  <Toaster />
  <Button
    variant="outline"
    @click="() =>
      toast('Event has been created', {
        description: 'Sunday, December 03, 2023 at 9:00 AM',
        action: {
          label: 'Undo',
          onClick: () => toast('Event reverted'),
        },
      })
    "
  >
    Show Toast
  </Button>
</template>
