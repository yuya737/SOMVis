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
import { reactive, ref, watch, onMounted, computed } from "vue";
import { scaleLinear, interpolateRdBu, scaleTime } from "d3";
import InfoPanel from "./ui/InfoPanel.vue";
import InfoPanelSettings from "@/store/InfoPanelSettings.json";
import API from "@/api/api";

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
const bottomText = ref("MPI-GE Ensemble RCPs 2.6, 4.5, and 8.5");

const mapCenter = reactive([0, 0]);
const computedMapCenter = computed(() => [mapCenter[0], mapCenter[1]]);
const zoom = ref(1);
const bearing = ref(1);
const pitch = ref(1);

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
    fetchMapDimensions();

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
    });
});

const store = useStore();

watch(
    () => store.getSpatialData,
    (newVal) => {
        console.log("SFSDF");
        bottomText.value = "Loading " + newVal.spatial_col_name;
        fetchMapData(newVal.spatial_file_name, newVal.spatial_col_name);
    },
);

async function fetchMapData(file_name: string, name: string) {
    const data = await API.fetchData(`data`, true, {
        file_name: file_name,
        name: name,
    });
    const mapData = data[0].data
        .map((d, index) => {
            return {
                val: d,
                lon: longitudes[index % longitudes.length],
                lat: latitudes[Math.floor(index / longitudes.length)],
            };
            if (data_type == "MPI") {
            } else {
                return {
                    val: d,
                    lon: longitudes[index],
                    lat: latitudes[index],
                };
            }
        })
        .filter((d) => d.val != null);

    console.log("sfsf", mapData);

    const colorInterp = (unmetDemand) =>
        interpolateRdBu(
            scaleLinear().domain([-0.005, 0.005]).range([1, 0])(unmetDemand),
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
        opacity: 0.5,
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
            if (d.val == null) {
                return [128, 128, 128];
            } else {
                return colorInterp(d.val);
            }
        },
    });

    deck.setProps({
        layers: [scatterplotlayer],
    });
    bottomText.value = name;
}

async function fetchMapDimensions() {
    console.log("Fetching map dimensions");
    const mapDimensions = await API.fetchData("spatial_grid", true, {
        data_type: data_type,
    });
    console.log(mapDimensions);
    latitudes = mapDimensions.lat;
    longitudes = mapDimensions.lon;
}
</script>
./ui/TheInfoPanel.vue
