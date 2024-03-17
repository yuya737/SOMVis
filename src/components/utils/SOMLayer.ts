import {
    ScatterplotLayer,
    PathLayer,
    TextLayer,
    CompositeLayer,
} from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
// import type { LayersList } from "deck.gl/typed";
import { addJitter, colorSim, getModelType, pointsToCurve } from "./utils";

import { ILayerGenerator } from "./layerGenerator";
import { watch } from "vue";

export class SOMLayer implements ILayerGenerator {
    // readonly coords: any;
    readonly data: any;
    // readonly name: string;
    readonly selectedTimeRange: any;
    readonly selectedMonthRange: any;
    readonly selectedModel: any;
    // readonly temp: any;
    // readonly month_divided_data: any;
    readonly modelMonthDict: any;
    readonly blockedCenterofMassData: any;
    readonly heatmapData: any;

    needsToRedraw: boolean = false;
    layerList: any = null;

    // constructor(coords, name: string, timeRange: any, monthRange: any) {
    constructor(data, timeRange, monthRange, model) {
        this.data = data;
        this.selectedTimeRange = timeRange;
        this.selectedMonthRange = monthRange;
        this.selectedModel = model;

        let model_month_dict = {};
        Object.keys(data).forEach((k) => {
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
            data[k]
                .map((d) => d.coords)
                .forEach((d, i) => {
                    month_dict[(i % 12) + 1].push(d);
                });
            let month_divided_data = Object.entries(month_dict).map((v) => {
                return {
                    month: parseInt(v[0]),
                    scatter: v[1].map((d) => [d[0], -d[1]]),
                    coords: pointsToCurve(v[1]).map((d) => [d[0], -d[1]]),
                    name: k,
                };
            });
            model_month_dict[k] = month_divided_data;
        });
        this.modelMonthDict = model_month_dict;

        this.blockedCenterofMassData = Object.entries(this.modelMonthDict)
            .map(([model, month_divided_data]) =>
                month_divided_data.map((d) => {
                    return {
                        month: d.month,
                        name: getModelType(model),
                        message: getModelType(model),
                        path: this.blockedCenterOfMass(
                            d.month,
                            d.scatter,
                            10,
                            model,
                        ).map((d) => d.coords),
                    };
                }),
            )
            .flat();

        this.heatmapData = Object.entries(this.modelMonthDict)
            .map(([model, month_divided_data]) =>
                month_divided_data.map((d) =>
                    d.scatter.map((e, i) => {
                        return {
                            name: getModelType(model),
                            coords: e,
                            month: d.month,
                            year: i,
                        };
                    }),
                ),
            )
            .flat(2);
        // Trigger reddsraw when timeRange changes
        watch(
            [
                this.selectedTimeRange,
                this.selectedMonthRange,
                this.selectedModel,
            ],
            (newval) => {
                console.log("Redrawing", newval);
                this.needsToRedraw = true;
            },
        );
    }

    checkNeedsToRedraw() {
        return this.needsToRedraw;
    }

