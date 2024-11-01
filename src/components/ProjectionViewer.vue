<template>
  <div class="relative h-full w-full">
    <div class="relative h-full w-full">
      <canvas :id="deckglCanvas" class="z-[2] h-full w-full" />
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
    <div
      class="absolute bottom-0 z-[4] flex w-fit flex-col items-center justify-around p-4"
    >
      <!-- <div
        id="message"
        class="flex items-center font-bold text-xl px-5 bg-gray-200 p-2 rounded-lg"
      >
        {{ message }}
      </div> -->
      <!-- <Slider
        v-model="timeRange"
        :format="formatTooltipTime"
        :min="timeMin"
        :max="timeMax"
        class="slider z-[4] w-3/4"
      /> -->

      <div
        class="flex flex-row w-fit items-center justify-evenly p-2 rounded-lg text-center gap-4"
      >
        <!-- <span class="flex items-center font-bold px-5"> Start: </span> -->
        <!-- <Dropdown
          v-model="monthTemp1"
          :disabled="isWaterYearMean"
          :options="months"
          class="w-fit z-[4] md:w-14rem"
          checkmark
          :highlight-on-select="false"
          placeholder="Starting Month"
        />
        <span class="flex items-center font-bold px-5"> End: </span>
        <Dropdown
          v-model="monthTemp2"
          :disabled="isWaterYearMean"
          :options="months"
          class="w-fit z-[4]"
          checkmark
          :highlight-on-select="false"
          placeholder="Ending Month"
        />
        <ToggleButton
          v-model="isWaterYearMean"
          onLabel="Disable Water Year Mean"
          offLabel="Enable Water Year Mean"
          class="px-5"
        /> -->
        <!-- <ToggleButton
          v-model="isHidingSurface"
          @change="toggleShowSurface"
          onLabel="Show Surface"
          offLabel="Hide Surface"
        /> -->
        <ToggleButton
          v-model="isHidingSurface"
          @change="handleButtons"
          onLabel="Show Distribution"
          offLabel="Hide Distribution"
        />
        <ToggleButton
          v-model="isHiding3D"
          @change="handleButtons"
          onLabel="Show 3D"
          offLabel="Hide 3D"
        />
        <Button @click="recalculateMDE" label="Recalculate MDE" />
        <div class="flex flex-row items-center gap-4 text-center bg-white">
          <div class="font-bold flex flex-row">
            Showing {{ time_type }}
            <!-- Hover on the months to see the patterns! -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <Button
            v-for="month in timeTypeMonths[time_type].map((d) => months[d - 1])"
            :key="month"
            class="bg-slate-200 p-2 hover:ring-2 hover:bg-slate-300"
            :label="month"
            @mouseover="handleMonthHoveredChanged(month, true)"
            @mouseout="handleMonthHoveredChanged(month, false)"
            outlined
          />
        </div>
        <!-- <Divider layout="vertical" /> -->
        <!-- <Button label="Apply" @click="yearMonthChanged" class="px-5" /> -->
      </div>
      <!-- <Slider
        v-model="monthRange"
        :format="formatTooltipMonth"
        :min="1"
        :max="12"
        :step="1"
        class="slider z-[4] w-full"
        @change="drawAllLayers"
      /> -->
    </div>
    <NodeInspector
      class="absolute top-0 left-0 z-[2]"
      :img-src="imgSrc"
      @close-node-inspector="imgSrc = ''"
      v-if="imgSrc != ''"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, nextTick } from "vue";
import { storeToRefs } from "pinia";

import { Deck } from "@deck.gl/core";

import { LayersList, AmbientLight } from "@deck.gl/core";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import NodeInspector from "./ui/NodeInspector.vue";
import { COORDINATE_SYSTEM } from "@deck.gl/core";

import { AbstractLayerGenerator } from "./utils/AbstractLayerGenerator";

import { NodeLayer } from "./utils/NodeLayer";
import { NodeClassifyLayer } from "./utils/NodeClassifyLayer";
import ToggleButton from "primevue/togglebutton";
import Button from "primevue/button";

import {
  mapView,
  DECKGL_SETTINGS,
  generateMonthRangeList,
  months,
  subsetType,
  dataset_name,
  timeType,
  timeTypeMonths,
} from "./utils/utils";
import { Layer } from "deck.gl/typed";
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
const timeRange = ref([0, props.isHistorical ? 64 : 85]);
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
const monthHovered = ref(null);
watch(monthHovered, (newVal) => {
  console.log("monthHovered changed", newVal);
});

// const text = ref(props.isHistorical ? "Historical" : "SSP370");

onMounted(() => {
  deck = new Deck({
    ...DECKGL_SETTINGS,
    canvas: deckglCanvas,
    views: mapView,
    getTooltip: ({ object }) => {
      if (!object) return;
      console.log(object);

      return {
        html: `<div>${object.message}</div>`,
        style: {
          fontSize: "0.8em",
          "z-index": 10,
        },
      };
    },
  });

  initializeLayers().then((layers) => {
    layerList = layers.map((d) =>
      d.clone({
        coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
        coordinateOrigin: [0, 0, 0],
      })
    );
    setLayerProps();
  });

  watch(
    () => store.getHoveredFile,
    async () => {
      message.value = "Loading...";
      await nextTick();
      drawAllLayers();
    }
  );
  watch(
    () => store.getFiles,
    async (files) => {
      if (!files) return;
      message.value = "Loading...";
      await nextTick();
      drawAllLayers();
    }
  );
  watch(
    () => store.getNodeMap(props.time_type),
    () => {
      drawAllLayers();
    },
    { deep: true }
  );
});

