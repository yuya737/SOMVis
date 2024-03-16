import {
    ScatterplotLayer,
    PathLayer,
    TextLayer,
    CompositeLayer,
} from "deck.gl/typed";
import { DataFilterExtension } from "@deck.gl/extensions";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import type { LayersList } from "deck.gl/typed";
import { line, curveNatural } from "d3";
import { pointsOnPath } from "points-on-path";
import {
    scalePointsToSquare,
    colorSim,
    getModelType,
    colorMonth,
    orbitView,
    pointsToCurve,
    addJitter,
    orthoView,
    miniorthoView,
    layerFilter,
    DECKGL_SETTINGS,
    colorMonth,
} from "../utils/utils";

import { useCloned } from "@vueuse/core";
import { watch } from "vue";

export class CurveLayerv2 {
    readonly coords: any;
    readonly name: string;
    readonly timeRange: any;
    readonly temp: any;
    readonly month_divided_data: any;

    constructor(coords, name: string, timeRange: any) {
        this.coords = coords;
        this.name = name;
        this.timeRange = timeRange;
        // const { cloned } = useCloned(timeRange);
        // this.timeRange = cloned;
        // watch(this.temp, () => console.log("Change in CurveLayerv2"));

        let ret = [];

        let month_dict = {
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
            7: [],
            8: [],
            9: [],
            10: [],
            11: [],
            12: [],
        };
        this.coords
            .map((d) => d.coords)
            .forEach((d, i) => {
                month_dict[(i % 12) + 1].push(d);
            });
        this.month_divided_data = Object.entries(month_dict).map((v) => {
            return {
                month: parseInt(v[0]),
                scatter: v[1].map((d) => [d[0], -d[1]]),
                coords: pointsToCurve(v[1]).map((d) => [d[0], -d[1]]),
                name: this.name,
            };
        });
    }

    blockedCenterOfMass(month, points, block_size) {
        let num_blocks = Math.floor(points.length / block_size);
        let ret = [];
        for (let block = 0; block < num_blocks; block++) {
            let block_points = points.slice(block * 10, (block + 1) * 10);
            let center = block_points.reduce(
                (acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]],
                [0, 0],
            );
            center = [
                center[0] / block_points.length,
                center[1] / block_points.length,
            ];
            ret.push({
                coords: center,
                block: block,
                name: this.name,
                month: month,
            });
        }
        return ret;
    }
    globalCenterOfMass(month, points) {
        let global_sum = points.reduce(
            (acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]],
            [0, 0],
        );
        let ret = {
            coords: [
                global_sum[0] / global_sum.length,
                global_sum[1] / global_sum.length,
            ],
            name: this.name,
            month: month,
        };
        return ret;
    }

    getLayer() {
        let ret = [];
        this.month_divided_data.forEach((d) => {
            // let s = new ScatterplotLayer({
            //     id: `${this.name}-m${d.month}-scatter`,
            //     data: [this.globalCenterOfMass(d.month, d.scatter)],
            //     getPosition: (d) => d.coords,
            //     getColor: (d) => colorSim(d.name),
            //     // d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
            //     getRadius: 0.2,
            //     pickable: true,
            //     month: d.month,
            //     onClick: (info, event) => {
            //         // imgSrc.value = `http://localhost:5002/node_images/${info.object.id}.png`;
            //         console.log("Clicked:", info.object, event);
            //     },
            // });
            // let s = new ScatterplotLayer({

            let temp = {
                name: this.name,
                message: getModelType(this.name),
                path: this.blockedCenterOfMass(d.month, d.scatter, 10).map(
                    (d) => d.coords,
                ),
            };
            let s = new PathLayer({
                id: `curve-${this.name}-m${d.month}-path-scatter`,
                data: [temp],
                // getPosition: (d) => d,
                positionFormat: "XY",
                getPath: (d) => pointsToCurve(d.path).flat(),
                getColor: (d) => [...colorSim(getModelType(d.name)), 125],
                getWidth: 0.05,
                // opacity: (d) => 0.1 * d.decade,
                // d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
                getRadius: 0.2,
                pickable: true,
                autoHighlight: true,
                month: d.month,
                onHover: (info, event) => {
                    // imgSrc.value = `http://localhost:5002/node_images/${info.object.id}.png`;
                    // console.log("Clicked:", info.object, event);
                    console.log("Hovered", info);
                },
            });
            ret = [...ret, s];
            let s2 = new ScatterplotLayer({
                id: `curve-${this.name}-m${d.month}-2-scatter`,
                data: this.blockedCenterOfMass(d.month, d.scatter, 10),
                getPosition: (d) => d.coords,
                getColor: (d) => [
                    ...colorSim(getModelType(d.name)),
                    (255 / 10) * d.block + 30,
                ],
                getRadius: 0.1,
                month: d.month,
            });
            ret = [...ret, s2];
            let te = new TextLayer({
                id: `curve-${this.name}-m${d.month}-text-scatter`,
                data: [this.globalCenterOfMass(d.month, d.scatter)],
                getPosition: (d) => d.coords,
                getText: (d) => d.name,
                getSize: 15,
                month: d.month,
                getTextAnchor: "end",
                getAlignmentBaseline: "top",
                // getColor: (d) => colorSim(d.name),
                // // d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
                // getRadius: 0.2,
                // pickable: true,
                // month: d.month,
                // onClick: (info, event) => {
                //     // imgSrc.value = `http://localhost:5002/node_images/${info.object.id}.png`;
                //     console.log("Clicked:", info.object, event);
                // },
            });
            ret = [...ret, te];
            // let l = new PathLayer({
            //     id: `${this.name}-m${d.month}-curve`,
            //     data: [d],
            //     // data: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/bart-lines.json",
            //     positionFormat: "XY",
            //     // getPath: (d) => d.coords,
            //     month: d.month,
            //     getPath: (d) => d.coords.flat(),
            //     getColor: (d) => colorSim(getModelType(d.name)),
            //     // pickable: true,
            //     autoHighlight: true,
            //     // getColor: (d) =>
            //     //     d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
            //     getWidth: 0.01,
            // });
            // ret = [...ret, l];
            // let h = new HeatmapLayer({
            //     id: `${this.name}-m${d.month}-heat-scatter`,
            //     data: d.scatter,
            //     getPosition: (d) => d,
            //     radiusPixels: 100,
            //     debounceTimeout: 750,
            //     opacity: 0.7,
            //     month: d.month,
            //     weightsTextureSize: 256,
            //     // threshold: 0.2,
            //     colorDomain: [30, 200],
            // });
            // ret = [...ret, h];
            // ret = [...ret, h];
            let scatter = new ScatterplotLayer({
                id: `curve-${this.name}-m${d.month}-scatter`,
                data: addJitter(d.scatter, 1).map((d, i) => {
                    return { coord: d, year: i };
                }),
                getPosition: (d) => d.coord,
                getColor: colorSim(getModelType(d.name)),
                month: d.month,
                getRadius: 0.1,
                extensions: [new DataFilterExtension({ filterSize: 1 })],
                getFilterValue: (d) => d.year,
                filterRange: [this.timeRange.value[0], this.timeRange.value[1]],
                // filterRange: [0, 10],
            });
            ret = [...ret, scatter];
        });

        // ret = [...ret, l];
        return ret;
    }
}
// CurveLayer.layerName = "CurveLayer";
// CurveLayer.defaultProps = {
//     ...CompositeLayer.defaultProps,
//     ...PathLayer.defaultProps,
//     ...ScatterplotLayer.defaultProps,
//     drawMonthly: false,
//     name: "curve-default",
// };
