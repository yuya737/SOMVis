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
      class="absolute bottom-0 h-32 items-center justify-around px-32 w-full flex flex-col"
    >
      <div
        class="flex flex-row items-center justify-evenly bg-gray-200 p-2 rounded-lg text-center"
      >
        <span class="flex items-center font-bold px-5"> Group 1: </span>
        <MultiSelect
          v-model="cmp_1"
          :options="options"
          showclear
          placeholder="Select a model"
          optionLabel="name"
          optionValue="value"
          :maxSelectedLabels="3"
          class="w-full z-[4] md:w-14rem"
        />
        <span class="flex items-center font-bold px-5"> Group 2: </span>
        <MultiSelect
          v-model="cmp_2"
          :options="options"
          showclear
          checkmark
          :highlightOnSelect="false"
          placeholder="Select a model"
          optionLabel="name"
          optionValue="value"
          :maxSelectedLabels="3"
          class="w-full z-[4] md:w-14rem"
        />
      </div>
      <div
        class="flex flex-row items-center bg-gray-200 justify-evenly p-2 rounded-lg text-center w-fit"
      >
        <SelectButton
          v-model="selectedMode"
          :options="modeOptions"
          :allowEmpty="false"
          aria-labelledby="basic"
        />
        <Button
          class="px-5"
          type="button"
          label="Show on Map"
          icon="pi pi-map"
          :loading="loading"
          @click="submit"
        />
      </div>
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
import {
  getModelType,
  stripSOMprefix,
  ssp370Labels,
  colorInterp,
  colorInterpDifference,
} from "./utils/utils";

import { Deck, MapView } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";

let deck: any = null;
const token: string =
  "pk.eyJ1IjoieXV5YTczNyIsImEiOiJjbGY0ZmMzbG4wcjNvM3hxbTVqaWpqaDQ3In0.wkIMGbAn6HaRVqPs2CJSnA";

let latitudes: number[] = [];
let longitudes: number[] = [];
let data: any = null;
let data2: any = null;

// const data_type = "LOCA";
// // const data_type = "CMIP6";
// // const data_type = "MPI";

// const loading = ref(false);
// const bottomText = ref("Precip data");

const cmp_1 = ref();
const cmp_2 = ref();
const selectedMode = ref("Difference");
const options = ref(
  ssp370Labels.map((d) => {
    return { name: getModelType(d), value: stripSOMprefix(d) };
  })
);
const modeOptions = ref(["Group 1 Mean", "Difference"]);
const loading = ref(false);

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
  let payload = {
    files: ssp370Labels,
    months: store.getMonthsSelected,
    years: store.getYearsSelected,
    ssp: store.getSSPSelected,
  };
  console.log(payload);
  fetchMapData(payload);
});

const store = useStore();

watch(
  () => [store.getMonthsSelected, store.getYearsSelected],
  ([months, years]) => {
    data2 = null;
    let payload = {
      files: ssp370Labels,
      months: months,
      years: years,
      ssp: store.getSSPSelected,
    };
    fetchMapData(payload);
  }
);

watch(
  () => store.getFiles,
  (files) => {
    let group1Mean = calculateElementWiseMean(
      files[0].map((d) => data2?.[d].flat())
    );

    let group2Mean = calculateElementWiseMean(
      files[1].map((d) => data2?.[d].flat())
    );
    if (!group2Mean) {
      cmp_1.value = files[0];
      selectedMode.value = "Group 1 Mean";
      drawLayer(group1Mean, colorInterp);
    } else {
      selectedMode.value = "Difference";
      cmp_1.value = files[0];
      cmp_2.value = files[1];
      drawLayer(
        group1Mean.map((d, i) => d - group2Mean[i]),
        colorInterpDifference
      );
    }
  }
);

function calculateElementWiseMean(lists) {
  if (lists.length === 0 || lists[0] == undefined) return undefined;
  return lists
    .reduce(
      (acc, curr) => acc.map((sum, i) => sum + curr[i]),
      new Array(lists[0].length).fill(0)
    )
    .map((sum) => sum / lists.length);
}

watch(
  () => store.getHoveredFile,
  (file) => {
    drawLayer(data2?.[file], colorInterp);
  }
);

function submit() {
  let cmp1 = cmp_1.value ? cmp_1.value : [];
  let cmp2 = cmp_2.value ? cmp_2.value : [];

  store.updateElements({
    files: [cmp1, cmp2],
    monthsSelected: store.getMonthsSelected,
    yearsSelected: store.getYearsSelected,
    sspSelected: store.getSSPSelected,
  });

  let payload = {
    files: store.getFiles,
    months: store.getMonthsSelected,
    years: store.getYearsSelected,
    ssp: store.getSSPSelected,
  };
  loading.value = true;
  fetchMapData(payload).then(() => {
    draw();
    loading.value = false;
  });
}

async function fetchMapData(payload) {
  // No files are selected
  if (payload.files[0].length == 0 && payload.files[1].length == 0) {
    return;
  }
  // data = await API.fetchData(`get_difference`, true, payload);
  data2 = await API.fetchData(`get_all_means`, true, {
    files: ssp370Labels.map((d) => stripSOMprefix(d)),
    months: payload.months,
    years: payload.years,
  });
}

async function draw() {
  let color;
  // bottomText.value = `Comparing ${payload.files[0][0]} and ${payload.files[1][0]}`;
  let subset;
  if (selectedMode.value == "Difference") {
    subset = data.difference;
    color = colorInterpDifference;
  } else if (selectedMode.value == "Group 1 Mean") {
    subset = data.cmp_1;
    color = colorInterp;
  } else if (selectedMode.value == "Group 2 Mean") {
    subset = data.cmp_2;
    color = colorInterp;
  }

  const mapData = subset
    .map((d, index) => {
      return {
        val: d,
        color: color(d),
        lon: longitudes[index % longitudes.length],
        lat: latitudes[Math.floor(index / longitudes.length)],
      };
    })
    .filter((d) => d.val != 0);

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
    getFillColor: (d) => d.color,
  });

  deck.setProps({
    layers: [scatterplotlayer],
  });
}

function drawLayer(data, cmap) {
  if (!data) {
    deck.setProps({
      layers: [],
    });
    return;
  }
  data = data.flat();
  const mapData = data
    .map((d, index) => {
      return {
        val: d,
        color: cmap(d),
        lon: longitudes[index % longitudes.length],
        lat: latitudes[Math.floor(index / longitudes.length)],
      };
    })
    .filter((d) => d.val != 0);

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
    getFillColor: (d) => d.color,
  });

  deck.setProps({
    layers: [scatterplotlayer],
  });
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
