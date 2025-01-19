import {
  ScatterplotLayer,
  PathLayer,
  TextLayer,
  CompositeLayer,
  GridCellLayer,
  PolygonLayer,
} from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { interpolateGreens } from "d3-scale-chromatic";
import { interpolateRgb } from "d3-interpolate";
import { interpolateRdBu } from "d3-scale-chromatic";
import { scaleLinear } from "d3-scale";
import PlotLayer from "@/components/layers/plot-layer";
import kde2d from "@stdlib/stats-kde2d";
import { scaleLinear } from "d3-scale";

import {
  colorSim,
  addJitter,
  getModelType,
  pointsToCurve,
  generateMonthRangeList,
  hexToRgb,
  stripSOMprefix,
  subsetType,
  timeType,
} from "./utils";

import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { ComputedRef, watch } from "vue";
import API from "@/api/api";
import { useStore } from "@/store/main";

export class SOMLayer extends AbstractLayerGenerator {
  // readonly coords: any;
  readonly nodeMapGetter: ComputedRef<(timeType: timeType) => any>;
  readonly pathDataGetter: ComputedRef<(timeType: timeType) => any>;

  // readonly name: string;
  readonly selectedTimeRange: any;
  readonly selectedMonthRange: any;
  // readonly selectedModel: ComputedRef<[EnsembleMember[], EnsembleMember[]]>;
  readonly selectedModel: ComputedRef<EnsembleMember[]>;

  readonly selectedSubsetType: any;
  readonly hoveredFile: any;

  readonly blockedCenterofMassData: any;

  readonly interpolatedSurface: any;

  // Need to have two ranges for the heatmap to account for Dec-Feb type queries that wrap around the year
  selectedMonthRangeList: any = [];
  needsToRedraw: boolean = false;
  layerList: any = null;
  extent: any = [[], []];
  mode: string = "single"; // either single or compare
  time_type: timeType;
  BMUData: BMUData[];

  // constructor(coords, name: string, timeRange: any, monthRange: any) {
  constructor({
    nodeMapGetter,
    pathDataGetter,
    timeRange,
    monthRange,
    model,
    subsetType,
    hoveredFile,
    extent,
    interpolatedSurface,
    time_type,
  }) {
    super();
    this.nodeMapGetter = nodeMapGetter;
    this.pathDataGetter = pathDataGetter;

    this.selectedTimeRange = timeRange;
    this.selectedMonthRange = monthRange;
    this.selectedModel = model;
    this.hoveredFile = hoveredFile;
    this.extent = extent;
    this.interpolatedSurface = interpolatedSurface;
    this.time_type = time_type;

    this.selectedMonthRangeList = monthRange;

    this.selectedSubsetType = subsetType;

    // this.BMUData = Object.entries(this.data)
    //   .map(([model, BMUs]) =>
    //     BMUs.map((d) => {
    //       return {
    //         name: model,
    //         coords: d.coords,
    //         month: d.month,
    //         year: d.year,
    //       };
    //     })
    //   )
    //   .flat(2);
    watch(
      () => this.nodeMapGetter.value(this.time_type),
      (nodeMap) => {
        this.BMUData = Object.entries(this.pathDataGetter.value(this.time_type))
          .map(([model, BMUs]) =>
            BMUs.map((d) => {
              return {
                name: model,
                coords: nodeMap[d.id]["coords"],
                month: d.month,
                year: d.year,
              };
            })
          )
          .flat(2);
      },
      { immediate: true }
    );
    watch(
      [
        this.selectedTimeRange,
        this.selectedMonthRange,
        this.selectedModel,
        this.selectedSubsetType,
        this.hoveredFile,
      ],
      () => {
        // this.selectedModel.value[1].length > 0
        //   ? (this.mode = "compare")
        //   : (this.mode = "single");
        this.needsToRedraw = true;
      }
    );
  }

  _subsetData(): BMUData[] {
    const selectData = (files: EnsembleMember[]) => {
      // Filter by name
      let fileStrings = files.map(
        (d) => `${d.model_name}:${d.ssp}:${d.variant}`
      );
      let curBMUData = this.BMUData.filter((d) => fileStrings.includes(d.name));

      // Filter my month and year
      if (this.selectedSubsetType.value == subsetType.month) {
        curBMUData = curBMUData.filter((d) =>
          this.selectedMonthRangeList.value.includes(d.month)
        );
        if (this.selectedTimeRange.value[0] != -1) {
          curBMUData = curBMUData.filter((d) =>
            this.selectedTimeRange.value.includes(d.year)
          );
        }
      } else {
        curBMUData = this.BMUData.filter(
          (d) => d.id == subsetType.waterYear
        ).filter((d) => files.includes(d.name));
        if (this.selectedTimeRange.value[0] != -1) {
          curBMUData = curBMUData.filter((d) =>
            this.selectedTimeRange.value.includes(d.year)
          );
        }
      }
      return curBMUData;
    };
    let curBMUData;

    // HOVER MODE
    if (this.hoveredFile.value != null) {
      curBMUData = selectData([this.hoveredFile.value]);
      return curBMUData;
    }

    curBMUData = selectData(this.selectedModel.value);
    // if (this.mode === "single") {
    // } else {
    //   // compare mode
    //   curBMUData = [
    //     selectData(this.selectedModel.value[0]),
    //     selectData(this.selectedModel.value[1]),
    //   ];
    // }
    return curBMUData;
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    let ret = [];
    let curBMUData = this._subsetData();
    console.log("BMU Data length", curBMUData.length);

    if (curBMUData.length == 0) {
      this.layerList = [];
      return ret;
    }

    const thresholds = [0.3, 0.5];

    thresholds.forEach((threshold, i) => {
      const BMUPolygon = API.fetchData("/get_bounding_shape", true, {
        points: curBMUData.map((d) => d.coords),
        threshold: threshold,
      });
      const layer = new PolygonLayer({
        id: `polygon-layer-${i}`,
        data: BMUPolygon,
        getPolygon: (d) => d,
        stroked: false,
        opacity: scaleLinear().domain(thresholds).range([0.1, 0.2])(threshold),
        // opacity: 0.5,
      });
      ret = [...ret, layer];
    });

    this.layerList = ret;
    this.needsToRedraw = false;
    return ret;
  }
}
