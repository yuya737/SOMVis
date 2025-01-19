<template>
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
    <div
      class="flex flex-col justify-start items-end absolute top-0 right-0 z-[4] m-4 overflow-auto w-fit gap-2 h-fit max-h-[100%]"
    >
      <CharacteristicViewer
        :time_type="props.time_type"
        :isComparison="props.isComparison"
        :isShowingVectorField="props.isShowingVectorField"
      />
      <div
        class="flex flex-col h-fit w-fit items-center justify-center p-2 rounded-lg text-center gap-4 bg-gray-100 rounded-lg shadow-md p-6"
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
        </div>
      </div>
    </div>
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

// PRIMEVUE IMPORTS
import ToggleButton from "primevue/togglebutton";
import Dropdown from "primevue/dropdown";
import ProgressSpinner from "primevue/progressspinner";
import SelectButton from "primevue/selectbutton";
import Button from "primevue/button";

// STORE IMPORT
import { useStore } from "@/store/main";

// UI ELEMENTS IMPORT
import CharacteristicViewer from "./CharacteristicViewer.vue";
import MapAnnotationEditor from "./MapAnnotationEditor.vue";

// LAYER GENERATORS IMPORT
import { AbstractLayerGenerator } from "@/components/utils/AbstractLayerGenerator";

import { NodeLayer } from "@/components/utils/NodeLayer";
import { NodeClassifyLayer } from "@/components/utils/NodeClassifyLayer";
import { Node3DLayer } from "@/components/utils/Node3DLayer";
import { ParticleAdvectionLayer } from "@/components/utils/ParticleAdvectionLayer";
import { ExplainabilityLayer } from "@/components/utils/ExplainabilityLayer";
import { SpaceAnnotationLayer } from "@/components/utils/SpaceAnnotationLayer";
import { SOMLayer } from "@/components/utils/SOMLayer";
import { AxisLayer } from "@/components/utils/AxisLayer";

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
} from "@/components/utils/utils";

const props = defineProps({
  time_type: timeType,
  isComparison: Boolean,
  isShowingVectorField: Boolean,
});

let layerList: LayersList = [];
let settings = {};

let layerGenerators: AbstractLayerGenerator[] = [];

const store = useStore();
let deck: any = null;

const deckglCanvas = `deck-canvas-projection-viewer-${Math.random()}`;

const mode = ref("Explore");
const modeOptions = ["Explore", "Annotate"];
const isHidingSurface = ref(false);
const isHiding3D = ref(false);
const isRecalculatingMDE = ref(false);

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

  let debounceTimer = null;

  watch(
    () => props.isShowingVectorField,
    async (newVal) => {
      if (newVal) {
        await nextTick();
        drawAllLayers();
      }
    }
  );

  watch(
    props.isComparison ? () => store.getFiles[0] : () => store.getFiles[1],
    async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        console.log(
          "DEBUG PROJECTION DECKGL GET FILE CHANGE VECTOR FIELD NO CHANGE AFTER 3s"
        );
        // getComparisonVectorField();
        if (!store.getFiles) return;
        await nextTick();
        drawAllLayers();
      }, 3000);
    }
  );

  watch(
    () => [
      store.monthsSelected,
      store.getHoveredFile,
      store.getHighlightedNodes,
      store.getRedrawFlag,
    ],
    async () => {
      await nextTick();
      drawAllLayers();
    }
  );
  watch(
    () => [
      store.getNodeMap(props.time_type),
      store.getExlainablityPoints,
      store.anchors,
    ],
    () => {
      drawAllLayers();
    },
    { deep: true }
  );
});

const imgSrc = ref("");
watch(imgSrc, (newVal) => {
  console.log("imgSrc changed", newVal);
  drawAllLayers();
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

  const curGetFiles = computed(() =>
    props.isComparison ? getFiles.value[1] : getFiles.value[0]
  );

  let somLayerGenerator = new SOMLayer({
    nodeMapGetter: getNodeMap,
    pathDataGetter: getPathData,
    timeRange: getYearsSelected,
    monthRange: getMonthsSelected,
    model: curGetFiles,
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
    nodeclassifyLayerGenerator,
    node3DLayerGenerator,
    particleAdvectionLayerGenerator,
    somLayerGenerator,
    // explainabilityLayerGenerator,
    spaceAnnotationLayerGenerator,
  ];
  // Get the layers
  layerList = layerGenerators.map((g) => g.getLayers()).flat();
  return layerList;
}

function filterComparisonLayers(layerList) {
  return layerList.filter((layer) => {
    if (props.isShowingVectorField && layer.id.startsWith("polygon-layer"))
      return false;
    if (!props.isShowingVectorField && layer.id.startsWith("vector-field"))
      return false;
    return true;
  });
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
    layerList = filterComparisonLayers(layerList);

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
