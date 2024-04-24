<template>
  <div>
    <h1 :id="titleID" class="text-lg font-bold text-black" />
    <p :id="bodyID" class="text-base text-black" />
  </div>
  <Divider />
  <div v-if="hasScales">
    <div
      v-for="scale in props.scheme.scales"
      :key="scale.variable"
      class="InfoPanel-text-scales"
    >
      <InfoPanelScale :scale="scale" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, emit, onMounted } from "vue";
import Divider from "primevue/divider";
import InfoPanelScale from "./InfoPanelScale.vue";

// Seems like we need this because the dynamic renderer listens for this even though the textpanel doesn't care to emit anything.
const emit = defineEmits(["settings-changed"]);
const titleID = `title-${Math.random()}`;
const bodyID = `title-${Math.random()}`;

const props = defineProps({
  scheme: { type: Object, required: true },
});

const hasScales = props.scheme.scales !== undefined;

onMounted(() => {
  document.getElementById(titleID).innerHTML = props.scheme.title;
  document.getElementById(bodyID).innerHTML += props.scheme.info;
});
</script>
<style scoped>
.legend {
  display: inline-block;
  height: 20px;
}
</style>
