import {
  ScatterplotLayer,
  PathLayer,
  TextLayer,
  CompositeLayer,
  GridCellLayer,
} from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { interpolateGreens } from "d3-scale-chromatic";
import { interpolateRgb } from "d3-interpolate";
import { interpolateRdBu } from "d3-scale-chromatic";
import { scaleLinear } from "d3-scale";
import PlotLayer from "@/components/layers/plot-layer";
import kde2d from "@stdlib/stats-kde2d";

import {
  colorSim,
  getModelType,
  pointsToCurve,
  generateMonthRangeList,
  hexToRgb,
} from "./utils";

import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { h, watch } from "vue";

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
  readonly BMUData: any;

  // Need to have two ranges for the heatmap to account for Dec-Feb type queries that wrap around the year
  selectedMonthRangeList: any = [];
  needsToRedraw: boolean = false;
  layerList: any = null;
  extent: any = [[], []];
  mode: string = "single"; // either single or compare

  // constructor(coords, name: string, timeRange: any, monthRange: any) {
  constructor(data, timeRange, monthRange, model, extent) {
    super();
    this.data = data;
    this.selectedTimeRange = timeRange;
    this.selectedMonthRange = monthRange;
    this.selectedModel = model;
    this.extent = extent;
    this.selectedMonthRangeList = generateMonthRangeList(
      this.selectedMonthRange.value[0],
      this.selectedMonthRange.value[1]
    );
    // If two sets of models are selected, then we are in compare mode
    this.selectedModel.value[1].length > 1
      ? (this.mode = "compare")
      : (this.mode = "single");

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

    this.BMUData = Object.entries(this.modelMonthDict)
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
    // Trigger redraw when things changes
    watch(
      [this.selectedTimeRange, this.selectedMonthRange, this.selectedModel],
      () => {
        this.selectedMonthRangeList = generateMonthRangeList(
          this.selectedMonthRange.value[0],
          this.selectedMonthRange.value[1]
        );
        console.log(this.selectedModel.value);
        this.selectedModel.value[1].length > 0
          ? (this.mode = "compare")
          : (this.mode = "single");
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

  _subsetData() {
    const selectData = (files) => {
      let curBMUData = this.BMUData;
      if (!files.includes("All")) {
        // curBlockedCenterofMass = this.blockedCenterofMassData.filter((d) =>
        //   this.selectedModel.value.includes(d.name)
        // );
        curBMUData = this.BMUData.filter((d) => files.includes(d.name));
      }
      // curBlockedCenterofMass = curBlockedCenterofMass.filter((d) =>
      //   this.selectedMonthRangeList.includes(d.month)
      // );
      curBMUData = curBMUData.filter(
        (d) =>
          this.selectedMonthRangeList.includes(d.month) &&
          d.year >= this.selectedTimeRange.value[0] &&
          d.year <= this.selectedTimeRange.value[1]
      );
      return curBMUData;
    };

    let curBMUData;
    if (this.mode === "single") {
      curBMUData = selectData(this.selectedModel.value[0]);
    } else {
      // compare mode
      curBMUData = [
        selectData(this.selectedModel.value[0]),
        selectData(this.selectedModel.value[1]),
      ];
    }
    console.log(curBMUData);
    return curBMUData;
  }

  _getFreq(curBMUData) {
    const countFrequecy = (arr) => {
      let freq = {};
      arr.forEach((d) => {
        if (d.coords in freq) {
          freq[d.coords] += 1;
        } else {
          freq[d.coords] = 1;
        }
      });
      return Object.entries(freq)
        .map((d) => [
          d[0].split(",").map((d) => parseFloat(d)),
          d[1] / arr.length,
        ])
        .filter((d) => d[1] > 0.01);
    };
    let freq;
    if (this.mode == "single") {
      freq = countFrequecy(curBMUData);
    } else {
      console.log("Calculating freq for compare mode");
      let g1 = countFrequecy(curBMUData[0]).map((d) => {
        return { ...d, group: "group1" };
      });
      let g2 = countFrequecy(curBMUData[1]).map((d) => {
        return { ...d, group: "group2" };
      });
      // concat the two groups
      freq = g1.concat(g2);
    }
    return freq;
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    let ret = [];
    let curBMUData = this._subsetData();
    let freq = this._getFreq(curBMUData);

    // if freq is an empty dict
    if (freq.length == 0) {
      this.layerList = [];
      return ret;
    }

    // console.log(curHeatmapData);

    // let monthlyCOMPath = new PathLayer({
    //   id: `curve-monthly-com-path`,
    //   // data: this.blockedCenterofMass,
    //   data: curBlockedCenterofMass,
    //   positionFormat: "XY",
    //   getPath: (d) => pointsToCurve(d.path).flat(),
    //   getColor: (d) => [...colorSim(d.name), 125],
    //   getWidth: 0.1,
    //   // opacity: (d) => 0.1 * d.decade,
    //   // d.name.includes("historical") ? [255, 0, 0] : [0, 0, 255],
    //   getRadius: 0.2,
    //   pickable: true,
    //   autoHighlight: true,
    //   onHover: (info, event) => {
    //     // imgSrc.value = `http://localhost:5002/node_images/${info.object.id}.png`;
    //     // console.log("Clicked:", info.object, event);
    //   },
    //   getFilterValue: (d) => d.month,
    //   filterRange: [
    //     this.selectedMonthRange.value[0],
    //     this.selectedMonthRange.value[1],
    //   ],
    //   // getFilterCategory: (d) => getModelType(d.name),
    //   // filterCategories: ["ACCESS-CM2", "CNRM-ESM2-1"],
    //   // getFilterCategory: (d) => d.name,
    //   // filterCategories: ["ACCESS-CM2"],
    //   onFilteredItemsChange: (e) => {
    //     console.log("Filtered", e);
    //   },
    //   extensions: [
    //     new DataFilterExtension({
    //       filterSize: 1,
    //       countItems: true,
    //     }),
    //     // new DataFilterExtension({ categorySize: 1, countItems: true }),
    //   ],
    // });
    // let blockedMonthlyCOMScatter = new ScatterplotLayer({
    //   id: `curve-blocked-com-center`,
    //   data: curBlockedCenterofMass
    //     .map((d) =>
    //       d.path.map((e) => {
    //         return {
    //           coords: e,
    //           month: d.month,
    //           name: getModelType(d.name),
    //         };
    //       })
    //     )
    //     .flat(),
    //   getPosition: (d) => d.coords,
    //   // getColor: (d) => [
    //   //     ...colorSim(getModelType(d.name)),
    //   //     (255 / 10) * d.block + 30,
    //   // ],
    //   getRadius: 0.1,
    //   extensions: [new DataFilterExtension({ filterSize: 1 })],
    //   getFilterValue: (d) => d.month,
    //   filterRange: [
    //     this.selectedMonthRange.value[0],
    //     this.selectedMonthRange.value[1],
    //   ],
    //   // getFilterCategory: (d) => {
    //   //     console.log(d);
    //   //     return d.name;
    //   // },
    //   // filterCategories: [this.selectedModel.value],
    // });
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

    // let cd = [curHeatmapData.length, curHeatmapData.length * 2];
    // console.log(curHeatmapData);

    // let heatmap = new HeatmapLayer({
    //   id: "curve-heatmap",
    //   data: curHeatmapData,
    //   // data: [{ coords: [0, 0], name: "ACCESS-CM2", month: 1, year: 0 }],
    //   getPosition: (d) => d.coords,
    //   radiusPixels: 120,
    //   debounceTimeout: 750,
    //   opacity: 0.7,
    //   weightsTextureSize: 256,
    //   // threshold: 0.2,
    //   colorDomain: cd,
    //   // colorDomain: [50, 150],
    //   // aggregation: "MEAN",
    //   // extensions: [new DataFilterExtension({ filterSize: 1, categorySize: 1 })],
    //   getFilterValue: (d) => d.year,
    //   // getFilterCategory: (d) => d.month,
    //   // filterCategories: ["1"],
    //   filterRange: [
    //     // [this.selectedMonthRange.value[0], this.selectedMonthRange.value[1]],
    //     this.selectedTimeRange.value[0],
    //     this.selectedTimeRange.value[1],
    //   ],
    //   extensions: [new DataFilterExtension({ filterSize: 1 })],
    // });

    let gridcell = new GridCellLayer({
      id: "grid-cell-layer",
      data: freq,
      getPosition: (d) => d[0],
      getElevation: (d) => Math.abs(d[1] * 50),
      getColor: (d) => {
        if (this.mode == "single") {
          return interpolateGreens(d[1] / 0.05)
            .replace(/[^\d,]/g, "")
            .split(",")
            .map((d) => Number(d));
        } else {
          return d.group == "group1"
            ? hexToRgb("#2b9e77")
            : hexToRgb("#d95f02");
        }
      },
      cellSize: 0.25,
    });
    ret = [...ret, gridcell];
    const resolution = 200;
    if (this.mode == "single") {
      let kdeResult = kde2d(
        curBMUData.map((d) => d.coords[0]),
        curBMUData.map((d) => d.coords[1]),
        {
          n: resolution,
          h: [1, 1],
        }
      );
      const sum = kdeResult.z._buffer.reduce((acc, curr) => acc + curr, 0);
      // Estimate the normal of the KDE surface
      const getAdjacentIndices = (i) => {
        let ret = [];
        if (i % resolution > 0 && i % resolution < resolution - 1) {
          ret = [...ret, i - 1, i + 1];
        }
        if (
          Math.floor(i / resolution) > 0 &&
          Math.floor(i / resolution) < resolution - 1
        ) {
          ret = [...ret, i - resolution, i + resolution];
        }
        return ret;
      };

      let heightMultiplier = 70000;

      const crossProduct3DandNorm = (a, b) => {
        let ret = [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ];
        return ret.map(
          (d) => d / Math.sqrt(ret.reduce((acc, curr) => acc + curr ** 2, 0))
        );
      };
      // let normal = Array.from(kdeResult.z._buffer).map((d, i) => {
      //   let adj = getAdjacentIndices(i);
      //   if (adj.length < 4) {
      //     return [0, 0, 0];
      //   } else {
      //     let x = kdeResult.x[Math.floor(adj[0] / resolution)];
      //     let y = kdeResult.y[adj[0] % resolution];
      //     let z = kdeResult.z._buffer[adj[0]] * heightMultiplier;
      //     let a = [x, y, z];
      //     x = kdeResult.x[Math.floor(adj[1] / resolution)];
      //     y = kdeResult.y[adj[1] % resolution];
      //     z = kdeResult.z._buffer[adj[1]] * heightMultiplier;
      //     let b = [x, y, z];
      //     x = kdeResult.x[Math.floor(adj[2] / resolution)];
      //     y = kdeResult.y[adj[2] % resolution];
      //     z = kdeResult.z._buffer[adj[2]] * heightMultiplier;
      //     let c = [x, y, z];
      //     x = kdeResult.x[Math.floor(adj[3] / resolution)];
      //     y = kdeResult.y[adj[3] % resolution];
      //     z = kdeResult.z._buffer[adj[3]] * heightMultiplier;
      //     let d = [x, y, z];
      //     let v1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      //     let v2 = [d[0] - c[0], d[1] - c[1], d[2] - c[2]];
      //     return crossProduct3DandNorm(v2, v1);
      //   }
      // });
      // console.log(normal);

      // Print the sum
      // let maxValue = Math.max(...kdeResult.z._buffer);
      // console.log(kdeResult);

      ret = [
        ...ret,
        new PlotLayer({
          id: "surface-layer",
          getPosition: (u, v) => {
            return [
              kdeResult.x[Math.round(u * (resolution - 1))],
              kdeResult.y[Math.round(v * (resolution - 1))],
              (kdeResult.z._buffer[
                Math.round(
                  u * resolution * (resolution - 1) + v * (resolution - 1)
                )
              ] /
                sum) *
                heightMultiplier,
            ];
          },
          // getNormal: (u, v) => {
          //   return normal[
          //     parseInt(u * resolution * (resolution - 1) + v * (resolution - 1))
          //   ];
          // },
          // getColor: (x, z, y) => [40, interpolateGreens(z/15), 160, (z / 15) * 255],
          getColor: (x, y, z) => {
            let t = interpolateGreens(
              scaleLinear().domain([0, 25]).range([0, 1])(z)
            )
              .replace(/[^\d,]/g, "")
              .split(",")
              .map((d) => Number(d));
            t.push((z / 5) * 255);
            return t;
          },
          uCount: resolution,
          vCount: resolution,
          drawAxes: false,
          axesPadding: 0.25,
          axesColor: [0, 0, 0, 128],
          pickable: true,
          updateTriggers: {
            getPosition: curBMUData,
          },
        }),
      ];
    } else {
      console.log("SDFSDF");
      let kdeResult1 = kde2d(
        curBMUData[0].map((d) => d.coords[0]),
        curBMUData[0].map((d) => d.coords[1]),
        {
          n: resolution,
          h: [1, 1],
        }
      );
      let kdeResult2 = kde2d(
        curBMUData[1].map((d) => d.coords[0]),
        curBMUData[1].map((d) => d.coords[1]),
        {
          n: resolution,
          h: [1, 1],
        }
      );
      const sum1 = kdeResult1.z._buffer.reduce((acc, curr) => acc + curr, 0);
      const sum2 = kdeResult2.z._buffer.reduce((acc, curr) => acc + curr, 0);
      let heightMultiplier = 70000;

      ret = [
        ...ret,
        new PlotLayer({
          getPosition: (u, v) => {
            return [
              kdeResult1.x[Math.round(u * (resolution - 1))],
              kdeResult1.y[Math.round(v * (resolution - 1))],
              (kdeResult1.z._buffer[
                Math.round(
                  u * resolution * (resolution - 1) + v * (resolution - 1)
                )
              ] /
                sum1) *
                heightMultiplier,
            ];
          },
          // getColor: (x, z, y) => [40, interpolateGreens(z/15), 160, (z / 15) * 255],
          getColor: (x, y, z) => {
            let t = interpolateRgb(
              "white",
              "#1b9e77"
            )(scaleLinear().domain([0, 25]).range([0, 1])(z))
              .replace(/[^\d,]/g, "")
              .split(",")
              .map((d) => Number(d));
            t.push((z / 8) * 255);
            return t;
          },
          uCount: resolution,
          vCount: resolution,
          drawAxes: false,
          axesPadding: 0.25,
          axesColor: [0, 0, 0, 128],
          pickable: true,
          updateTriggers: {
            getPosition: curBMUData,
          },
        }),
        new PlotLayer({
          getPosition: (u, v) => {
            return [
              kdeResult2.x[Math.round(u * (resolution - 1))],
              kdeResult2.y[Math.round(v * (resolution - 1))],
              (kdeResult2.z._buffer[
                Math.round(
                  u * resolution * (resolution - 1) + v * (resolution - 1)
                )
              ] /
                sum2) *
                heightMultiplier,
            ];
          },
          // getColor: (x, z, y) => [40, interpolateGreens(z/15), 160, (z / 15) * 255],
          getColor: (x, y, z) => {
            let t = interpolateRgb(
              "white",
              "#d95f02"
            )(scaleLinear().domain([0, 25]).range([0, 1])(z))
              .replace(/[^\d,]/g, "")
              .split(",")
              .map((d) => Number(d));
            t.push((z / 8) * 255);
            // t.push(255);
            return t;
          },
          uCount: resolution,
          vCount: resolution,
          drawAxes: false,
          axesPadding: 0.25,
          axesColor: [0, 0, 0, 128],
          pickable: true,
          updateTriggers: {
            getPosition: curBMUData,
          },
        }),
      ];
    }
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
    // ret = [...ret, blockedMonthlyCOMScatter];

    this.layerList = ret;
    return ret;
  }
}
