<template>
  <div class="h-full w-full">
    <div
      class="text-md flex h-full w-full flex-col items-center rounded-lg bg-gray-100 py-4 shadow-md"
    >
      <h1 class="relative text-xl font-bold text-gray-800">SOM Node Viewer</h1>
      <div v-if="isOpened" class="relative mt-4 h-full w-full">
        <canvas id="som-node-viewer" class="h-full" />
        <MapboxMap
          class="h-full w-full"
          :access-token="token"
          map-style="mapbox://styles/yuya737/clsttugte000c01pwc8fs7k9m"
          :center="computedMapCenter"
          :zoom="zoom"
          :bearing="bearing"
          :pitch="pitch"
        />
        <div
          class="group absolute right-0 top-0 z-[5] -translate-x-1/2 translate-y-1/2 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            class="help-text absolute right-0 top-0 hidden h-fit min-w-[250px] flex-col items-center justify-center group-hover:block"
          >
            <span>
              Click on a SOM Node and the SOM Node highlighted by
              <span
                id="iconSpan"
                v-html="magnifyingGlassSVGIcon"
                class="inline-flex h-[1rem] w-[1rem] align-middle"
              ></span>
              icon is displayed.<br />
              SOM Nodes contain
              <span class="italic">standardized</span> precipitation values per
              month. -1 indicates 1 standard deviation below the mean and 1
              indicates 1 standard deviation above the mean, where the standard
              deviation is calculated as the standard deviation of all values
              for a given month (i.e. across all spatial locations, time, and
              models).
            </span>
            <div
              id="somNodeViewerLegend"
              class="my-2 flex w-full flex-col items-center justify-evenly font-normal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import magnifyingGlassSVG from "@/assets/magnifying-glass.svg?raw";
import { Deck } from "@deck.gl/core/typed";
import * as d3 from "d3";
import API from "@/API/api";
import { MapboxMap } from "@studiometa/vue-mapbox-gl";
import { ScatterplotLayer } from "@deck.gl/layers/typed";
import { MapView, MapViewport } from "@deck.gl/core";
import { onMounted, reactive, ref, computed, Ref, watch } from "vue";
import { timeType, approx } from "./utils/utils";
import { useStore } from "@/store/main";

const token: string =
  "pk.eyJ1IjoieXV5YTczNyIsImEiOiJjbGY0ZmMzbG4wcjNvM3hxbTVqaWpqaDQ3In0.wkIMGbAn6HaRVqPs2CJSnA";

const mapCenter = reactive([0, 0]);
const computedMapCenter = computed(() => [mapCenter[0], mapCenter[1]]);
const zoom = ref(1);
const bearing = ref(1);
const pitch = ref(1);
const store = useStore();

const magnifyingGlassSVGIcon = ref(magnifyingGlassSVG);
const isOpened = ref(true);
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

let deck;
let latitudes: number[] = [];
let longitudes: number[] = [];

const props = defineProps<{
  nodeClickedID: number;
  time_type: timeType;
}>();

onMounted(() => {
  deck = new Deck({
    width: "100%",
    height: "100%",
    controller: true,
    initialViewState: {
      // California
      latitude: 36.7783,
      longitude: -119.4179,
      zoom: 3.5,
    },
    canvas: "som-node-viewer",
    views: new MapView(),
    onViewStateChange: ({ viewState }) => {
      mapCenter[0] = viewState.longitude;
      mapCenter[1] = viewState.latitude;
      zoom.value = viewState.zoom;
      bearing.value = viewState.bearing;
      pitch.value = viewState.pitch;
    },
  });
  watch(
    () => props.nodeClickedID,
    () => {
      console.log("Node clicked ID changed");
      fetchMapData();
    }
  );
  fetchMapDimensions();
});

async function fetchMapData() {
  if (props.nodeClickedID == -1) {
    // No node selected
    return;
  }
  console.log("DEBUG fetchMapData", props.nodeClickedID);
  const data = await API.fetchData(`get_som_node`, true, {
    dataset_type: store.currentDatasetType,
    time_type: props.time_type,
    id: props.nodeClickedID,
  });
  const mapData = data
    .map((d, index) => {
      return {
        val: approx(d, 0) ? null : d,
        // lon: longitudes[Math.floor(index / latitudes.length)],
        // lat: latitudes[index % latitudes.length],

        lon: longitudes[index % longitudes.length],
        lat: latitudes[Math.floor(index / longitudes.length)],
      };
    })
    .filter((d) => d.val != null);

  let { min, max } = await API.fetchData("get_extents", true, {
    dataset_type: store.currentDatasetType,
    time_type: props.time_type,
  });

  min /= 2;
  max /= 2;

  console.log("sfsf", mapData, min, max);

  const colorScale = d3
    .scaleDiverging()
    .domain([min, 0, max])
    .interpolator(d3.interpolatePiYG);

  drawLegend({ min, max, color: colorScale });

  let scatterplotlayer = new ScatterplotLayer({
    id: "scatterplot-layer",
    data: mapData,
    // pickable: true,
    // stroked: true,
    // filled: true,
    getPosition: (d: any) => [d.lon, d.lat],
    // getRadius: (d: any) => 70000,
    // radiusMinPixels: 2,
    // radiusScale: 100,
    getRadius: store.currentDatasetType == "California" ? 2500 : 5000,
    radiusScale: 1,
    getFillColor: (d) => {
      return colorScale(d.val)
        .replace(/[^\d,]/g, "")
        .split(",")
        .map((d) => Number(d));
    },
  });

  deck.setProps({
    layers: [scatterplotlayer],
  });
}

async function fetchMapDimensions() {
  console.log("Fetching map dimensions");
  const mapDimensions = await API.fetchData("spatial_grid", true, {
    dataset_type: store.currentDatasetType,
  });
  console.log(mapDimensions);
  latitudes = mapDimensions.lat;
  longitudes = mapDimensions.lon.map((d) => ((d + 180) % 360) - 180);
}

function drawLegend({ min, max, color }) {
  const numBoxes = 7;
  const legendData = Array.from({ length: numBoxes }, (_, i) => {
    return color(max - (i / numBoxes) * (max - min));
  });

  // Check if the legend already exists
  if (d3.select("#somNodeViewerLegend").selectAll("*").size() > 0) {
    return;
  }

  const legendItems = d3
    .select("#somNodeViewerLegend")
    .selectAll(".som-legend-item")
    .data(legendData)
    .join("div")
    .attr("class", "legend-item");

  // Add colored boxes
  legendItems
    .append("svg")
    .attr("width", 20)
    .attr("height", 20)
    .append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .style("fill", (d) => d);

  // Add labels
  legendItems
    .append("text")
    .style("font-size", "0.8rem")
    .attr("text-anchor", "middle") // Align text properly
    .text((d, i) => {
      let ret = (max - (i / (numBoxes - 1)) * (max - min)).toFixed(2);
      if (i == 0) return `> ${ret}`;
      else if (i == numBoxes - 1) return `< ${ret}`;
      else return ret;
    });
}
</script>
<style>
.legend-item {
  width: 50%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
#iconSpan svg {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Optional if you need to control the scaling */
}
</style>
