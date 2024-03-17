<template>
    <div id="eofvis-parent" class="relative h-full w-full">
        <img class="absolute bottom-0 right-0 z-[4] p-4" :src="imgSrc" />
        <div class="relative h-full w-full">
            <canvas :id="deckgl_canvas" class="z-[2] h-full w-full" />
            <!-- <div
                id="minimap-background"
                class="absolute left-[20px] top-[20px] z-[1] aspect-square h-1/4 w-1/4 rounded-md bg-gray-100 shadow-md"
            /> -->

            <!-- <div
                class="relative left-[20px] top-[20px] z-[3] w-1/4 text-center text-black"
            >
                Minimap
            </div> -->
            <InfoPanel
                class="z-[4]"
                :settings="InfoPanelSettings"
                @settings-changed="settingsChanged"
            />
        </div>

        <div
            class="relative bottom-10 left-full z-[3] w-fit -translate-x-full -translate-y-1/2 transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
        >
            {{ bottomText }}
        </div>

        <div
            id="tooltip"
            class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
            style="display: none"
        ></div>

        <div class="absolute bottom-0 left-0 z-[5] p-4">
            <Button
                class="px-4 py-2"
                icon="pi pi-calendar-plus"
                :label="`Month: ${month}`"
                @click="incrementMonth"
            />
            <Button
                class="px-4 py-2"
                icon="pi pi-refresh"
                :label="`Path: ${showPath}`"
                @click="togglePath"
            />
        </div>
        <div
            class="absolute bottom-0 z-[4] flex h-auto w-full flex-row justify-center py-32"
        >
            <Slider
                v-model="timeRange"
                :format="formatTooltip"
                @change="drawAllLayers"
                :min="timeMin"
                :max="timeMax"
                class="z-[4] w-3/4"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from "vue";

import { Deck, OrthographicViewport } from "@deck.gl/core";
import { scaleLinear, interpolateBlues } from "d3";
import { line, curveNatural } from "d3";
import {
    ScatterplotLayer,
    TextLayer,
    PathLayer,
    BitmapLayer,
    PointCloudLayer,
} from "@deck.gl/layers";

import { HeatmapLayer } from "@deck.gl/aggregation-layers";

import API from "@/api/api";

import { LayersList, OrthographicViewState, Layer } from "@deck.gl/core";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import InfoPanel from "./ui/InfoPanel.vue";
import Button from "primevue/button";
// import Slider from "primevue/slider";
import Slider from "@vueform/slider";
import InfoPanelSettings from "@/store/InfoPanelSettingsProj.json";
import { filePrefix } from "@/assets/config";
import { OrthographicView, OrbitView } from "@deck.gl/core";
import { DataFilterExtension } from "@deck.gl/extensions";

import {
    scalePointsToSquare,
    colorSim,
    orbitView,
    orthoView,
    miniorthoView,
    layerFilter,
    DECKGL_SETTINGS,
    historical_labels,
    ssp585_labels,
    getModelType,
    getMonthDividedData,
    // labels,
} from "./utils/utils";
const props = defineProps({
    isHistorical: Boolean,
});

let labels = props.isHistorical ? historical_labels : ssp585_labels;
InfoPanelSettings[0].options[0].values = ["All", ...labels];

import { CurveLayer } from "./utils/CurveLayer";
import { CurveLayerv2 } from "./utils/CurveLayerv2";
import { NodeClassifyLayer } from "./utils/NodeClassifyLayer";
import { NodeLayer } from "./utils/NodeLayer";

const store = useStore();
let fileName: string;
let deck: any = null;

const deckgl_canvas = `deck-canvas-projection-viewer-${Math.random()}`;

const imgSrc = ref("");
const timeRange = ref([0, props.isHistorical ? 64 : 85]);
const timeMin = 0;
const timeMax = props.isHistorical ? 64 : 85;
const month = ref(1);
const selectedModel = ref("All");
const showPath = ref(false);
const incrementMonth = () => {
    month.value = month.value + 1;
    if (month.value > 12) {
        month.value = 1;
    }
    drawAllLayers();
};
const togglePath = () => {
    showPath.value = !showPath.value;
    drawAllLayers();
};

const bottomText = ref(
    "SOM/UMAP Projection Viewer " +
        (props.isHistorical ? "Historical" : "SSP585"),
);

