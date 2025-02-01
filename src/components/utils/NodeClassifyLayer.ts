import { PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
// import type { LayersList } from "deck.gl/typed";
import { colorPercentile, pointsToCurve, timeType } from "./utils";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import * as d3 from "d3";
import { PolygonLayer } from "deck.gl/typed";
import { watch } from "vue";
// import PlotLayer from "@/components/layers/plot-layer";
// import { getActivePinia } from "pinia";

export class NodeClassifyLayer extends AbstractLayerGenerator {
  readonly mappingDataGetter;
  readonly classifyDataGetter;
  readonly contourDataGetter;
  readonly interpolatedSurfaceGetter;

  hotspotPolygonsGetter = null;
  time_type: timeType = null;
  layerList: any = null;

  currentStep: Ref<step>;

  constructor({
    mappingDataGetter,
    hotspotPolygonsGetter,
    classifyDataGetter,
    contourDataGetter,
    interpolatedSurfaceGetter,
    time_type,
    currentStep,
  }) {
    super();
    this.mappingDataGetter = mappingDataGetter;
    this.classifyDataGetter = classifyDataGetter;
    this.contourDataGetter = contourDataGetter;
    this.hotspotPolygonsGetter = hotspotPolygonsGetter;
    this.interpolatedSurfaceGetter = interpolatedSurfaceGetter;
    this.time_type = time_type;
    this.currentStep = currentStep;

    watch(
      () => this.classifyDataGetter.value(this.time_type),
      () => {
        this.needsToRedraw = true;
      },
      { deep: true }
    );
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }

    const contourData = this.contourDataGetter.value(this.time_type);
    console.log("DEBUG: contourData", contourData);

    let ret = [
      new PathLayer({
        id: "classify-layer",
        data: contourData,
        getPath: (d) =>
          pointsToCurve(
            d.contours.map((c) => [c[0], c[1]]),
            0.0001
          ).flat(),
        // pointsToCurve(d.contours.map((c) => [c[0], -c[1]])).flat(),

        positionFormat: "XY",
        getWidth: 0.5,
        // pickable: true,
        getColor: (d) => colorPercentile(d.percentile),
      }),
      new TextLayer({
        id: "classify-text-layer",
        data: contourData,
        getPosition: (d) => [
          d.contours[d.contours.length - 1][0],
          d.contours[d.contours.length - 1][1],
          3,
        ],
        getText: (d) => `${d.percentile}th Percentile`,
        getSize: 24,
        fontFamily: "Arial",
      }),
    ];

    this.layerList = ret;
    this.needsToRedraw = false;
    console.log("DEBUG: NodeClassify", ret);
    return ret;
  }
}
