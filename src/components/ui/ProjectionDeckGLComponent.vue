<template>
  <div class="relative h-full w-full">
    <canvas :id="deckglCanvas" class="z-[2] h-full w-full" />
    <MapAnnotationEditor
      v-if="store.showMapAnnotationPopup"
      class="absolute z-[4] cursor-grab active:cursor-grabbing"
      :annotation-props="store.mapAnnotationPopup"
      :time_type="props.time_type"
      :style="{
        top: `${store.mapAnnotationPopup.coords[1] + position.y}px`,
        left: `${store.mapAnnotationPopup.coords[0] + position.x}px`,
      }"
      @mousedown="startDrag"
    />
    <div
      class="projection-deckgl-sidebar absolute right-0 top-0 z-[4] m-4 flex h-fit w-fit flex-col items-end justify-start gap-2 overflow-auto"
    >
      <CharacteristicViewer
        v-if="store.currentStep == 'Analyze'"
        :time_type="props.time_type"
        :is-comparison="props.isComparison"
        :is-showing-vector-field="props.isShowingVectorField"
      />
      <MemberViewer
        v-if="store.currentStep == 'Analyze'"
        :time_type="props.time_type"
        :is-comparison="props.isComparison"
        :is-showing-vector-field="props.isShowingVectorField"
        :is-showing-comparison="props.isShowingComparison"
      />
    </div>
    <!-- <NodeInspector
      v-if="imgSrc != ''"
      class="absolute left-0 top-0 z-[2]"
      :img-src="imgSrc"
      @close-node-inspector="imgSrc = ''"
    /> -->
    <div v-if="isRecalculatingMDE" class="overlay">
      <div class="overlay-text">
        Recalculating mapping based on the given anchors...
      </div>
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
import { CollisionFilterExtension } from "@deck.gl/extensions";

// STORE IMPORT
import { useStore } from "@/store/main";

// UI ELEMENTS IMPORT
import CharacteristicViewer from "./CharacteristicViewer.vue";
import MapAnnotationEditor from "./MapAnnotationEditor.vue";

// LAYER GENERATORS IMPORT
import { AbstractLayerGenerator } from "@/components/utils/AbstractLayerGenerator";

import { NodeLayer } from "@/components/utils/NodeLayer";
import { NodeClassifyLayer } from "@/components/utils/NodeClassifyLayer";
import { ParticleAdvectionLayer } from "@/components/utils/ParticleAdvectionLayer";
import { SpaceAnnotationLayer } from "@/components/utils/SpaceAnnotationLayer";
import { SOMLayer } from "@/components/utils/SOMLayer";
import { LLMRegionLayer } from "@/components/utils/LLMRegionLayer";

import { mapView, DECKGL_SETTINGS, timeType } from "@/components/utils/utils";
import MemberViewer from "../MemberViewer.vue";
import { get } from "@vueuse/core";

let isDragging = false;
const position = ref({ x: 0, y: 0 });
let offset = { x: 0, y: 0 };

const startDrag = (event) => {
  console.log(event.target);
  if (event.target.closest(".no-drag")) return;
  isDragging = true;
  offset = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
};

const onDrag = (event) => {
  if (isDragging) {
    console.log(position);
    position.value.x = event.clientX - offset.x;
    position.value.y = event.clientY - offset.y;
  }
};

const stopDrag = () => {
  isDragging = false;
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
};

const props = defineProps({
  time_type: timeType,
  isComparison: Boolean,
  isShowingComparison: Boolean,
  isShowingVectorField: Boolean,
});

let layerList: LayersList = [];

let layerGenerators: AbstractLayerGenerator[] = [];

const store = useStore();
let deck: any = null;

const deckglCanvas = `deck-canvas-projection-viewer-${Math.random()}`;

const isHiding3D = ref(false);
const isRecalculatingMDE = ref(false);

watch(
  () => store.currentStep,
  (newVal) => {
    if (newVal == "Analyze") {
      const elementSelectorHeight =
        document.getElementById("element-selector").offsetHeight;
      document.documentElement.style.setProperty(
        "--footer-height",
        `${elementSelectorHeight}px`
      );
    }
  }
);

