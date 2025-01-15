<template>
  <div class="relative h-full w-full">
    <div class="relative h-full w-full">
      <canvas :id="deckglCanvas" class="z-[2] h-full w-full" />
      <MapAnnotationEditor
        v-if="store.showMapAnnotationPopup"
        class="absolute z-[4]"
        :annotation-props="store.mapAnnotationPopup"
        :style="{
          top: `${store.mapAnnotationPopup.coords[1]}px`,
          left: `${store.mapAnnotationPopup.coords[0]}px`,
        }"
      />
      <!-- <InfoPanel
        class="z-[4]"
        :settings="InfoPanelSettings"
        @settings-changed="settingsChanged"
      /> -->
    </div>

    <!-- <div
      class="absolute top-0 z-[2] m-4 w-fit transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
    >
      {{ text }}
    </div> -->

    <div
      id="tooltip"
      class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
      style="display: none"
    />
    <ElementSelector
      class="absolute bottom-0 w-full z-[4] mb-4"
      :time_type="props.time_type"
    />
    <CharacteristicViewer
      :time_type="props.time_type"
      class="absolute top-0 right-0 z-[4] m-4"
    />
    <div
      class="flex flex-col justify-start items-start absolute top-0 left-0 z-[4] m-4 overflow-auto w-[500px] gap-2 h-full"
    >
      <ModelInfoViewer :time_type="props.time_type" />
      <ChatbotInterface />
    </div>
    <aside
      class="absolute bottom-0 right-0 h-fit z-[4] w-fit p-5 bg-gray-200 overflow-auto"
    >
      <div
        class="flex flex-col h-full w-fit items-center justify-evenly p-2 rounded-lg text-center gap-4"
      >
        <Button label="Recalculate MDE" @click="recalculateMDE" />
        <ToggleButton
          v-model="isHidingSurface"
          on-label="Show Distribution"
          off-label="Hide Distribution"
          @change="handleButtons"
        />
        <ToggleButton
          v-model="isHiding3D"
          on-label="Show 3D"
          off-label="Hide 3D"
          @change="handleButtons"
        />
        <SelectButton
          v-model:="store.mapMode"
          :options="modeOptions"
          @change="handleMapModeChanged"
        />
        <!-- <Button label="Get Characteristic" @click="getCharacteristic" /> -->
        <div class="flex flex-col items-center gap-2 text-center">
          <div class="font-bold flex flex-row">Showing {{ time_type }}</div>
          <!-- <Button
            v-for="month in timeTypeMonths[time_type].map((d) => months[d - 1])"
            :key="month"
            class="p-2 hover:ring-2 hover:bg-slate-300"
            :label="month"
            outlined
            @mouseover="handleMonthHoveredChanged(month, true)"
            @mouseout="handleMonthHoveredChanged(month, false)"
          /> -->
          <!-- <div class="font-bold flex flex-row items-center justify-center">
            Streamlines Settings
            <ProgressSpinner
              v-if="isCalculatingVectorField"
              strokeWidth="8"
              class="h-8 w-8"
            />
          </div>
          <Dropdown
            v-model="selectedStreamLinesModel"
            :options="models"
            option-label="name"
            class="m-2"
            placeholder="Select a Model"
            @change="handleVectorFieldChanged"
          />
          <Dropdown
            v-model="selectedStreamLinesCmp1"
            :options="types"
            option-label="name"
            class="m-2"
            placeholder="Select CMP1"
            @change="handleVectorFieldChanged"
          />
          <Dropdown
            v-model="selectedStreamLinesCmp2"
            :options="types"
            option-label="name"
            class="m-2"
            placeholder="Select CMP2"
            @change="handleVectorFieldChanged"
          />
          <Dropdown
            v-model="selectedStreamLineMonth"
            :options="timeTypeMonths[time_type]"
            class="m-2"
            placeholder="Select Month"
            @change="handleVectorFieldChanged"
          /> -->
        </div>
      </div>
    </aside>
    <NodeInspector
      v-if="imgSrc != ''"
      class="absolute top-0 left-0 z-[2]"
      :img-src="imgSrc"
      @close-node-inspector="imgSrc = ''"
    />
    <div v-if="isRecalculatingMDE" class="overlay">
      <div class="overlay-text">Recalculating MDE...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, nextTick } from "vue";
