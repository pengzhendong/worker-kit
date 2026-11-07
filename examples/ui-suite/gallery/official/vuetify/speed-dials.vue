<template>
<v-sheet class="text-center" height="420">
      <v-fab icon="$vuetify" aria-label="展开操作" size="large">
        <v-icon></v-icon>

        <v-speed-dial
          activator="parent"
          location="bottom center"
        >
          <v-btn key="1" color="surface-variant" icon="$success"></v-btn>
          <v-btn key="2" color="surface-variant" icon="$info"></v-btn>
          <v-btn key="3" color="surface-variant" icon="$warning"></v-btn>
          <v-btn key="4" color="surface-variant" icon="$error"></v-btn>
        </v-speed-dial>
      </v-fab>
    </v-sheet>
</template>
