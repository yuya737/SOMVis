<template>
  <div class="bg-white">
    <img class="flip-y" :src="imgSrc" />
    <Button
      @click="$emit('closeNodeInspector')"
      class="absolute z-[1] m-2 p-2 top-0 right-0 bg-red-200 aspect-square"
      >X</Button
    >
    <h1 class="text-lg font-bold text-black">SOM Node Viewer</h1>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Button from "primevue/button";

const props = defineProps<{
  imgSrc: string;
}>();
</script>

<style scoped>
.flip-y {
  transform: scaleY(-1);
  width: 300px;
  height: 400px;
}
</style>