import { storeToRefs } from "pinia";

// DECK IMPORTS
import { Deck } from "@deck.gl/core/typed";
import { LayersList } from "@deck.gl/core";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { Layer } from "deck.gl/typed";

// STORE IMPORT
import { useStore } from "@/store/main";

// UI ELEMENTS IMPORT
import NodeInspector from "./ui/NodeInspector.vue";
import MapAnnotationEditor from "./ui/MapAnnotationEditor.vue";
import ElementSelector from "./ui/ElementSelector.vue";
import CharacteristicViewer from "./ui/CharacteristicViewer.vue";
import ModelInfoViewer from "./ui/ModelInfoViewer.vue";
import ChatbotInterface from "./ui/ChatbotInterface.vue";

// LAYER GENERATORS IMPORT
import { AbstractLayerGenerator } from "./utils/AbstractLayerGenerator";

import { NodeLayer } from "./utils/NodeLayer";
import { NodeClassifyLayer } from "./utils/NodeClassifyLayer";
import { Node3DLayer } from "./utils/Node3DLayer";
import { ParticleAdvectionLayer } from "./utils/ParticleAdvectionLayer";
import { ExplainabilityLayer } from "./utils/ExplainabilityLayer";
import { SpaceAnnotationLayer } from "./utils/SpaceAnnotationLayer";
import { SOMLayer } from "./utils/SOMLayer";
import { AxisLayer } from "./utils/AxisLayer";

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
import { get } from "@vueuse/core";

const members = sspAllLabels;
const models = ref(
  Array.from(new Set(members.map((member) => member.model_name))).map(
    (model) => {
      return { name: model };
    }
  )
);
models.value.push({ name: "All" });
const types = ref(
  Array.from(new Set(members.map((member) => member.ssp))).map((type) => {
    return { name: type };
  })
);
const props = defineProps({
  isHistorical: Boolean,
  time_type: timeType,
});

let layerList: LayersList = [];
let settings = {};

let layerGenerators: AbstractLayerGenerator[] = [];

const store = useStore();
let deck: any = null;

const deckglCanvas = `deck-canvas-projection-viewer-${Math.random()}`;

const imgSrc = ref("");
watch(imgSrc, (newVal) => {
  console.log("imgSrc changed", newVal);
  drawAllLayers();
});
const message = ref("");
const timerange = ref([0, props.isHistorical ? 64 : 85]);
const monthTemp1 = ref("October");
const monthTemp2 = ref("October");
watch([monthTemp1, monthTemp2], ([m1, m2]) => {
  monthRange.value = [months.indexOf(m1) + 1, months.indexOf(m2) + 1];
});
const monthRange = ref([10, 10]);
const timeMin = 0;
const timeMax = computed(() => {
  let ret = props.isHistorical ? 64 : 85;
  if (isWaterYearMean.value) ret--;
  return ret;
});
const selectedModel = ref([[], []]);
const isHidingSurface = ref(false);
const isHiding3D = ref(false);
const isWaterYearMean = ref(false);
const isRecalculatingMDE = ref(false);
const isCalculatingVectorField = ref(false);
const monthHovered = ref(null);
watch(monthHovered, (newVal) => {
  console.log("monthHovered changed", newVal);
});

const selectedStreamLinesModel = ref();
const selectedStreamLineMonth = ref();
const selectedStreamLinesCmp1 = ref();
const selectedStreamLinesCmp2 = ref();

const mode = ref("Explore");
const modeOptions = ["Explore", "Annotate"];

// const text = ref(props.isHistorical ? "Historical" : "SSP370");

