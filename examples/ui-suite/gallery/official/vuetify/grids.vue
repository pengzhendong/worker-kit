<template>
  <v-container fluid>
    <v-row>
      <v-col v-for="label in ['列一', '列二', '列三']" :key="label" cols="12" sm="4">
        <v-sheet class="pa-3" border rounded>{{ label }}</v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>