    blockedCenterOfMass(month, points, block_size, name) {
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
                name: name,
                month: month,
            });
        }
        return ret;
    }
    globalCenterOfMass(month, points, name) {
        let global_sum = points.reduce(
            (acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]],
            [0, 0],
        );
        let ret = {
            coords: [
                global_sum[0] / global_sum.length,
                global_sum[1] / global_sum.length,
            ],
            name: name,
            month: month,
        };
        return ret;
    }

    getLayers() {
        if (this.layerList && !this.needsToRedraw) {
            return this.layerList;
        }
        console.log("Drawing", this.selectedModel.value);

        let curBlockedCenterofMass = this.blockedCenterofMassData;
        let curHeatmapData = this.heatmapData;

        //TODO: If cateogry filtering hits stable release, this should be implemented with it
        if (!this.selectedModel.value.includes("All")) {
            curBlockedCenterofMass = this.blockedCenterofMassData.filter((d) =>
                this.selectedModel.value.includes(d.name),
            );
            curHeatmapData = this.heatmapData.filter((d) =>
                this.selectedModel.value.includes(d.name),
            );
        }
        console.log(this.heatmapData);
        console.log(curHeatmapData);

        let monthlyCOMPath = new PathLayer({
            id: `curve-monthly-com-path`,
            // data: this.blockedCenterofMass,
            data: curBlockedCenterofMass,
            positionFormat: "XY",
            getPath: (d) => pointsToCurve(d.path).flat(),
            getColor: (d) => [...colorSim(d.name), 125],
            getWidth: 0.1,
            // opacity: (d) => 0.1 * d.decade,
            // d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
            getRadius: 0.2,
            pickable: true,
            autoHighlight: true,
            onHover: (info, event) => {
                // imgSrc.value = `http://localhost:5002/node_images/${info.object.id}.png`;
                // console.log("Clicked:", info.object, event);
            },
            getFilterValue: (d) => d.month,
            filterRange: [
                this.selectedMonthRange.value,
                this.selectedMonthRange.value,
            ],
            // getFilterCategory: (d) => getModelType(d.name),
            // filterCategories: ["ACCESS-CM2", "CNRM-ESM2-1"],
            // getFilterCategory: (d) => d.name,
            // filterCategories: ["ACCESS-CM2"],
            onFilteredItemsChange: (e) => {
                console.log("Filtered", e);
            },
            extensions: [
                new DataFilterExtension({
                    filterSize: 1,
                    countItems: true,
                }),
                // new DataFilterExtension({ categorySize: 1, countItems: true }),
            ],
        });
        let blockedMonthlyCOMScatter = new ScatterplotLayer({
            id: `curve-blocked-com-center`,
            data: curBlockedCenterofMass
                .map((d) =>
                    d.path.map((e) => {
                        return {
                            coords: e,
                            month: d.month,
                            name: getModelType(d.name),
                        };
                    }),
                )
                .flat(),
            getPosition: (d) => d.coords,
            // getColor: (d) => [
            //     ...colorSim(getModelType(d.name)),
            //     (255 / 10) * d.block + 30,
            // ],
            getRadius: 0.1,
            extensions: [new DataFilterExtension({ filterSize: 1 })],
            getFilterValue: (d) => d.month,
            filterRange: [
                this.selectedMonthRange.value,
                this.selectedMonthRange.value,
            ],
            // getFilterCategory: (d) => {
            //     console.log(d);
            //     return d.name;
            // },
            // filterCategories: [this.selectedModel.value],
        });
        // let heatmap = new HeatmapLayer({
        //     id: `curve-heatmap`,
        //     data: curHeatmapData,
        //     getPosition: (d) => d.coords,
        //     radiusPixels: 100,
        //     debounceTimeout: 750,
        //     opacity: 0.7,
        //     weightsTextureSize: 256,
        //     // threshold: 0.2,
        //     // colorDomain: [30, 200],
        //     extensions: [new DataFilterExtension({ filterSize: 2 })],
        //     getFilterValue: (d) => [d.month, d.year],
        //     filterRange: [
        //         [this.selectedMonthRange.value, this.selectedMonthRange.value],
        //         [
        //             this.selectedTimeRange.value[0],
        //             this.selectedTimeRange.value[1],
        //         ],
        //     ],
        // });
        let heatmap = new ScatterplotLayer({
            id: `curve-heatmap`,
            data: curHeatmapData.map((d) => {
                return { ...d, coords: addJitter(d.coords, 0.1) };
            }),
            getColor: (d) => [...colorSim(d.name)],
            getPosition: (d) => d.coords,
            getRadius: 0.05,
            radiusPixels: 100,
            debounceTimeout: 750,
            opacity: 0.7,
            weightsTextureSize: 256,
            // threshold: 0.2,
            // colorDomain: [30, 200],
            extensions: [new DataFilterExtension({ filterSize: 2 })],
            getFilterValue: (d) => [d.month, d.year],
            filterRange: [
                [this.selectedMonthRange.value, this.selectedMonthRange.value],
                [
                    this.selectedTimeRange.value[0],
                    this.selectedTimeRange.value[1],
                ],
            ],
        });
        // let te = new TextLayer({
        //     id: `curve-text-${this.name}`,
        //     data: this.month_divided_data.map((d) => {
        //         return {
        //             coords: this.globalCenterOfMass(d.month, d.scatter),
        //             name: d.name,
        //             month: d.month,
        //         };
        //     }),
        //     getPosition: (d) => d.coords,
        //     getText: (d) => d.name,
        //     getSize: 15,
        //     getTextAnchor: "end",
        //     getAlignmentBaseline: "top",
        //     // getColor: (d) => colorSim(d.name),
        //     // // d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
        //     // getRadius: 0.2,
        //     // pickable: true,
        //     // month: d.month,
        //     // onClick: (info, event) => {
        //     //     // imgSrc.value = `http://localhost:5002/node_images/${info.object.id}.png`;
        //     //     console.log("Clicked:", info.object, event);
        //     // },
        // });
        // ret = [...ret, te];
        // let ret = [monthlyCOMPath, blockedMonthlyCOMScatter];
        let ret = [heatmap, monthlyCOMPath];
        // ret = [...ret, blockedMonthlyCOMScatter];

        this.layerList = ret;
        return ret;
    }
}
