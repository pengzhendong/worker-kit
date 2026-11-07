<template>
  <div class="q-pa-md">
    <div class="q-gutter-sm row items-start">
      <q-uploader hide-upload-btn style="max-width: 300px" />

      <q-uploader
        hide-upload-btn
        color="teal"
        flat
        bordered
        style="max-width: 300px"
      />

      <q-uploader
        hide-upload-btn
        label="Upload files"
        color="purple"
        square
        flat
        bordered
        style="max-width: 300px"
      />

      <q-uploader
        hide-upload-btn
        label="No thumbnails"
        color="amber"
        text-color="black"
        no-thumbnails
        style="max-width: 300px"
      />
    </div>
  </div>
</template>
