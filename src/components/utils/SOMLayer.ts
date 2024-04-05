import {
  ScatterplotLayer,
  PathLayer,
  TextLayer,
  CompositeLayer,
} from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
// import type { LayersList } from "deck.gl/typed";
import { colorSim, getModelType, pointsToCurve } from "./utils";

import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { watch } from "vue";

export class SOMLayer extends AbstractLayerGenerator {
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

  // Need to have two ranges for the heatmap to account for Dec-Feb type queries that wrap around the year
  selectedMonthRangeList: any = [];
  needsToRedraw: boolean = false;
  layerList: any = null;

  _generateMonthRange() {
    this.selectedMonthRangeList = [];
    if (this.selectedMonthRange.value[0] <= this.selectedMonthRange.value[1]) {
      for (
        let i = this.selectedMonthRange.value[0];
        i <= this.selectedMonthRange.value[1];
        i++
      ) {
        this.selectedMonthRangeList.push(i);
      }
    } else {
      for (let i = 1; i <= this.selectedMonthRange.value[1]; i++) {
        this.selectedMonthRangeList.push(i);
      }
      for (let i = this.selectedMonthRange.value[0]; i <= 12; i++) {
        this.selectedMonthRangeList.push(i);
      }
    }
  }

  // constructor(coords, name: string, timeRange: any, monthRange: any) {
  constructor(data, timeRange, monthRange, model) {
    super();
    this.data = data;
    this.selectedTimeRange = timeRange;
    this.selectedMonthRange = monthRange;
    this.selectedModel = model;
    this._generateMonthRange();

    let modelMonthDict = {};
    Object.keys(data).forEach((k) => {
      let monthDict = {
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
          monthDict[(i % 12) + 1].push(d);
        });
      let monthDividedData = Object.entries(monthDict).map((v) => {
        return {
          month: parseInt(v[0]),
          scatter: v[1].map((d) => [d[0], -d[1]]),
          coords: pointsToCurve(v[1]).map((d) => [d[0], -d[1]]),
          name: k,
        };
      });
      modelMonthDict[k] = monthDividedData;
    });
    this.modelMonthDict = modelMonthDict;

    this.blockedCenterofMassData = Object.entries(this.modelMonthDict)
      .map(([model, monthDividedData]) =>
        monthDividedData.map((d) => {
          return {
            month: d.month,
            name: getModelType(model),
            message: getModelType(model),
            path: this.blockedCenterOfMass(d.month, d.scatter, 10, model).map(
              (d) => d.coords
            ),
          };
        })
      )
      .flat();

    this.heatmapData = Object.entries(this.modelMonthDict)
      .map(([model, monthDividedData]) =>
        monthDividedData.map((d) =>
          d.scatter.map((e, i) => {
            return {
              name: getModelType(model),
              coords: e,
              month: d.month,
              year: i,
            };
          })
        )
      )
      .flat(2);
    // Trigger reddsraw when timeRange changes
    watch(
      [this.selectedTimeRange, this.selectedMonthRange, this.selectedModel],
      () => {
        //   console.log("Redrawing", newval);
        this._generateMonthRange();
        this.needsToRedraw = true;
      }
    );
  }

  blockedCenterOfMass(month, points, blockSize, name) {
    let numBlocks = Math.floor(points.length / blockSize);
    let ret = [];
    for (let block = 0; block < numBlocks; block++) {
      let blockPoints = points.slice(block * 10, (block + 1) * 10);
      let center = blockPoints.reduce(
        (acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]],
        [0, 0]
      );
      center = [center[0] / blockPoints.length, center[1] / blockPoints.length];
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
    let globalSum = points.reduce(
      (acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]],
      [0, 0]
    );
    let ret = {
      coords: [
        globalSum[0] / globalSum.length,
        globalSum[1] / globalSum.length,
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
    console.log(
      "Drawing",
      this.selectedModel.value,
      this.selectedMonthRange.value,
      this.selectedTimeRange.value
    );

    let curBlockedCenterofMass = this.blockedCenterofMassData;
    let curHeatmapData = this.heatmapData;

    //TODO: If cateogry filtering hits stable release, this should be implemented with it
    if (!this.selectedModel.value.includes("All")) {
      curBlockedCenterofMass = this.blockedCenterofMassData.filter((d) =>
        this.selectedModel.value.includes(d.name)
      );
      curHeatmapData = this.heatmapData.filter((d) =>
        this.selectedModel.value.includes(d.name)
      );
    }
    curBlockedCenterofMass = curBlockedCenterofMass.filter((d) =>
      this.selectedMonthRangeList.includes(d.month)
    );
    curHeatmapData = curHeatmapData.filter((d) =>
      this.selectedMonthRangeList.includes(d.month)
    );
    console.log(this.selectedMonthRangeList);

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
        this.selectedMonthRange.value[0],
        this.selectedMonthRange.value[1],
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
          })
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
        this.selectedMonthRange.value[0],
        this.selectedMonthRange.value[1],
      ],
      // getFilterCategory: (d) => {
      //     console.log(d);
      //     return d.name;
      // },
      // filterCategories: [this.selectedModel.value],
    });
    // debugger;
    // let cd = [50, 175].map(
    //   (d) =>
    //     d *
    //       (this.selectedModel.value.includes("All")
    //         ? 15
    //         : this.selectedModel.value.length) *
    //       this.selectedMonthRangeList.length +
    //     1 *
    //       ((this.selectedTimeRange.value[1] -
    //         this.selectedTimeRange.value[0] +
    //         1) /
    //         65)
    // );

    let cd = [curHeatmapData.length, curHeatmapData.length * 2];
    console.log(curHeatmapData);
    let heatmap = new HeatmapLayer({
      id: "curve-heatmap",
      data: curHeatmapData,
      // data: [{ coords: [0, 0], name: "ACCESS-CM2", month: 1, year: 0 }],
      getPosition: (d) => d.coords,
      radiusPixels: 120,
      debounceTimeout: 750,
      opacity: 0.7,
      weightsTextureSize: 256,
      // threshold: 0.2,
      colorDomain: cd,
      // colorDomain: [50, 150],
      // aggregation: "MEAN",
      // extensions: [new DataFilterExtension({ filterSize: 1, categorySize: 1 })],
      getFilterValue: (d) => d.year,
      // getFilterCategory: (d) => d.month,
      // filterCategories: ["1"],
      filterRange: [
        // [this.selectedMonthRange.value[0], this.selectedMonthRange.value[1]],
        this.selectedTimeRange.value[0],
        this.selectedTimeRange.value[1],
      ],
      extensions: [new DataFilterExtension({ filterSize: 1 })],
    });
    // let heatmap = new ScatterplotLayer({
    //     id: `curve-heatmap`,
    //     data: curHeatmapData.map((d) => {
    //         return { ...d, coords: addJitter(d.coords, 0.1) };
    //     }),
    //     getColor: (d) => [...colorSim(d.name)],
    //     getPosition: (d) => d.coords,
    //     getRadius: 0.1,
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
    // let ret = [heatmap, monthlyCOMPath];
    let ret = [heatmap];
    // ret = [...ret, blockedMonthlyCOMScatter];

    this.layerList = ret;
    return ret;
  }
}