async function initializeLayers() {
  // Set up layer generators
  const { getNodeMap, isEditingMap, anchors } = storeToRefs(store);
  let nodeLayerGenerator = new NodeLayer({
    dataset_type: dataset_name,
    time_type: props.time_type,
    nodeMapGetter: getNodeMap,
    imgSrc: imgSrc,
    drawEveryN: 13,
    dims: 30,
    deck: deck,
    isEditingMap: isEditingMap,
    anchors: anchors,
  });
  let nodeclassifyLayerGenerator = new NodeClassifyLayer({
    mappingData: store.nodeMap[props.time_type],
    hotspotPolygons: store.hotspotPolygons[props.time_type],
    classifyData: store.classifyData[props.time_type],
    contourData: store.contourData[props.time_type],
    // hotspotPolygons,
    // classifyData,
    // contourData,
    monthHovered: monthHovered,
    interpolatedSurface: store.interpolatedSurfaceData[props.time_type],
  });
  let axisLayerGenerator = new AxisLayer(-100, 100, 5, true);
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

  // let somLayerGenerator = new SOMLayer({
  //   data: store.pathData[props.time_type],
  //   timeRange: getYearsSelected,
  //   monthRange: getMonthsSelected,
  //   model: getFiles,
  //   subsetType: getSubsetType,
  //   hoveredFile: getHoveredFile,
  //   extent: [
  //     [xMin, xMax],
  //     [yMin, yMax],
  //   ],
  //   interpolatedSurface: store.interpolatedSurfaceData[props.time_type],
  // });

  // let node3DLayerGenerator = new Node3DLayer({
  //   interpolatedSurface: store.interpolatedSurfaceData[props.time_type],
  //   mappingData: store.nodeMap[props.time_type],
  //   meanPerNode: store.classifyData[props.time_type],
  //   monthHovered: monthHovered,
  //   hotspotPolygons: store.hotspotPolygons[props.time_type],
  // });

  layerGenerators = [
    axisLayerGenerator,
    nodeLayerGenerator,
    // somLayerGenerator,
    nodeclassifyLayerGenerator,
    // node3DLayerGenerator,
  ];

  // Get the layers
  // layerList = layerGenerators.map((g) => g.getLayers()).flat();
  layerList = layerGenerators
    .map((g) => {
      return g.getLayers();
    })
    .flat();
  return layerList;
}

function drawAllLayers() {
  // Need to make sure that the 'watch's on the layer generators are flagged with a nextTick()
  nextTick(() => {
    layerList = layerGenerators
      .map((g) => {
        return g.getLayers().map((d: Layer) =>
          d.clone({
            coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
            coordinateOrigin: [0, 0, 0],
          })
        );
      })
      .flat();

    if (layerList.length == 0) return;
    handleButtons();
    setLayerProps();
    message.value = "DONE!";
  });
}

function settingsChanged(updatedSettings) {
  settings = { ...settings, ...updatedSettings };
  if (settings["variant"]) {
    selectedModel.value[0] = settings["variant"];
  }
  drawAllLayers();
  console.log("setting changed", selectedModel.value);
}

function yearMonthChanged() {
  nextTick(() => {
    let allMonths = monthRange.value[0] == 1 && monthRange.value[1] == 12;
    let allYears =
      timeMin == timeRange.value[0] && timeMax.value == timeRange.value[1];

    store.updateElements({
      files: store.getFiles,
      monthsSelected: allMonths
        ? [-1]
        : generateMonthRangeList(monthRange.value[0], monthRange.value[1]),
      // numbers from timeMin to timeMax.value inclusive
      // yearsSelected: allYears
      //   ? Array.from({ length: timeMax.value - timeMin + 1 }, (_, i) => i)
      //   : [timeRange.value[0], timeRange.value[1]],
      yearsSelected: Array.from(
        { length: timeMax.value - timeMin + 1 },
        (_, i) => i
      ),
      subsetType: isWaterYearMean.value
        ? subsetType.waterYear
        : subsetType.month,
    });
    drawAllLayers();
  });
}

function setLayerProps() {
  deck.setProps({ layers: layerList });
}

async function recalculateMDE() {
  await store.updateMDE(store.anchors);
  store.anchors = { ids: [], coords: [] };
  console.log("MDE recalculated");
  layerGenerators.forEach((layer) => (layer.needsToRedraw = true));
  drawAllLayers();
}

function handleButtons() {
  layerList = layerList.map((l) => {
    if (l.id.startsWith("curve-heatmap")) {
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
</script>

<style scoped>
.slider {
  --slider-tooltip-font-size: 1.5rem;
}
</style>
