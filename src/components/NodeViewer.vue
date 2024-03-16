<template>
    <div id="eofvis-parent" class="h-full w-full">
        <div class="relative h-full w-full">
            <canvas id="deck-canvas-nodes-viewer" class="z-[2] h-full w-full" />
            <div
                id="minimap-background"
                class="absolute left-[20px] top-[20px] z-[1] aspect-square h-1/4 w-1/4 rounded-md bg-gray-100 shadow-md"
            />

            <div
                class="relative left-[20px] top-[20px] z-[3] w-1/4 text-center text-black"
            >
                Minimap
            </div>
            <InfoPanel
                class="z-[4]"
                :settings="InfoPanelSettings"
                @settings-changed="settingsChanged"
            />
        </div>

        <div
            class="relative bottom-10 left-1/2 z-[3] w-fit -translate-x-1/2 -translate-y-1/2 transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
        >
            {{ bottomText }}
        </div>

        <div
            id="tooltip"
            class="absolute z-[4] rounded bg-gray-800 p-2 text-white shadow"
            style="display: none"
        ></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { Deck, OrthographicViewport } from "@deck.gl/core";
import { scaleLinear, interpolateBlues } from "d3";
import { DataFilterExtension } from "@deck.gl/extensions";
import { line, curveNatural } from "d3";
import {
    ScatterplotLayer,
    TextLayer,
    PathLayer,
    PointCloudLayer,
    BitmapLayer,
} from "deck.gl/typed";

import API from "@/api/api";

import { LayersList, OrthographicViewState, Layer } from "@deck.gl/core/typed";
import { AxisLayer } from "./utils/AxisLayer";
import { useStore } from "@/store/main";
import InfoPanel from "./ui/InfoPanel.vue";
import InfoPanelSettings from "@/store/InfoPanelSettingsNode.json";
import { filePrefix } from "@/assets/config";
import { NodeLayer } from "./utils/NodeLayer";

import {
    scalePointsToSquare,
    colorSim,
    orbitView,
    labels,
    orthoView,
    miniorthoView,
    layerFilter,
    DECKGL_SETTINGS,
} from "./utils/utils";
import { pointsOnPath } from "points-on-path";
import { CurveLayer } from "./utils/CurveLayer";

const store = useStore();
let fileName: string;
let deck: any = null;

const bottomText = ref("SOM Nodes");

let layerList: LayersList = [];
let settings = {
    drawMonthly: false,
    calsim_variant: "All",
};

const setLayerProps = () => {
    console.log(layerList);
    deck.setProps({ layers: layerList });
};

onMounted(() => {
    //    fileName = `${filePrefix}${props.isTemporal ? "temporal" : "spatial"}_1.csv`;
    deck = new Deck({
        onViewStateChange: ({ viewState }) => {
            handleViewStateChange(viewState);
        },
        ...DECKGL_SETTINGS,
        canvas: "deck-canvas-nodes-viewer",
        views: [orthoView, miniorthoView],
        // views: [orbitView, miniorthoView],
        layerFilter: layerFilter,
        // getTooltip: mytooltip
    });

    initalLayerProps().then((layers: any) => {
        layerList = layers;
        setLayerProps();
    });
});

async function initalLayerProps() {
    labels.forEach(async (d, i) => {
        let data = await API.fetchData("path", true, {
            file: d,
            umap: true,
        });
        layerList = [
            ...layerList,
            // new ScatterplotLayer({
            //     id: `${d}-scatter`,
            //     data: data,
            //     getRadius: 0.03,
            //     getColor: [0, 0, 0],
            //     // getColor: colorSim(d),
            //     getPosition: (d) => [d.coords[0], -d.coords[1]],
            //     pickable: true,
            //     autoHighlight: true,
            //     onClick: (info, event) => console.log("Clicked:", info, event),
            // }),
        ];
        // }
        // let l = new ScatterplotLayer({
        //     id: `scatter-${d}`,
        //     data: pointsOnPath(line().curve(curveNatural)(data))[0],
        //     // data: data,
        //     getPosition: (d) => [d[0] + 5, -d[1] + 10],
        //     getFillColor: colorSim(d),
        //     getRadius: 0.05,
        //     // radiusUnits: "pixels",
        // });
        // layerList = [...layerList, l];
    });
    let mapping_data = await API.fetchData(
        "mapping/CMIP6_pr_historical_S3L0.02_umap",
        true,
        null,
    );
    let nodelayer = new NodeLayer(mapping_data);
    layerList = [...layerList, ...nodelayer.getLayer()];
    let axis = new AxisLayer(-100, 100, 5, true);
    layerList = [...layerList, ...axis.getLayers()];
    return layerList;
    // // let scaledData = scalePointsToSquare(data);
    // // console.log(scaledData);

    // return [layer];
}

function drawAllLayers() {
    console.log(settings);
    layerList = layerList.map((l) => {
        if (l.id.endsWith("curve")) {
            console.log("drawMonthly", settings.drawMonthly);
            return l.clone({ drawMonthly: settings.drawMonthly });
        } else {
            return l.clone({});
        }
    });

    if (settings?.calsim_variant == "All") {
        layerList = layerList.map((l) => l.clone({ visible: true }));
    } else {
        layerList = layerList.map((l) => {
            if (
                l.id.startsWith(settings.calsim_variant) ||
                l.id.startsWith("grid") ||
                l.id.startsWith("axis")
            ) {
                return l.clone({ visible: true });
            } else {
                return l.clone({ visible: false });
            }
        });
    }
    setLayerProps();
}

function settingsChanged(updatedSettings) {
    settings = { ...settings, ...updatedSettings };
    drawAllLayers();
    console.log("setting changed", updatedSettings);
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