onMounted(() => {
  deck = new Deck({
    ...DECKGL_SETTINGS,
    canvas: deckglCanvas,
    views: mapView,
  });
  deck.canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());

  initializeLayers().then((layers) => {
    layerList = layers.map((d) =>
      d.id == "nebula"
        ? d
        : d.clone({
            coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
            coordinateOrigin: [0, 0, 0],
          })
    );
    setLayerProps();
  });
  watch(
    () => store.getHighlightedNodes,
    async () => {
      console.log("DEBUG STORE.getHighlightedNodes");
      await nextTick();
      drawAllLayers();
    }
  );

  watch(
    () => store.getHoveredFile,
    async () => {
      message.value = "Loading...";
      await nextTick();
      drawAllLayers();
    }
  );
  watch(
    () => [store.getFiles, store.monthsSelected],
    async ([files, months]) => {
      if (!files) return;
      await nextTick();
      drawAllLayers();
    }
  );
  watch(
    () => [store.getNodeMap(props.time_type), store.getExlainablityPoints],
    () => {
      drawAllLayers();
    },
    { deep: true }
  );
  watch(
    () => store.getRedrawFlag,
    () => {
      drawAllLayers();
    }
  );
});

async function initializeLayers() {
  // Set up layer generators
  const {
    getNodeMap,
    getHotspotPolygons,
    getClassifyData,
    getContourData,
    getInterpolatedSurfaceData,
    getPathData,
    getYearsSelected,
    getMonthsSelected,
    getFiles,
    getSubsetType,
    getHoveredFile,
    getVectorFieldData,
    getExlainablityPoints,
    getHighlightedNodes,
    anchors,
  } = storeToRefs(store);
  let nodeLayerGenerator = new NodeLayer({
    dataset_type: dataset_name,
    time_type: props.time_type,
    nodeMapGetter: getNodeMap,
    highlightedNodeGetter: getHighlightedNodes,
    imgSrc: imgSrc,
    drawEveryN: 7,
    dims: 30,
    deck: deck,
    anchors: anchors,
  });
  let nodeclassifyLayerGenerator = new NodeClassifyLayer({
    mappingDataGetter: getNodeMap,
    hotspotPolygonsGetter: getHotspotPolygons,
    classifyDataGetter: getClassifyData,
    contourDataGetter: getContourData,
    monthHovered: monthHovered,
    interpolatedSurfaceGetter: getInterpolatedSurfaceData,
    time_type: props.time_type,
  });
  let axisLayerGenerator = new AxisLayer(-100, 100, 100, true);
  // let axisLayerGenerator = new AxisLayer(-1000, 1000, 50, true);

  let xMin = Math.min(
    ...store.nodeMap[props.time_type].map((d) => d.coords[0])
  );
  let xMax = Math.max(
    ...store.nodeMap[props.time_type].map((d) => d.coords[0])
  );
  let yMin = Math.min(
    ...store.nodeMap[props.time_type].map((d) => d.coords[1])
  );
  let yMax = Math.max(
    ...store.nodeMap[props.time_type].map((d) => d.coords[1])
  );

  let somLayerGenerator = new SOMLayer({
    nodeMapGetter: getNodeMap,
    pathDataGetter: getPathData,
    timeRange: getYearsSelected,
    monthRange: getMonthsSelected,
    model: getFiles,
    subsetType: getSubsetType,
    hoveredFile: getHoveredFile,
    extent: [
      [xMin, xMax],
      [yMin, yMax],
    ],
    interpolatedSurface: store.interpolatedSurfaceData[props.time_type],
    time_type: props.time_type,
  });

  let node3DLayerGenerator = new Node3DLayer({
    interpolatedSurfaceGetter: getInterpolatedSurfaceData,
    mappingDataGetter: getNodeMap,
    meanPerNodeGetter: getClassifyData,
    monthHovered: monthHovered,
    hotspotPolygonsGetter: getHotspotPolygons,
    time_type: props.time_type,
  });

  let particleAdvectionLayerGenerator = new ParticleAdvectionLayer({
    vectorFieldGetter: getVectorFieldData,
    time_type: props.time_type,
  });

  let explainabilityLayerGenerator = new ExplainabilityLayer({
    explainablityPointsGetter: getExlainablityPoints,
    deck: deck,
  });

  let spaceAnnotationLayerGenerator = new SpaceAnnotationLayer();

  layerGenerators = [
    // axisLayerGenerator,
    nodeLayerGenerator,
    somLayerGenerator,
    nodeclassifyLayerGenerator,
    node3DLayerGenerator,
    particleAdvectionLayerGenerator,
    // explainabilityLayerGenerator,
    spaceAnnotationLayerGenerator,
  ];
  // Get the layers
  layerList = layerGenerators.map((g) => g.getLayers()).flat();
  return layerList;
}

