<template>
  <div class="relative h-full w-full">
    <div class="flex h-full w-full flex-row">
      <ProjectionDeckGLComponent
        :time_type="props.time_type"
        :is-showing-comparison="isShowingComparisonMap"
        :is-showing-vector-field="isShowingVectorField"
        :is-showing-diff-field="isShowingDiffField"
      />
      <ProjectionDeckGLComponent
        v-if="isShowingComparisonMap"
        :is-showing-comparison="isShowingComparisonMap"
        :is-showing-diff-field="isShowingDiffField"
        :time_type="props.time_type"
        is-comparison
      />
    </div>

    <div
      id="tooltip"
      class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
      style="display: none"
    />
    <div class="absolute bottom-0 left-0 z-[4] flex w-full flex-col bg-white">
      <ElementSelector
        id="element-selector"
        v-if="store.currentStep == 'Analyze'"
        :time_type="props.time_type"
        @comparison-mode-changed="(newMode) => comparisonModeChanged(newMode)"
      />
    </div>
    <div
      class="absolute left-0 top-0 z-[4] m-4 h-full w-fit min-w-0 gap-2 overflow-auto"
    >
      <div
        v-show="isSidePanelOpen"
        class="relative flex h-full max-w-[500px] flex-col gap-2"
      >
        <!-- <ModelInfoViewer :time_type="props.time_type" /> -->
        <ChatbotInterface
          class="z-[2] max-h-[50%] overflow-auto"
          :time_type="props.time_type"
        />
        <!-- <ProjectionSettings v-if="store.currentStep == 'Analyze'" /> -->
        <SOMNodeViewer
          class="max-h-[50%] overflow-hidden"
          :time_type="props.time_type"
          :nodeClickedID="store.nodeClickedID"
        />
      </div>
    </div>
    <Button
      :icon="isSidePanelOpen ? 'pi pi-minus' : 'pi pi-plus'"
      class="absolute left-0 top-0 z-[10] m-2 aspect-square bg-slate-300 shadow-sm"
      @click="isSidePanelOpen = !isSidePanelOpen"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

// STORE IMPORT
import { useStore } from "@/store/main";

// UI ELEMENTS IMPORT
import ElementSelector from "./ui/ElementSelector.vue";
// import ModelInfoViewer from "./ui/ModelInfoViewer.vue";
import ChatbotInterface from "./ui/ChatbotInterface.vue";
import SOMNodeViewer from "./SOMNodeViewer.vue";
import ProjectionDeckGLComponent from "./ui/ProjectionDeckGLComponent.vue";
// import ProjectionSettings from "./ui/ProjectionSettings.vue";

import { timeType, constructZones } from "./utils/utils";

const props = defineProps<{
  isHistorical: Boolean;
  time_type: timeType;
}>();
const store = useStore();

const isShowingComparisonMap = ref(false);
const isShowingVectorField = ref(false);
const isShowingDiffField = ref(false);
const isSidePanelOpen = ref(true);

function comparisonModeChanged(newType: string) {
  isShowingComparisonMap.value = newType === "side-by-side";
  isShowingVectorField.value = newType === "vector-field";
  isShowingDiffField.value = newType === "diff-field";

  if (isShowingVectorField.value) {
    getComparisonVectorField();
  }
  if (isShowingDiffField.value) {
    getDiffField();
  } else {
    store.sfBaySetting[0].ignore = false;
    store.sfBaySetting[1].ignore = false;
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

watch(
  store.sfBaySetting,
  () => {
    if (!isShowingDiffField.value) return; // Don't fire if the diff field isn't showing

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      console.log(
        "DEBUG PROJECTION VIEWER FIRING GET DIFF FIELD NO CHANGE AFTER 3s"
      );
      getDiffField();
    }, 3000);
  },
  { deep: true }
);

async function getComparisonVectorField() {
  if (store.files[0].length == 0 || store.files[1].length === 0) return; // Only fire if both comparisons are set

  await store.updateVectorFieldSetting({
    dataset_type: store.currentDatasetType,
    time_type: props.time_type,
    group1: store.files[0],
    group2: store.files[1],
    month: store.monthsSelected,
    resolution: 20,
    zones: constructZones(store.mapAnnotation),
  });
  store.redrawFlag = !store.redrawFlag;
}

async function getDiffField() {
  if (store.sfBaySetting[0].ignore || store.sfBaySetting[1].ignore) return; // Only fire if both comparisons are set

  const { ignore: _ignore1, ...params1 } = store.sfBaySetting[0];
  const { ignore: _ignore2, ...params2 } = store.sfBaySetting[1];

  await store.updateDiffFieldSetting({
    params1: params1,
    params2: params2,
    n_bootstrap: 2000,
  });
  store.sfBaySetting[0].ignore = true;
  store.sfBaySetting[1].ignore = true;
  store.redrawFlag = !store.redrawFlag;
}
</script>
