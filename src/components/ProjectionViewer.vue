<template>
  <div class="relative h-full w-full">
    <div class="flex flex-row h-full w-full">
      <ProjectionDeckGLComponent :time_type="props.time_type" />
      <ProjectionDeckGLComponent
        v-if="isShowingComparisonMap"
        :time_type="props.time_type"
        isComparison
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
      @comparisonModeChanged="(newValue) => (isShowingComparisonMap = newValue)"
    />
    <div
      class="flex flex-col justify-start items-start absolute top-0 left-0 z-[4] m-4 overflow-auto w-[400px] gap-2 h-fit max-h-[100%]"
    >
      <ModelInfoViewer :time_type="props.time_type" />
      <ChatbotInterface />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, nextTick } from "vue";
import { storeToRefs } from "pinia";

// STORE IMPORT
import { useStore } from "@/store/main";

// UI ELEMENTS IMPORT
import NodeInspector from "./ui/NodeInspector.vue";
import MapAnnotationEditor from "./ui/MapAnnotationEditor.vue";
import ElementSelector from "./ui/ElementSelector.vue";
import ModelInfoViewer from "./ui/ModelInfoViewer.vue";
import ChatbotInterface from "./ui/ChatbotInterface.vue";
import ProjectionDeckGLComponent from "./ui/ProjectionDeckGLComponent.vue";

// PRIMEVUE IMPORTS
import ToggleButton from "primevue/togglebutton";
import Dropdown from "primevue/dropdown";
import ProgressSpinner from "primevue/progressspinner";
import SelectButton from "primevue/selectbutton";
import Button from "primevue/button";

// UTILS IMPORTS
import API from "@/api/api";

import {
  mapView,
  DECKGL_SETTINGS,
  generateMonthRangeList,
  months,
  sspAllLabels,
  subsetType,
  dataset_name,
  timeType,
  timeTypeMonths,
} from "./utils/utils";

const props = defineProps({
  isHistorical: Boolean,
  time_type: timeType,
});

const isShowingComparisonMap = ref(false);
// const text = ref(props.isHistorical ? "Historical" : "SSP370");

// async function handleVectorFieldChanged() {
//   if (!checkValidStreamLines()) return;
//   let selectedModels = [selectedStreamLinesModel.value.name];
//   if (selectedStreamLinesModel.value.name == "All") {
//     selectedModels = sspAllLabels.map((d) => d.model_name);
//   }
//   isCalculatingVectorField.value = true;
//   await store.updateVectorFieldSetting([
//     dataset_name,
//     selectedModels,
//     // [selectedStreamLinesModel.value.name],
//     props.time_type,
//     [selectedStreamLinesCmp1.value.name, selectedStreamLinesCmp2.value.name],
//     selectedStreamLineMonth.value,
//   ]);
//   isCalculatingVectorField.value = false;
//   drawAllLayers();
// }
</script>

<style scoped>
.slider {
  --slider-tooltip-font-size: 1.5rem;
}
</style>
