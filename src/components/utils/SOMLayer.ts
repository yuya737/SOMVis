import { TextLayer, PolygonLayer } from "@deck.gl/layers";

import { subsetType, timeType } from "./utils";

import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { ComputedRef, watch, Ref } from "vue";
import API from "@/API/api";

export class SOMLayer extends AbstractLayerGenerator {
  // readonly coords: any;
  readonly nodeMapGetter: ComputedRef<(timeType: timeType) => any>;
  readonly pathDataGetter: ComputedRef<(timeType: timeType) => any>;
  readonly contourLevelGetter: ComputedRef<number[]>;

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

  currentStep: Ref<step>;

  // constructor(coords, name: string, timeRange: any, monthRange: any) {
  constructor({
    nodeMapGetter,
    pathDataGetter,
    contourLevelGetter,
    timeRange,
    monthRange,
    model,
    subsetType,
    hoveredFile,
    extent,
    interpolatedSurface,
    time_type,
    currentStep,
  }) {
    super();
    this.nodeMapGetter = nodeMapGetter;
    this.pathDataGetter = pathDataGetter;
    this.contourLevelGetter = contourLevelGetter;

    this.selectedTimeRange = timeRange;
    this.selectedMonthRange = monthRange;
    this.selectedModel = model;
    this.hoveredFile = hoveredFile;
    this.extent = extent;
    this.interpolatedSurface = interpolatedSurface;
    this.time_type = time_type;
    this.currentStep = currentStep;

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
        this.contourLevelGetter,
        this.currentStep.value,
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

    // const thresholds = [0.25, 0.5, 0.75];
    const thresholds = this.contourLevelGetter.value;

    thresholds.forEach((threshold, i) => {
      const BMUPolygon = API.fetchData("/get_bounding_shape", true, {
        points: curBMUData.map((d) => d.coords),
        threshold: threshold,
      });

      const labelsPromise = BMUPolygon.then((BMUPolygon) => {
        const locations = BMUPolygon.map((d) => d[0]);
        return locations;
      });

      const layer = new PolygonLayer({
        id: `polygon-layer-${i}`,
        data: BMUPolygon,
        getPolygon: (d) => d,
        stroked: false,
        opacity: 0.1,
        visible: this.currentStep.value == "Analyze",
      });
      const polygonLabelLayer = new TextLayer({
        id: `polygon-layer-label-${i}`,
        data: labelsPromise,
        getPosition: (d) => [...d, 2],
        getText: () => `Top ${threshold * 100}%`,
        getColor: () => [0, 0, 0, 255],
        background: true,
        backgroundPadding: [4, 4],
        getSize: 20,
        fontFamily: "Arial",
        visible: this.currentStep.value == "Analyze",
      });
      ret = [...ret, layer, polygonLabelLayer];
    });

    this.layerList = ret;
    this.needsToRedraw = false;
    return ret;
  }
}
