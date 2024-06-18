<template>
  <div class="relative h-full w-full">
    <img class="absolute bottom-0 right-0 z-[4] p-4" :src="imgSrc" />
    <div class="relative h-full w-full">
      <canvas :id="deckglCanvas" class="z-[2] h-full w-full" />
      <InfoPanel
        class="z-[4]"
        :settings="InfoPanelSettings"
        @settings-changed="settingsChanged"
      />
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
      class="absolute bottom-0 z-[4] flex h-32 w-full flex-col items-center justify-around px-32"
    >
      <!-- <div
        id="message"
        class="flex items-center font-bold text-xl px-5 bg-gray-200 p-2 rounded-lg"
      >
        {{ message }}
      </div> -->
      <Slider
        v-model="timeRange"
        :format="formatTooltipTime"
        :min="timeMin"
        :max="timeMax"
        class="slider z-[4] w-3/4"
      />

      <div
        class="flex flex-row w-fit items-center justify-evenly bg-gray-200 p-2 rounded-lg text-center"
      >
        <span class="flex items-center font-bold px-5"> Start: </span>
        <Dropdown
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
        />
        <ToggleButton
          v-model="isHidingSurface"
          @change="toggleShowSurface"
          onLabel="Show Surface"
          offLabel="Hide Surface"
        />
        <!-- <Divider layout="vertical" /> -->
        <Button label="Apply" @click="yearMonthChanged" class="px-5" />
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, nextTick } from "vue";
import { storeToRefs } from "pinia";

import { Deck } from "@deck.gl/core";

import API from "@/api/api";

import { LayersList } from "@deck.gl/core";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import InfoPanel from "./ui/TheInfoPanel.vue";
import InfoPanelSettings from "@/store/InfoPanelSettingsProj.json";

import { AbstractLayerGenerator } from "./utils/AbstractLayerGenerator";

import { SOMLayer } from "./utils/SOMLayer";
import { NodeClassifyLayer } from "./utils/NodeClassifyLayer";
import { NodeLayer } from "./utils/NodeLayer";
import ToggleButton from "primevue/togglebutton";

import {
  orbitView,
  orthoView,
  DECKGL_SETTINGS,
  historicalLabels,
  historicalLabelsSfbay,
  ssp370Labels,
  ssp585Labels,
  approx,
  getModelType,
  generateMonthRangeList,
  months,
  subsetType,
} from "./utils/utils";

// import { subsetType, SOMPath } from "@/types/types";

const props = defineProps({
  isHistorical: Boolean,
});

// let labels = props.isHistorical ? historical_labels : ssp585_labels;
// let labels = props.isHistorical ? historicalLabels : ssp370Labels;
let labels = ssp370Labels;
// let labels = props.isHistorical ? historical_labels_sfbay : ssp370_labels;
// InfoPanelSettings[0].options[0].values = [
//   "All",
//   ...labels.map((d) => getModelType(d)),
// ];

let layerList: LayersList = [];
let settings = {};

let layerGenerators: AbstractLayerGenerator[] = [];

const store = useStore();
let deck: any = null;

const deckglCanvas = `deck-canvas-projection-viewer-${Math.random()}`;

const imgSrc = ref("");
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
const isWaterYearMean = ref(false);
const text = ref(props.isHistorical ? "Historical" : "SSP370");

onMounted(() => {
  deck = new Deck({
    ...DECKGL_SETTINGS,
    canvas: deckglCanvas,
    views: orbitView,
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
    layerList = layers;
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
    // (files) => {
    //   if (!files) return;
    //   console.log("files changed", files);
    //   message.value = "Loading...";
    //   nextTick(() => {
    //     drawAllLayers();
    //   });
    // }
  );
});

async function initializeLayers() {
  // Get all the data
  let mappingData = await API.fetchData(
    // "mapping/CMIP6_pr_historical_S3L0.02_umap",
    "mapping/CMIP6_pr_delta_historical_S5L0.02_umap",
    // "mapping/CMIP6_pr_historical_sfbay_S3L0.1_20x20_umap",
    // "mapping/CMIP6_taxmax_historical_S3L0.1_umap",
    true,
    null
  );
  mappingData = mappingData.map((d, i) => {
    return { ...d, coords: d.coords.map((c) => c * 2) };
  });
  let xMin = Math.min(...mappingData.map((d) => d.coords[0]));
  let xMax = Math.max(...mappingData.map((d) => d.coords[0]));
  let yMin = Math.min(...mappingData.map((d) => d.coords[1]));
  let yMax = Math.max(...mappingData.map((d) => d.coords[1]));

  let classifyData = await API.fetchData("node_means", true, null);

  let pathData = {};
  const pathPromises = labels.map(async (d, i) => {
    let data = await API.fetchData("path", true, {
      file: d,
      umap: true,
    });
    // id can the month of water_year_mean
    pathData[d] = Object.entries(data).map(([key, value]) => {
      return {
        id: key,
        coords: value.map((d) => [
          mappingData[d.id].coords[0],
          -mappingData[d.id].coords[1],
        ]),
      };
    });
  });

  await Promise.all(pathPromises);

  let data = mappingData.map((d) => {
    return { ...d, value: classifyData[d.id].value };
  });

  let contourData = await API.fetchData("contours", true, { data: data });

  // Set up layer generators
  let nodeLayerGenerator = new NodeLayer(mappingData, imgSrc, 3, 30);
  let nodeclassifyLayerGenerator = new NodeClassifyLayer(
    mappingData,
    classifyData,
    contourData
  );
  let axisLayerGenerator = new AxisLayer(-100, 100, 5, true);
  const {
    getYearsSelected,
    getMonthsSelected,
    getFiles,
    getSubsetType,
    getHoveredFile,
  } = storeToRefs(store);
  console.log("SDFSDF", pathData);
  let somLayerGenerator = new SOMLayer(
    pathData,
    getYearsSelected,
    getMonthsSelected,
    getFiles,
    getSubsetType,
    getHoveredFile,
    [
      [xMin, xMax],
      [yMin, yMax],
    ]
  );

  layerGenerators = [
    axisLayerGenerator,
    nodeLayerGenerator,
    nodeclassifyLayerGenerator,
    somLayerGenerator,
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
        return g.getLayers();
      })
      .flat();

    if (layerList.length == 0) return;
    setLayerProps();
    message.value = "DONE!";
    // setTimeout(() => {
    //   message.value = "";
    // }, 2000);
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

function formatTooltipTime(d) {
  // return d + (props.isHistorical ? 1950 : 2015);
  return "Year " + d.toString();
}

function setLayerProps() {
  deck.setProps({ layers: layerList });
}

function toggleShowSurface() {
  layerList = layerList.map((l) => {
    let ret = l.id.startsWith("surface-layer")
      ? l.clone({ visible: !isHidingSurface.value })
      : l.clone();
    return ret;
  });
  setLayerProps();
}
</script>

<style scoped>
.slider {
  --slider-tooltip-font-size: 1.5rem;
}
</style>
