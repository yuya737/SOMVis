<template>
  <div class="relative h-full w-full">
    <canvas id="deck-canvas-map-viewer" class="h-full w-full" />
    <MapboxMap
      class="h-full"
      :access-token="token"
      map-style="mapbox://styles/mapbox/light-v11"
      :center="computedMapCenter"
      :zoom="zoom"
      :bearing="bearing"
      :pitch="pitch"
    />
    <div
      class="relative bottom-10 left-1/2 z-[3] w-fit -translate-x-1/2 -translate-y-1/2 transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
    >
      {{ bottomText }}
    </div>
    <InfoPanel :settings="InfoPanelSettings" />
  </div>
</template>

<script setup lang="ts">
import { MapboxMap } from "@studiometa/vue-mapbox-gl";
import { useStore } from "@/store/main";
import { reactive, ref, watch, onMounted, computed, nextTick } from "vue";
import { scaleLinear, interpolateRdBu, scaleTime } from "d3";
import InfoPanel from "./ui/TheInfoPanel.vue";
import InfoPanelSettings from "@/store/InfoPanelSettingsNode.json";
import API from "@/api/api";
import { getModelType } from "./utils/utils";

import { Deck, MapView, MapViewport } from "@deck.gl/core";
import { ScatterplotLayer, PathLayer } from "deck.gl/typed";

let deck: any = null;
const token: string =
  "pk.eyJ1IjoieXV5YTczNyIsImEiOiJjbGY0ZmMzbG4wcjNvM3hxbTVqaWpqaDQ3In0.wkIMGbAn6HaRVqPs2CJSnA";

let latitudes: number[] = [];
let longitudes: number[] = [];

const data_type = "LOCA";
// const data_type = "CMIP6";
// const data_type = "MPI";

const loading = ref(false);
const bottomText = ref("Precip data");

const mapCenter = reactive([0, 0]);
const computedMapCenter = computed(() => [mapCenter[0], mapCenter[1]]);
const zoom = ref(4);
const bearing = ref(0);
const pitch = ref(0);

const DECKGL_SETTINGS = {
  canvas: "deck-canvas-map-viewer",
  width: "100%",
  height: "100%",
  controller: true,
  initialViewState: {
    latitude: 0,
    longitude: 0,
    zoom: 1,
  },
};

onMounted(() => {
  fetchMapDimensions().then((viewState) => {
    mapCenter[0] = viewState.longitude;
    mapCenter[1] = viewState.latitude;

    deck = new Deck({
      views: new MapView({
        repeat: true,
        // nearZMultiplier: 0.1,
        // farZMultiplier: 1.01,
        // orthographic: false,
      }),
      onViewStateChange: ({ viewState }) => {
        // console.log(viewState.bearing);
        mapCenter[0] = viewState.longitude;
        mapCenter[1] = viewState.latitude;
        zoom.value = viewState.zoom;
        bearing.value = viewState.bearing;
        pitch.value = viewState.pitch;
      },
      ...DECKGL_SETTINGS,
      initialViewState: {
        ...viewState,
        zoom: zoom.value,
        bearing: bearing.value,
        pitch: pitch.value,
      },
    });
  });
});

const store = useStore();

watch(
  () => [store.getFiles, store.getMonthsSelected, store.getYearsSelected],
  ([files, months, years]) => {
    console.log("Map changed", files, months, years);
    fetchMapData({
      files: files,
      months: months,
      years: years,
    });
  },
  { immediate: true }
);

async function fetchMapData(payload) {
  const data = await API.fetchData(`get_difference`, true, payload);
  bottomText.value = `Comparing ${payload.files[0][0]} and ${payload.files[1][0]}`;
  const mapData = data.difference
    .map((d, index) => {
      return {
        val: d,
        lon: longitudes[index % longitudes.length],
        lat: latitudes[Math.floor(index / longitudes.length)],
      };
    })
    .filter((d) => d.val != 0);

  const colorInterp = (value) =>
    interpolateRdBu(
      scaleLinear().domain([-0.0005, 0.0005]).range([1, 0])(value)
    )
      .replace(/[^\d,]/g, "")
      .split(",")
      .map((d) => Number(d));

  // let scatterplotlayer = new ScatterplotLayer({
  //     data: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/airports.json",
  //     getPosition: (d) => d.coordinates,
  //     getRadius: 100,
  //     getColor: [155, 40, 0],
  //     radiusMinPixels: 2,
  // });
  let scatterplotlayer = new ScatterplotLayer({
    id: "scatterplot-layer",
    data: mapData,
    // pickable: true,
    opacity: 1,
    // stroked: true,
    // filled: true,
    getPosition: (d: any) => [d.lon, d.lat],
    // getRadius: (d: any) => 70000,
    // radiusMinPixels: 2,
    // radiusScale: 100,
    getRadius: 1500,
    radiusScale: 1,
    getFillColor: (d) => {
      return colorInterp(d.val);
    },
  });

  deck.setProps({
    layers: [scatterplotlayer],
  });
  //   bottomText.value = name;
}

async function fetchMapDimensions() {
  console.log("Fetching map dimensions");
  const mapDimensions = await API.fetchData("spatial_grid", true, null);
  console.log(mapDimensions);
  latitudes = mapDimensions.lat;
  longitudes = mapDimensions.lon;
  return {
    longitude: longitudes[0],
    latitude: latitudes[0],
  };
}
</script>
