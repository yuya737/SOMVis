import { PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
// import type { LayersList } from "deck.gl/typed";
import { colorPercentile, pointsToCurve, timeType } from "./utils";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import * as d3 from "d3";
import { PolygonLayer } from "deck.gl/typed";
import PlotLayer from "@/components/layers/plot-layer";
import { watch } from "vue";
import { getActivePinia } from "pinia";

export class NodeClassifyLayer extends AbstractLayerGenerator {
  readonly mappingDataGetter;
  readonly classifyDataGetter;
  readonly contourDataGetter;
  readonly interpolatedSurfaceGetter;

  hotspotPolygonsGetter = null;
  monthHovered = null;
  time_type: timeType = null;
  layerList: any = null;

  constructor({
    mappingDataGetter,
    hotspotPolygonsGetter,
    classifyDataGetter,
    contourDataGetter,
    monthHovered,
    interpolatedSurfaceGetter,
    time_type,
  }) {
    super();
    this.mappingDataGetter = mappingDataGetter;
    this.classifyDataGetter = classifyDataGetter;
    this.contourDataGetter = contourDataGetter;
    this.hotspotPolygonsGetter = hotspotPolygonsGetter;
    this.monthHovered = monthHovered;
    this.interpolatedSurfaceGetter = interpolatedSurfaceGetter;
    this.time_type = time_type;

    watch(monthHovered, (value) => {
      console.log("DEBUG: NodeClassifyLayer watch", value);
      this.needsToRedraw = true;
    });
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
    const hotspotPolygons = this.hotspotPolygonsGetter.value(this.time_type);

    let ret = [
      new PathLayer({
        id: "classify-layer",
        data: contourData,
        getPath: (d) => d.contours.map((c) => [c[0], -c[1]]).flat(),
        // pointsToCurve(d.contours.map((c) => [c[0], -c[1]])).flat(),

        positionFormat: "XY",
        getWidth: 0.2,
        // pickable: true,
        getColor: (d) => colorPercentile(d.percentile),
      }),
      new TextLayer({
        id: "classify-text-layer",
        data: contourData,
        getPosition: (d) => [
          d.contours[d.contours.length - 1][0],
          -d.contours[d.contours.length - 1][1],
          3,
        ],
        getText: (d) => `${d.percentile}th Percentile`,
        getSize: 24,
        fontFamily: "Arial",
      }),
    ];
    if (this.monthHovered.value) {
      let month = this.monthHovered.value;
      console.log("DEBUG HOTSPOT POLYGONS MONTH CHANGED", month);
      hotspotPolygons[month].forEach((polygon, index) => {
        // debugger;
        ret.push(
          new ScatterplotLayer({
            id: `hotspot-scatter-${month}-${index}`,
            data: polygon,
            // data: [this.hotspotPolygons[month]],
            getPosition: (d) => [d[0], -d[1]],
            getRadius: 0.1,
            // getPolygon: (vertices) => {
            //   let ret = vertices.map((p) => [p[0], -p[1]]);
            //   console.log("DEBUG HOTSPOT POLYGONS", ret, vertices);
            //   return ret;
            // },
            filled: true,
            // stroked: true,
            opacity: 0.1,
            pickable: true,
            // getFillColor: d3.interpolateRainbow(month - 1 / 11),
            // getFillColor: d3
            //   .interpolateRgbBasis(["purple", "green", "orange"])(
            //     (month - 1) / 11
            //   )
            //   .replace(/[^\d,]/g, "")
            //   .split(",")
            //   .map((d) => Number(d)),
            visible: false,

            onClick: (info, event) => {
              console.log("Clicked:", month);
            },
          })
        );
        ret.push(
          new PolygonLayer({
            id: `hotspot-polygon-${month}-${index}`,
            data: [polygon],
            // data: [this.hotspotPolygons[month]],
            getPolygon: (vertices) => {
              let ret = vertices.map((p) => [p[0], -p[1]]);
              // console.log("DEBUG HOTSPOT POLYGONS", ret, vertices);
              return ret;
            },
            filled: true,
            // stroked: true,
            opacity: 0.2,
            getLineWidth: 0.1,
            visible: true,
            pickable: true,
            // getFillColor: d3.interpolateRainbow(month - 1 / 11),
            getFillColor: d3
              .interpolateRgbBasis(["purple", "green", "orange"])(
                (month - 1) / 11
              )
              .replace(/[^\d,]/g, "")
              .split(",")
              .map((d) => Number(d)),

            onClick: (info, event) => {
              console.log("Clicked:", month);
            },
          })
        );
      });
    }

    this.layerList = ret;
    this.needsToRedraw = false;
    console.log("DEBUG: NodeClassify", ret);
    return ret;
  }
}
