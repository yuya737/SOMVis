<template>
    <div id="eofvis-parent" class="relative h-full w-full">
        <img class="absolute bottom-0 right-0 z-[4] p-4" :src="imgSrc" />
        <div class="relative h-full w-full">
            <canvas :id="deckgl_canvas" class="z-[2] h-full w-full" />
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

import API from "@/api/api";

import { LayersList, OrthographicViewState, Layer } from "@deck.gl/core";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import InfoPanel from "./ui/InfoPanel.vue";
import Button from "primevue/button";
import Slider from "@vueform/slider";
import InfoPanelSettings from "@/store/InfoPanelSettingsProj.json";

import { ILayerGenerator } from "./utils/layerGenerator";

import { SOMLayer } from "./utils/SOMLayer";
import { NodeClassifyLayer } from "./utils/NodeClassifyLayer";
import { NodeLayer } from "./utils/NodeLayer";

import {
    orthoView,
    DECKGL_SETTINGS,
    historical_labels,
    ssp370_labels,
    ssp585_labels,
    getModelType,
} from "./utils/utils";
const props = defineProps({
    isHistorical: Boolean,
});

// let labels = props.isHistorical ? historical_labels : ssp585_labels;
let labels = props.isHistorical ? historical_labels : ssp370_labels;
InfoPanelSettings[0].options[0].values = [
    "All",
    ...labels.map((d) => getModelType(d)),
];

let layerList: LayersList = [];
let settings = {};

let layerGenerators: ILayerGenerator[] = [];

const store = useStore();
let deck: any = null;

const deckgl_canvas = `deck-canvas-projection-viewer-${Math.random()}`;

const imgSrc = ref("");
const timeRange = ref([0, props.isHistorical ? 64 : 85]);
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
        canvas: deckgl_canvas,
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
    let mapping_data = await API.fetchData(
        "mapping/CMIP6_pr_historical_S3L0.02_umap",
        // "mapping/CMIP6_taxmax_historical_S3L0.1_umap",
        true,
        null,
    );
    let classify_data = await API.fetchData("node_means", true, null);

    let pathData = {};
    const pathPromises = labels.map(async (d, i) => {
        let data = await API.fetchData("path", true, {
            file: d,
            umap: true,
        });
        pathData[d] = data;
    });

    await Promise.all(pathPromises);

    let data = mapping_data.map((d) => {
        return { ...d, value: classify_data[d.id].value };
    });

    let contour_data = await API.fetchData("contours", true, { data: data });

    // Set up layer generators
    let nodeLayerGenerator = new NodeLayer(mapping_data, imgSrc, 13);
    let nodeclassifyLayerGenerator = new NodeClassifyLayer(
        mapping_data,
        classify_data,
        contour_data,
    );
    let axisLayerGenerator = new AxisLayer(-100, 100, 5, true);
    let somLayerGenerator = new SOMLayer(
        pathData,
        timeRange,
        month,
        selectedModel,
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

function incrementMonth() {
    month.value = (month.value % 12) + 1;
    drawAllLayers();
}

function togglePath() {
    showPath.value = !showPath.value;
    drawAllLayers();
}

function formatTooltip(d) {
    return d + (props.isHistorical ? 1950 : 2015);
}

function setLayerProps() {
    deck.setProps({ layers: layerList });
}
</script>
