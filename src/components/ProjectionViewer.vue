<template>
  <div class="relative h-full w-full">
    <div class="flex flex-row h-full w-full">
      <ProjectionDeckGLComponent
        :time_type="props.time_type"
        :is-showing-vector-field="isShowingVectorField"
      />
      <ProjectionDeckGLComponent
        v-if="isShowingComparisonMap"
        :time_type="props.time_type"
        is-comparison
      />
    </div>

    <div
      id="tooltip"
      class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
      style="display: none"
    />
    <ElementSelector
      class="absolute bottom-0 w-full z-[4] mb-4"
      :time_type="props.time_type"
      @comparison-mode-changed="(newMode) => comparisonModeChanged(newMode)"
    />
    <div
      class="flex flex-col justify-start items-start absolute top-0 left-0 z-[4] m-4 overflow-auto min-w-0 w-fit gap-2 h-fit max-h-[100%] pr-4"
    >
      <button
        class="w-fit px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600 focus:outline-none"
        @click="isSidePanelOpen = !isSidePanelOpen"
      >
        {{ isSidePanelOpen ? "Collapse" : "Expand" }}
      </button>
      <div
        v-if="isSidePanelOpen"
        class="flex flex-col gap-2 transition-all duration-300 max-w-[400px]"
      >
        <ModelInfoViewer :time_type="props.time_type" />
        <ChatbotInterface />
        <ProjectionSettings />
        <SOMNodeViewer
          :time_type="props.time_type"
          :nodeClickedID="store.nodeClickedID"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

// STORE IMPORT
import { useStore } from "@/store/main";

// UI ELEMENTS IMPORT
import ElementSelector from "./ui/ElementSelector.vue";
import ModelInfoViewer from "./ui/ModelInfoViewer.vue";
import ChatbotInterface from "./ui/ChatbotInterface.vue";
import SOMNodeViewer from "./SOMNodeViewer.vue";
import ProjectionDeckGLComponent from "./ui/ProjectionDeckGLComponent.vue";
import ProjectionSettings from "./ui/ProjectionSettings.vue";

import { dataset_name, timeType, constructZones } from "./utils/utils";

const props = defineProps<{
  isHistorical: Boolean;
  time_type: timeType;
}>();
const store = useStore();

const isShowingComparisonMap = ref(false);
const isShowingVectorField = ref(false);
const isSidePanelOpen = ref(true);

function comparisonModeChanged(newType: string) {
  isShowingComparisonMap.value = newType === "side-by-side";
  isShowingVectorField.value = newType === "vector-field";

  if (isShowingVectorField.value) {
    getComparisonVectorField();
  }

  nextTick(() => {
    store.redrawFlag = !store.redrawFlag;
  });
}

let debounceTimer = null;

watch(
  () => [store.getFiles, store.monthsSelected],
  () => {
    if (!isShowingVectorField.value) return; // Don't fire if the vector field isn't showing

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      console.log(
        "DEBUG PROJECTION VIEWER FIRING GET COMPARISON VECTOR FIELD NO CHANGE AFTER 3s"
      );
      getComparisonVectorField();
    }, 3000);
  }
);

async function getComparisonVectorField() {
  if (store.files[0].length == 0 || store.files[1].length === 0) return; // Only fire if both comparisons are set

  await store.updateVectorFieldSetting({
    dataset_type: dataset_name,
    time_type: props.time_type,
    group1: store.files[0],
    group2: store.files[1],
    month: store.monthsSelected,
    resolution: 20,
    zones: constructZones(store.mapAnnotation),
  });
  store.redrawFlag = !store.redrawFlag;
}
</script>

<style scoped>
.slider {
  --slider-tooltip-font-size: 1.5rem;
}
</style>
