import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import API from "@/API/api";
import { watch, Ref, ComputedRef } from "vue";
import { useStore } from "@/store/main";
import { PolygonLayer, TextLayer, ScatterplotLayer } from "@deck.gl/layers";
import * as d3 from "d3";
import { points } from "@turf/turf";

export class SFBaySOMLayer extends AbstractLayerGenerator {
  readonly SFBaySetting: any;
  readonly nodeMapGetter: any;
  readonly pathDataGetter: any;
  readonly diffFieldDataGetter: ComputedRef<() => any>;
  readonly isShowingDiffField: boolean;
  readonly time_type: any;
  readonly store: any;

  SFBayBMUData: any[] = [];
  BMUData: BMUData[] = [];

  currentStep: Ref<step>;

  constructor({
    SFBaySetting,
    time_type,
    nodeMapGetter,
    pathDataGetter,
    diffFieldDataGetter,
    currentStep,
    isShowingDiffField,
  }) {
    super();
    this.SFBaySetting = SFBaySetting;
    this.time_type = time_type;
    this.nodeMapGetter = nodeMapGetter;
    this.pathDataGetter = pathDataGetter;
    this.diffFieldDataGetter = diffFieldDataGetter;
    this.currentStep = currentStep;
    this.isShowingDiffField = isShowingDiffField;

    this.store = useStore();

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
                id: d.id,
              };
            })
          )
          .flat(2);
      },
      { immediate: true }
    );
    watch([this.currentStep, isShowingDiffField], () => {
      console.log(
        "SFBay SOM Layer: Redrawing due to step change or diff field toggle"
      );
      this.needsToRedraw = true;
    });
    watch(
      this.SFBaySetting,
      () => {
        if (!this.SFBaySetting.value.ignore) {
          this.fetchSFBayData()
            .then(() => {
              this.needsToRedraw = true;
              this.store.redrawFlag = !this.store.redrawFlag; // Trigger redraw in store
            })
            .catch((error) => {
              console.error("Error in fetchSFBayData:", error);
            });
        }
      },
      { deep: true, immediate: true }
    );
    watch(
      this.diffFieldDataGetter.value,
      () => {
        console.log("SFBay SOM Layer: Redrawing due to diff field data change");
        this.needsToRedraw = true;
      },
      { deep: true }
    );
  }
  async fetchSFBayData() {
    try {
      const BMUPolygon = await API.fetchData("/get_sfbay", true, {
        ...this.SFBaySetting.value,
        dataset_type: this.store.currentDatasetType,
      });
      const nodeMap = this.nodeMapGetter.value(this.time_type);
      this.SFBayBMUData = BMUPolygon.map((i) => {
        return {
          coords: nodeMap[i]["coords"],
        };
      });
    } catch (error) {
      this.SFBayBMUData = [];
    }
  }
  getLayers() {
    console.log("SFBay SOM Layer: getLayers called");
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    if (
      this.SFBaySetting.value.ignore & !this.isShowingDiffField.value ||
      this.SFBayBMUData.length === 0
    ) {
      // If SF Bay compare and ignore
      this.layerList = [];
      console.log("DEBUG: SFBay SOM Ignoring");
      this.needsToRedraw = false;
      return this.layerList;
    }
    let ret = [];
    let curBMUData = this.BMUData;
    let significantBMUs: number[] = [];

    let thresholds = [0.1, 0.25, 0.5, 0.75];
    if (this.isShowingDiffField.value) {
      thresholds = [0.9];
      const hypothesisTestResults =
        this.diffFieldDataGetter.value["hypothesis_test_results"];
      significantBMUs = Object.keys(hypothesisTestResults)
        .filter((key) => hypothesisTestResults[key] === 1)
        .map((key) => parseInt(key));
      // const differentBMUs = this.diffFieldDataGetter.value[
      //   "hypothesis_test_results"
      // ]
      //   .filter((k, v) => v > 0)
      //   .map((d) => d.id);
      console.log("SFBay SOM Layer: Significant BMUs", significantBMUs);

      curBMUData = this.BMUData.filter((d) => significantBMUs.includes(d.id));
      // const nodeMap = this.nodeMapGetter.value(this.time_type);
      // curBMUData = significantBMUs.map((i) => {
      //   return {
      //     coords: nodeMap[i]["coords"],
      //   };
      // });
    } else {
      curBMUData = this.SFBayBMUData;
    }

    console.log(
      "SF Bay BMU data",
      this.isShowingDiffField,
      curBMUData,
      this.SFBayBMUData
    );
    const nodeMap = this.nodeMapGetter.value(this.time_type);
    const xmin = Math.min(...nodeMap.map((d) => d.coords[0]));
    const xmax = Math.max(...nodeMap.map((d) => d.coords[0]));
    const ymin = Math.min(...nodeMap.map((d) => d.coords[1]));
    const ymax = Math.max(...nodeMap.map((d) => d.coords[1]));

    thresholds.forEach((threshold, i) => {
      const BMUPolygon = API.fetchData("/get_bounding_shape", true, {
        points: curBMUData.map((d) => d.coords),
        threshold: threshold,
        potentially_small: this.isShowingDiffField.value,
        xmin: xmin,
        xmax: xmax,
        ymin: ymin,
        ymax: ymax,
      });

      const labelsPromise = BMUPolygon.then((BMUPolygon) => {
        const locations = BMUPolygon.map((d) => d[20]);
        return locations;
      });

      const layer = new PolygonLayer({
        id: `sf-bay-polygon-layer-${i}`,
        data: BMUPolygon,
        getPolygon: (d) => d,
        stroked: false,
        opacity: 0.04,
        visible: this.currentStep.value == "Analyze",
      });
      const polygonLabelLayer = new TextLayer({
        id: `sf-bay-text-layer-polygon-layer-label-${i}`,
        data: labelsPromise,
        getPosition: (d) => [...d, 2],
        getText: () => `Top ${threshold * 100}%`,
        getColor: () => [0, 0, 0, 255],
        background: true,
        backgroundPadding: [4, 4],
        getSize: 20,
        fontFamily: "Arial",
        visible: this.currentStep.value == "Analyze",
        // visible: false,
      });
      ret = [...ret, layer, polygonLabelLayer];
    });

    if (this.isShowingDiffField.value) {
      const diffPointData = this.nodeMapGetter
        .value(this.time_type)
        .map((d) => ({
          position: d.coords,
          id: d.id,
          value: this.diffFieldDataGetter.value["observed_diff"][d.id] || 0,
        }));

      const gaussianFilteredDiff = API.fetchData(
        "/run_diff_field_gauss_filter",
        true,
        {
          points: diffPointData,
          filter_size: 5,
        }
      ).then((data) => {
        data = data.map((d, index) => ({
          ...d,
          radius: significantBMUs.includes(index) ? 1.25 : 0.6,
        }));

        return data;
      });

      // Get the min and max values for the color scale domain
      const values = diffPointData.map((d) => d.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      const maxExtent = Math.max(Math.abs(minValue), Math.abs(maxValue));
      console.log(
        "Max extent for diff field color scale:",
        maxExtent,
        minValue,
        maxValue
      );
      const diffColorScale = d3
        .scaleDiverging()
        .domain([0.007, 0, -0.007]) // 2% difference
        .interpolator(d3.interpolatePuOr);

      ret = [
        // ...ret,
        new ScatterplotLayer({
          id: "sf-bay-diff-field-layer",
          // data: diffPointData,
          data: gaussianFilteredDiff,
          getPosition: (d) => d.position,
          getRadius: (d) => d.radius,
          getFillColor: (d) => {
            const color = d3.color(diffColorScale(d.value));
            return [color.r, color.g, color.b]; // RGBA format for deck.gl
          },
          visible: this.currentStep.value == "Analyze",
        }),
      ];
    }

    this.layerList = ret;
    this.needsToRedraw = false;
    return ret;
  }
}
