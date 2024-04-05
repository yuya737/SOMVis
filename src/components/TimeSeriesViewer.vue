<template>
    <div id="timeseries-parent" class="h-full w-full">
        <div class="relative h-full w-full">
            <canvas id="deck-canvas-time-series-viewer" class="h-full w-full" />
            <div
                id="minimap-background"
                class="absolute left-[20px] top-[20px] z-[1] aspect-square h-1/4 w-1/4 rounded-md bg-gray-100 shadow-md"
                style="display: none"
            />

            <!-- <div
                class="relative left-[20px] top-[20px] z-[3] w-1/4 text-center text-black"
            >
                Overview
            </div> -->
            <!-- <InfoPanel class="z-[4]" :settings="InfoPanelSettings" /> -->
        </div>

        <div
            class="relative bottom-10 left-1/2 z-[3] w-fit -translate-x-1/2 -translate-y-1/2 transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
        >
            {{ bottomText }}
        </div>

        <!-- <div
            :id="`tooltip-${props.temporal ? 'temporal' : 'spatial'}`"
            class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
            style="display: none"
        ></div> -->
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

import { Deck, OrthographicViewport } from "@deck.gl/core";
import { scaleLinear, interpolateBlues } from "d3";
import {
    ScatterplotLayer,
    TextLayer,
    PathLayer,
    PointCloudLayer,
} from "deck.gl/typed";

import API from "@/api/api";

import { LayersList, OrthographicViewState, Layer } from "@deck.gl/core/typed";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import InfoPanel from "./ui/InfoPanel.vue";
import InfoPanelSettings from "@/store/InfoPanelSettingsProj.json";
import { filePrefix } from "@/assets/config";
import {
    scalePointsToSquare,
    colorSim,
    orbitView,
    orthoView,
    miniorthoView,
    layerFilter,
    DECKGL_SETTINGS,
} from "./utils/utils";

const store = useStore();
let deck: any = null;
let fileName: string;
const bottomText = ref("Time Series Viewer");

let layerList: LayersList = [];

const setLayerProps = () => {
    deck.setProps({ layers: layerList });
};

onMounted(() => {
    fileName = `${filePrefix}temporal_0.csv`;
    deck = new Deck({
        onViewStateChange: ({ viewState }) => {
            handleViewStateChange(viewState);
        },
        ...DECKGL_SETTINGS,
        initialViewState: {
            target: [0, 0, 0],
            zoom: 1,
        },
        canvas: "deck-canvas-time-series-viewer",
        views: [orthoView, miniorthoView],
        // views: [orbitView, miniorthoView],
        layerFilter: layerFilter,
        // getTooltip: mytooltip
    });

    layerList = [...initalLayerProps()];
    setLayerProps();

    // initalLayerProps().then((layers: any) => {
    //     layerList = layers;
    //     setLayerProps();
    // });
});

watch(
    () => store.getTemporalData,
    (newVal) => {
        bottomText.value = "Loading " + newVal.temporal_col_name;
        fetchTimeSeriesData(
            newVal.temporal_file_name,
            newVal.temporal_col_name,
        );
        setLayerProps();
    },
);

function initalLayerProps() {
    let axis = new AxisLayer(-100, 100, 5, true);
    return [...axis.getLayers()];
}
async function fetchTimeSeriesData(file_name: string, name: string) {
    // bottomText.value = "Time Series: " + file_name.split("/").pop();
    let data = await API.fetchData("data", true, {
        file_name: file_name,
        name: name,
    });
    // Find the max in the absolute value of the data
    const max = Math.max(...data[0].data.map((d) => Math.abs(d)));
    // const multiplier = 500 / max;
    const xscale = scaleLinear()
        .domain([0, data[0].data.length])
        .range([-100, 100]);
    const yscale = scaleLinear().domain([-max, max]).range([-50, 50]);

    const timeseriesData = data[0].data
        .map((d, index) => {
            return [xscale(index), yscale(d)];
        })
        .flat();
    const layer = new PathLayer({
        id: "timeseries-layer",
        data: [timeseriesData],
        getPath: (d) => d,
        getWidth: 0.5,
        positionFormat: `XY`,
    });
    console.log(layerList);
    layerList = layerList.filter((l) => l.id !== "timeseries-layer");
    console.log(layerList);
    layerList = [...layerList, layer];
    bottomText.value = name;
}

function handleViewStateChange(viewstate: OrthographicViewState) {
    const viewport = new OrthographicViewport(viewstate);

    const topLeft = viewport.unproject([0, 0]);
    const topRight = viewport.unproject([viewstate.width, 0]);

    const bottomLeft = viewport.unproject([0, viewstate.height]);
    const bottomRight = viewport.unproject([viewstate.width, viewstate.height]);

    let bounds_layer = new PathLayer({
        id: "viewport-bounds",
        data: [[topLeft, topRight, bottomRight, bottomLeft, topLeft]],
        getPath: (d) => d,
        getColor: [255, 0, 0],
        getWidth: 2,
        widthUnits: "pixels",
    });

    deck.setProps({
        layers: [bounds_layer, ...layerList],
        viewState: {
            main: viewstate,
            // minimap: {
            //     ...viewstate,
            //     zoom: 2
            // }
        },
    });
}
</script>
./ui/TheInfoPanel.vue
