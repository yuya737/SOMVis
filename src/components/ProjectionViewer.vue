<template>
  <div id="eofvis-parent" class="relative h-full w-full">
    <img class="absolute bottom-0 right-0 z-[4] p-4" :src="imgSrc" />
    <div class="relative h-full w-full">
      <canvas :id="deckglCanvas" class="z-[2] h-full w-full" />
      <InfoPanel
        class="z-[4]"
        :settings="InfoPanelSettings"
        @settings-changed="settingsChanged"
      />
    </div>

    <div
      class="absolute top-0 z-[2] m-4 w-fit transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
    >
      {{ text }}
    </div>

    <div
      id="tooltip"
      class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
      style="display: none"
    />
    <div
      class="absolute bottom-0 z-[4] flex h-32 w-full flex-col content-center justify-around px-32"
    >
      <Slider
        v-model="timeRange"
        :format="formatTooltipTime"
        :min="timeMin"
        :max="timeMax"
        class="slider z-[4] w-full"
        @change="drawAllLayers"
      />

      <div
        class="flex flex-row w-full items-center justify-evenly bg-gray-200 p-2 rounded-lg text-center"
      >
        <span class="flex items-center font-bold"> Start: </span>
        <Dropdown
          v-model="monthTemp1"
          :options="months"
          class="w-fit z-[4] md:w-14rem"
          checkmark
          :highlight-on-select="false"
          placeholder="Starting Month"
          @change="drawAllLayers"
        />
        <span class="flex items-center font-bold"> End: </span>
        <Dropdown
          v-model="monthTemp2"
          :options="months"
          class="w-fit z-[4]"
          checkmark
          :highlight-on-select="false"
          placeholder="Ending Month"
          @change="drawAllLayers"
        />
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
import { onMounted, ref, watch, nextTick } from "vue";

import { Deck } from "@deck.gl/core";

import API from "@/api/api";

import { LayersList } from "@deck.gl/core";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import InfoPanel from "./ui/TheInfoPanel.vue";
// import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Slider from "@vueform/slider";
import InfoPanelSettings from "@/store/InfoPanelSettingsProj.json";

import { AbstractLayerGenerator } from "./utils/AbstractLayerGenerator";

import { SOMLayer } from "./utils/SOMLayer";
import { NodeClassifyLayer } from "./utils/NodeClassifyLayer";
import { NodeLayer } from "./utils/NodeLayer";

import {
  orthoView,
  DECKGL_SETTINGS,
  historicalLabels,
  historicalLabelsSfbay,
  ssp370Labels,
  ssp585Labels,
  approx,
  getModelType,
  months,
} from "./utils/utils";
const props = defineProps({
  isHistorical: Boolean,
});

// let labels = props.isHistorical ? historical_labels : ssp585_labels;
let labels = props.isHistorical ? historicalLabels : ssp370Labels;
// let labels = props.isHistorical ? historical_labels_sfbay : ssp370_labels;
InfoPanelSettings[0].options[0].values = [
  "All",
  ...labels.map((d) => getModelType(d)),
];

let layerList: LayersList = [];
let settings = {};

let layerGenerators: AbstractLayerGenerator[] = [];

const store = useStore();
let deck: any = null;

const deckglCanvas = `deck-canvas-projection-viewer-${Math.random()}`;

const imgSrc = ref("");
const timeRange = ref([0, props.isHistorical ? 64 : 85]);
const monthTemp1 = ref("January");
const monthTemp2 = ref("December");
watch([monthTemp1, monthTemp2], ([m1, m2]) => {
  monthRange.value = [months.indexOf(m1) + 1, months.indexOf(m2) + 1];
});
const monthRange = ref([1, 12]);
const timeMin = 0;
const timeMax = props.isHistorical ? 64 : 85;
const month = ref(1);
const selectedModel = ref(["All"]);
const showPath = ref(false);
// const text = ref(props.isHistorical ? "Historical" : "SSP585");
const text = ref(props.isHistorical ? "Historical" : "SSP370");

onMounted(() => {
  deck = new Deck({
    onViewStateChange: () => {
      // setLayerProps();
    },
    ...DECKGL_SETTINGS,
    canvas: deckglCanvas,
    views: orthoView,
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
    drawAllLayers();
    setLayerProps();
  });
});

async function initializeLayers() {
  // Get all the data
  let mappingData = await API.fetchData(
    "mapping/CMIP6_pr_historical_S3L0.02_umap",
    // "mapping/CMIP6_pr_historical_sfbay_S3L0.1_20x20_umap",
    // "mapping/CMIP6_taxmax_historical_S3L0.1_umap",
    true,
    null
  );
  let classifyData = await API.fetchData("node_means", true, null);

  let pathData = {};
  const pathPromises = labels.map(async (d, i) => {
    let data = await API.fetchData("path", true, {
      file: d,
      umap: true,
    });
    pathData[d] = data;
  });

  await Promise.all(pathPromises);

  let data = mappingData.map((d) => {
    return { ...d, value: classifyData[d.id].value };
  });

  let contourData = await API.fetchData("contours", true, { data: data });

  // Set up layer generators
  let nodeLayerGenerator = new NodeLayer(mappingData, imgSrc, 7, 30);
  let nodeclassifyLayerGenerator = new NodeClassifyLayer(
    mappingData,
    classifyData,
    contourData
  );
  let axisLayerGenerator = new AxisLayer(-100, 100, 5, true);
  let somLayerGenerator = new SOMLayer(
    pathData,
    timeRange,
    monthRange,
    selectedModel
  );

  layerGenerators = [
    nodeLayerGenerator,
    nodeclassifyLayerGenerator,
    axisLayerGenerator,
    somLayerGenerator,
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
        return g.getLayers();
      })
      .flat();

    if (layerList.length == 0) return;
    setLayerProps();
  });
}

function settingsChanged(updatedSettings) {
  settings = { ...settings, ...updatedSettings };
  if (settings["variant"]) {
    selectedModel.value = settings["variant"];
  }
  drawAllLayers();
  console.log("setting changed", selectedModel.value);
}

// function incrementMonth() {
//   month.value = (month.value % 12) + 1;
//   drawAllLayers();
// }

// function togglePath() {
//   showPath.value = !showPath.value;
//   drawAllLayers();
// }

function formatTooltipTime(d) {
  return d + (props.isHistorical ? 1950 : 2015);
}

// function formatTooltipMonth(d) {
//   if (approx(d, 1)) return "Jan";
//   if (approx(d, 2)) return "Feb";
//   if (approx(d, 3)) return "Mar";
//   if (approx(d, 4)) return "Apr";
//   if (approx(d, 5)) return "May";
//   if (approx(d, 6)) return "Jun";
//   if (approx(d, 7)) return "Jul";
//   if (approx(d, 8)) return "Aug";
//   if (approx(d, 9)) return "Sep";
//   if (approx(d, 10)) return "Oct";
//   if (approx(d, 11)) return "Nov";
//   if (approx(d, 12)) return "Dec";
// }

function setLayerProps() {
  deck.setProps({ layers: layerList });
}
</script>

<style scoped>
.slider {
  --slider-tooltip-font-size: 1.5rem;
}
</style>
./ui/TheInfoPanel.vue./utils/LayerGenerator./utils/AbstractLayerGenerator