onMounted(() => {
  deck = new Deck({
    ...DECKGL_SETTINGS,
    glOptions: {
      preserveDrawingBuffer: true,
    },
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
    props.isComparison ? () => store.getFiles[1] : () => store.getFiles[0],
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
      store.nodeClickedID,
      store.isHidingDistribution,
      store.currentStep,
      store.LLMQueriedRegionIndex,
      store.isShowingLLMQueriedRegion,
      store.isHidingAnnotations,
    ],
    async () => {
      console.log("DEBUG PROJECTIONDECKGL REDRAW");
      await nextTick();
      drawAllLayers();
    }
  );
  watch(
    () => [store.getNodeMap(props.time_type), store.anchors],
    () => {
      drawAllLayers();
    },
    { deep: true }
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
    getLLMQueryResult,
    getHighlightedNodes,
    getContourLevels,
    anchors,
    nodeClickedID,
    currentStep,
    LLMQueriedRegionIndex,
    isShowingLLMQueriedRegion,
    isHidingAnnotations,
  } = storeToRefs(store);
  let nodeLayerGenerator = new NodeLayer({
    dataset_type: store.currentDatasetType,
    time_type: props.time_type,
    nodeMapGetter: getNodeMap,
    highlightedNodeGetter: getHighlightedNodes,
    drawEveryN: 3,
    dims: 30,
    deck: deck,
    anchors: anchors,
    nodeClickedID: nodeClickedID,
    currentStep: currentStep,
  });
  let nodeclassifyLayerGenerator = new NodeClassifyLayer({
    mappingDataGetter: getNodeMap,
    hotspotPolygonsGetter: getHotspotPolygons,
    classifyDataGetter: getClassifyData,
    contourDataGetter: getContourData,
    interpolatedSurfaceGetter: getInterpolatedSurfaceData,
    time_type: props.time_type,
    currentStep: currentStep,
  });

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
    contourLevelGetter: getContourLevels,
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
    currentStep: currentStep,
  });

  let particleAdvectionLayerGenerator = new ParticleAdvectionLayer({
    vectorFieldGetter: getVectorFieldData,
    time_type: props.time_type,
    currentStep: currentStep,
  });

  let spaceAnnotationLayerGenerator = new SpaceAnnotationLayer({
    currentStep: currentStep,
    isHidingAnnotationsGetter: isHidingAnnotations,
  });

  let llmRegionLayerGenerator = new LLMRegionLayer({
    nodeMapGetter: getNodeMap,
    indexToShow: LLMQueriedRegionIndex,
    LLMQueryGetter: getLLMQueryResult,
    isShowingLLMRegion: isShowingLLMQueriedRegion,
    time_type: props.time_type,
  });

  layerGenerators = [
    nodeLayerGenerator,
    nodeclassifyLayerGenerator,
    particleAdvectionLayerGenerator,
    somLayerGenerator,
    spaceAnnotationLayerGenerator,
    llmRegionLayerGenerator,
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

function drawAllLayers(afterMDE = false) {
  // Need to make sure that the 'watch's on the layer generators are flagged with a nextTick()
  nextTick(() => {
    layerList = layerGenerators
      .map((g) => {
        return g.getLayers().map((d: Layer) => {
          let ret = d;
          if (d.id !== "nebula") {
            ret = ret.clone({
              coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
              coordinateOrigin: [0, 0, 0],
            });
          }
          if (d.id.startsWith("image-layer")) {
            ret = ret.clone({
              transitions: { bounds: afterMDE ? 1000 : 0 },
            });
          }
          ret = addTextCollisionFilter(ret);
          return ret;
        });
      })
      .flat();
    layerList = filterComparisonLayers(layerList);

    if (layerList.length == 0) return;
    handleButtons();
    setLayerProps();
    // message.value = "DONE!";
  });
}

function handleButtons() {
  layerList = layerList.map((l) => {
    if (l.id.startsWith("polygon-layer")) {
      return l.clone({ visible: !store.isHidingDistribution });
    } else if (l.id.startsWith("node3d")) {
      return l.clone({ visible: !isHiding3D.value });
    } else {
      return l.clone();
    }
  });
  setLayerProps();
}
function addTextCollisionFilter(layer) {
  const getCollisionPriority = (layer_id) => {
    if (layer_id === "text-layer-SpaceAnnotationTextLayer") {
      return 3; // Highest priority for space annotation text
    }
    if (layer_id.startsWith("text-layer-polygon-layer-label")) {
      return 2;
    }
    if (layer_id === "text-layer-percentile") {
      return 1;
    }
    console.log("SDF");
    return 0;
  };

  // Test that layer is a TextLayer
  if (layer.id.startsWith("text-layer")) {
    return layer.clone({
      extensions: [new CollisionFilterExtension()],
      collisionTestProps: {
        sizeScale: 4,
      },
      getCollisionPriority: getCollisionPriority(layer.id),
    });
  }
  return layer;
}

function setLayerProps() {
  deck.setProps({ layers: layerList });
}

watch(
  () => store.recalculateMDEFlag,
  () => {
    recalculateMDE();
  }
);

async function recalculateMDE() {
  isRecalculatingMDE.value = true;
  await store.updateMDE(store.anchors);
  // store.anchors = { ids: [], coords: [] };
  console.log("MDE recalculated");
  drawAllLayers(true);
  isRecalculatingMDE.value = false;
}

watch(
  () => store.mapMode,
  (newVal) => {
    handleMapModeChanged(newVal);
  }
);

function handleMapModeChanged(value) {
  if (value == "Annotate") {
    let spaceAnnotationLayer = layerList.find((d) => d.id == "nebula");
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

function projectLayerCoordToLngLat([x, y]) {
  // Earth radius in meters (WGS84)
  const R = 6378137; // Radius of Earth in meters

  const latChange = y / R;
  const lonChange = x / R;

  // Convert radians to degrees
  const lat = latChange * (180 / Math.PI); // Convert to degrees
  const lon = lonChange * (180 / Math.PI); // Convert to degrees

  // Reversed coordinates in [longitude, latitude] format
  const reversedLngLat = [lon, lat];

  console.log("Reversed coordinates:", reversedLngLat);

  return reversedLngLat;
}

function toCanvasCoords([screenX, screenY]) {
  const dpr = window.devicePixelRatio; // Get the device pixel ratio

  // Convert screen (CSS) coordinates to canvas coordinates
  const canvasX = screenX * dpr;
  const canvasY = screenY * dpr;
  return [canvasX, canvasY];
}
function cropCanvas() {
  const minX = Math.min(
    ...store.nodeMap[props.time_type].map((d) => d.coords[0])
  );
  const maxX = Math.max(
    ...store.nodeMap[props.time_type].map((d) => d.coords[0])
  );
  const minY = Math.min(
    ...store.nodeMap[props.time_type].map((d) => d.coords[1])
  );
  const maxY = Math.max(
    ...store.nodeMap[props.time_type].map((d) => d.coords[1])
  );

  const expandRange = (min, max, factor) => {
    const range = max - min;
    const padding = range * factor;
    return [min - padding, max + padding];
  };

  const [expandedMinX, expandedMaxX] = expandRange(minX, maxX, 0.2);
  const [expandedMinY, expandedMaxY] = expandRange(minY, maxY, 0.2);

  // Convert to canvas coordinates
  const [canvasExpandedMinX, canvasExpandedMinY] = toCanvasCoords(
    deck
      .getViewports()[0]
      .project(projectLayerCoordToLngLat([expandedMinX, expandedMaxY]))
  );
  const [canvasExpandedMaxX, canvasExpandedMaxY] = toCanvasCoords(
    deck
      .getViewports()[0]
      .project(projectLayerCoordToLngLat([expandedMaxX, expandedMinY]))
  );

  const width = canvasExpandedMaxX - canvasExpandedMinX;
  const height = canvasExpandedMaxY - canvasExpandedMinY;

  const canvas = document.getElementById(deckglCanvas);

  // Get the WebGL2 context
  const gl = canvas.getContext("webgl2");

  // Define the crop area (x, y, width, height)
  const cropArea = {
    x: Math.round(canvasExpandedMinX),
    y: Math.round(canvasExpandedMaxY),
    width: Math.round(width),
    height: Math.round(height),
  };

  // Create a new 2D canvas for the cropped area
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropArea.width;
  croppedCanvas.height = cropArea.height;

  // Get the 2D context of the new canvas
  const ctx = croppedCanvas.getContext("2d");

  // Read the pixel data from the WebGL2 canvas
  const pixelData = new Uint8Array(cropArea.width * cropArea.height * 4); // RGBA (4 channels)

  // Read the pixels from the WebGL canvas
  gl.readPixels(
    cropArea.x,
    deck.canvas.height - cropArea.y,
    cropArea.width,
    cropArea.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixelData
  );

  // Flip the image vertically by reversing the rows
  const flippedPixelData = new Uint8Array(pixelData.length);

  for (let row = 0; row < cropArea.height; row++) {
    const sourceRowOffset = row * cropArea.width * 4;
    const targetRowOffset = (cropArea.height - row - 1) * cropArea.width * 4;
    flippedPixelData.set(
      pixelData.slice(sourceRowOffset, sourceRowOffset + cropArea.width * 4),
      targetRowOffset
    );
  }

  // Create an ImageData object with the flipped pixel data
  const imageData = new ImageData(
    new Uint8ClampedArray(flippedPixelData),
    cropArea.width,
    cropArea.height
  );

  // Draw the ImageData onto the new 2D canvas
  ctx.putImageData(imageData, 0, 0);
  return croppedCanvas;
}

watch(
  // () => [store.currentStep, store.nodeMap[props.time_type]],
  () => store.currentStep,
  (newVal) => {
    if (newVal == "Analyze") return;
    store.isHidingDistribution = true;
    store.isShowingLLMQueriedRegion = false;
    store.isHidingAnnotations = true;
    nextTick(() => {
      requestAnimationFrame(() => {
        console.log("DEBUG: Saving nodemap to canvas");
        const croppedCanvas = cropCanvas();
        store.nodeMapCanvas = croppedCanvas;
        store.isHidingAnnotations = false;
        store.isHidingDistribution = false;
      });
    });
  },
  { deep: true, immediate: true }
);
</script>
