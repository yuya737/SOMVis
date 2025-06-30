<template>
  <header
    class="z-[999] flex items-center justify-between bg-gray-100 px-6 py-4 text-gray-800"
  >
    <!-- Logo -->
    <div class="flex flex-row items-center justify-center gap-8">
      <span class="text-xl font-bold tracking-wide text-gray-800">
        ClimateSOM</span
      >
      <div
        class="relative flex max-w-xs flex-col items-center justify-start gap-2"
      >
        <!-- <label class="text-sm text-gray-600">Toggle LLM queried region</label> -->
        <Dropdown
          v-model="store.currentDatasetType"
          :options="['California', 'NorthWest', 'WestCoast']"
          @change="(newValue) => changeDataset(newValue)"
        />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            Choose the region to inspect
          </div>
        </div>
      </div>
      <StepProgress class="w-fit flex-grow" />
    </div>

    <div class="flex items-center gap-8">
      <div
        class="relative flex max-w-xs flex-col items-center justify-start gap-2"
      >
        <!-- <label class="text-sm text-gray-600">Toggle LLM queried region</label> -->
        <ToggleButton
          v-model="store.isShowingLLMQueriedRegion"
          :disabled="store.LLMQueriedRegionIndex == -1"
          on-label="Hide LLM Region"
          off-label="Show LLM Region"
        />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            Toggle LLM queried region. Click on the LLM history to select
            regions.
          </div>
        </div>
      </div>
      <div
        v-if="store.currentStep == 'Anchor'"
        class="relative flex max-w-xs flex-col items-center justify-end gap-2"
      >
        <!-- <label class="text-sm text-gray-600"
          >Reflect Anchors in the SOM Node space and recalculate mapping</label
        > -->
        <Button
          class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          label="Reflect Anchors"
          @click="store.recalculateMDEFlag = !store.recalculateMDEFlag"
        />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            Reflect Anchors in the SOM Node space and recalculate the mapping.
            Anchors will stay in place whist the other nodes will adjust to the
            anchors.
          </div>
        </div>
      </div>

      <div
        v-if="store.currentStep == 'Analyze' || store.currentStep == 'Annotate'"
        class="relative flex max-w-xs flex-col items-center justify-center gap-2"
      >
        <!-- <label class="text-sm text-gray-600">Toggle Distribution</label> -->
        <ToggleButton
          v-model="store.isHidingAnnotations"
          on-label="Show Annotations"
          off-label="Hide Annotations"
        />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            Toggle the annotations on the map
          </div>
        </div>
      </div>

      <div
        v-if="store.currentStep == 'Analyze'"
        class="relative flex max-w-xs flex-col items-center justify-center gap-2"
      >
        <!-- <label class="text-sm text-gray-600">Toggle Distribution</label> -->
        <ToggleButton
          v-model="store.isHidingDistribution"
          on-label="Show Distribution"
          off-label="Hide Distribution"
        />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            Toggle the distribution shown in the SOM Node space as polygons
          </div>
        </div>
      </div>

      <div
        v-if="store.currentStep == 'Analyze'"
        class="relative flex max-w-xs flex-col items-center justify-center gap-2"
      >
        <!-- <label class="text-sm text-gray-600">Toggle Distribution</label> -->
        <ToggleButton
          v-model="store.isShowingForcingClustering"
          on-label="Show Model Clustering"
          off-label="Show Forcing Clustering"
        />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            Toggle the clustering shown. <kbd>Model clustering</kbd>Model
            clustering clusters GCM:SSP pairs by its behavior () while
            <kbd>Forcing clustering</kbd> clusters models by its forcing from
            <kbd>historical</kbd> to another SSP.
          </div>
        </div>
      </div>

      <div
        v-if="store.currentStep == 'Annotate'"
        class="relative flex max-w-xs flex-col items-center justify-center gap-2"
      >
        <SelectButton v-model="store.mapMode" :options="modeOptions" />
        <div
          class="group absolute right-0 top-0 z-[4] -translate-y-3 translate-x-3 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden min-w-[150px] group-hover:block"
          >
            The map mode is either <kbd>Explore</kbd> or <kbd>Annotate</kbd>. In
            Annotate, clicking on the space will trigger the annotation UI.
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import StepProgress from "./ui/StepProgress.vue";
import ToggleButton from "primevue/togglebutton";

import { useStore } from "@/store/main";
import { getNodeData, getPaths } from "@/store/storeHelper";
import { nextTick } from "vue";
const store = useStore();

const modeOptions = ["Explore", "Annotate"];
const setLLMHighlightOff = () => {
  if (store.isShowingLLMQueriedRegion) store.LLMQueriedRegionIndex = -1;
};

function changeDataset({ value }) {
  store.pathData = null;
  store.nodeMap = null;
  nextTick(() => {
    getNodeData({ dataset_name: value }).then((data) => {
      const {
        nodeMap,
        classifyData,
        hotspotPolygons,
        contourData,
        interpolatedSurfaceData,
        vectorFieldData,
      } = data;
      store.nodeMap = nodeMap;
      store.classifyData = classifyData;
      store.hotspotPolygons = hotspotPolygons;
      store.contourData = contourData;
      store.interpolatedSurfaceData = interpolatedSurfaceData;
      store.vectorFieldData = vectorFieldData;
      store.explainablityPoints = [
        [5, 5],
        [-5, -5],
      ];
    });
    getPaths(value).then((pathData) => {
      store.pathData = pathData;
    });
    store.currentDatasetType = value;
    store.showMapAnnotationPopup = false;
    store.LLMQueries = [];
    store.chatBotHistory = [];
    store.nodeClickedID = -1;
    store.nodeMapCanvas = null;
    store.LLMQueriedRegionIndex = -1;
    store.currentStep = "Anchor";

    store.anchors = {
      ids: [],
      coords: [],
    };
    store.mapAnnotation = {
      type: "FeatureCollection",
      features: [],
    };
  });
}
</script>