let layerList: LayersList = [];
let settings = {
    drawMonthly: false,
    calsim_variant: "All",
};

let layerGenerators = [];

const formatTooltip = (d) => {
    return d + (props.isHistorical ? 1950 : 2015);
};

const setLayerProps = () => {
    deck.setProps({ layers: layerList });
};

onMounted(() => {
    deck = new Deck({
        onViewStateChange: ({ viewState }) => {
            // handleViewStateChange(viewState);
            setLayerProps();
        },
        ...DECKGL_SETTINGS,
        canvas: deckgl_canvas,
        views: orthoView,
        // views: [orthoView, miniorthoView],
        // views: [orbitView, miniorthoView],
        // layerFilter: layerFilter,
        getTooltip: ({ object }) => {
            if (!object) return;

            return {
                html: `<div>${object.message}</div>`,
                style: {
                    fontSize: "0.8em",
                    "z-index": 10,
                },
            };
        },
        // onClick: (info, event) => {
        //     console.log("Clicked:", info, event);
        // },
        // getTooltip: mytooltip
    });

    initalLayerProps().then((layers: any) => {
        layerList = layers;
        drawAllLayers();
        setLayerProps();
    });
});

async function initalLayerProps() {
    // let labels = [
    //     "bl_h000",
    //     "CS3_ALT3_2022MED",
    //     "CS3_ALT3_2040MED",
    //     "CS3_NAA_2022MED",
    //     "CS3_NAA_2040MED",
    //     "LTO_BA_EXP1_2022MED",
    // ];
    let mapping_data = await API.fetchData(
        "mapping/CMIP6_pr_historical_S3L0.02_umap",
        // "mapping/CMIP6_taxmax_historical_S3L0.1_umap",
        true,
        null,
    );
    let classify_data = await API.fetchData("node_means", true, null);

    let data = mapping_data.map((d) => {
        return { ...d, value: classify_data[d.id].value };
    });
    let contour_data = await API.fetchData("contours", true, { data: data });

    let nodelayer = new NodeLayer(mapping_data, imgSrc);
    watch(
        () => imgSrc,
        (newVal) => {
            console.log("imgSrc changed", newVal);
        },
    );
    let nodeclassifylayer = new NodeClassifyLayer(
        mapping_data,
        classify_data,
        contour_data,
    );
    let axis = new AxisLayer(-100, 100, 5, true);

    layerGenerators = [nodelayer, nodeclassifylayer, axis];

    let path_data = {};
    const promises = labels.map(async (d, i) => {
        let data = await API.fetchData("path", true, {
            file: d,
            umap: true,
        });
        path_data[d] = data;
    });

    await Promise.all(promises);
    let temp = new CurveLayerv2(path_data, timeRange, month, selectedModel);
    layerGenerators = [...layerGenerators, temp];

    // layerList = [...layerList, ...nodeclassifylayer.getLayer()];
    // layerList = [...layerList];
    // layerGenerators = [temp];
    layerList = layerGenerators
        .map((g) => {
            console.log(g);
            return g.getLayers();
        })
        .flat();
    return layerList;
    // // let scaledData = scalePointsToSquare(data);
    // // console.log(scaledData);

    // return [layer];
}

function drawAllLayers() {
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
    selectedModel.value = getModelType(updatedSettings?.calsim_variant);
    drawAllLayers();
    console.log("setting changed", selectedModel.value);
}

// function handleViewStateChange(viewstate: OrthographicViewState) {
//     const viewport = new OrthographicViewport(viewstate);

//     const topLeft = viewport.unproject([0, 0]);
//     const topRight = viewport.unproject([viewstate.width, 0]);

//     const bottomLeft = viewport.unproject([0, viewstate.height]);
//     const bottomRight = viewport.unproject([viewstate.width, viewstate.height]);

//     let bounds_layer = new PathLayer({
//         id: "viewport-bounds",
//         data: [[topLeft, topRight, bottomRight, bottomLeft, topLeft]],
//         getPath: (d) => d,
//         getColor: [255, 0, 0],
//         getWidth: 2,
//         widthUnits: "pixels",
//     });

//     deck.setProps({
//         layers: [bounds_layer, ...layerList],
//         viewState: {
//             main: viewstate,
//             // minimap: {
//             //     ...viewstate,
//             //     zoom: 2
//             // }
//         },
//     });
// }
</script>

<style scoped></style>