function drawAllLayers() {
  // Need to make sure that the 'watch's on the layer generators are flagged with a nextTick()
  nextTick(() => {
    layerList = layerGenerators
      .map((g) => {
        return g.getLayers().map(
          (d: Layer) =>
            d.id == "nebula"
              ? d
              : d.clone({
                  coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
                  coordinateOrigin: [0, 0, 0],
                })
          // d.clone({
          //   coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
          //   coordinateOrigin: [0, 0, 0],
          // })
        );
      })
      .flat();

    if (layerList.length == 0) return;
    handleButtons();
    setLayerProps();
    // message.value = "DONE!";
  });
}

function setLayerProps() {
  deck.setProps({ layers: layerList });
}

async function recalculateMDE() {
  isRecalculatingMDE.value = true;
  await store.updateMDE(store.anchors);
  // store.anchors = { ids: [], coords: [] };
  console.log("MDE recalculated");
  drawAllLayers();
  isRecalculatingMDE.value = false;
  handleVectorFieldChanged();
}

function handleButtons() {
  layerList = layerList.map((l) => {
    if (l.id.startsWith("polygon-layer")) {
      return l.clone({ visible: !isHidingSurface.value });
    } else if (l.id.startsWith("node3d")) {
      return l.clone({ visible: !isHiding3D.value });
    } else {
      return l.clone();
    }
  });
  setLayerProps();
}

function handleMonthHoveredChanged(month, hovered) {
  monthHovered.value = hovered ? months.indexOf(month) + 1 : null;
  drawAllLayers();
}

function checkValidStreamLines() {
  return (
    selectedStreamLinesModel?.value &&
    selectedStreamLinesCmp1?.value &&
    selectedStreamLinesCmp2?.value &&
    selectedStreamLineMonth?.value
  );
}

async function handleVectorFieldChanged() {
  if (!checkValidStreamLines()) return;
  let selectedModels = [selectedStreamLinesModel.value.name];
  if (selectedStreamLinesModel.value.name == "All") {
    selectedModels = sspAllLabels.map((d) => d.model_name);
  }
  isCalculatingVectorField.value = true;
  await store.updateVectorFieldSetting([
    dataset_name,
    selectedModels,
    // [selectedStreamLinesModel.value.name],
    props.time_type,
    [selectedStreamLinesCmp1.value.name, selectedStreamLinesCmp2.value.name],
    selectedStreamLineMonth.value,
  ]);
  isCalculatingVectorField.value = false;
  drawAllLayers();
}

function handleMapModeChanged({ value }) {
  if (value == "Annotate") {
    let spaceAnnotationLayer = layerList.find((d) => d.id == "nebula");
    console.log("DEBUG ANNOTATE", spaceAnnotationLayer);
    deck.setProps({
      getCursor: spaceAnnotationLayer.getCursor.bind(spaceAnnotationLayer),
    });
  } else {
    deck.setProps({
      getCursor: ({ isDragging }) => (isDragging ? "grabbing" : "grab"),
    });
  }
  drawAllLayers();
}
</script>

<style scoped>
.slider {
  --slider-tooltip-font-size: 1.5rem;
}
</style>
