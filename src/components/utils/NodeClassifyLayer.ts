import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
// import type { LayersList } from "deck.gl/typed";
import { colorPercentile, pointsToCurve } from "./utils";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import * as d3 from "d3";
import { PolygonLayer } from "deck.gl/typed";
import { watch } from "vue";

export class NodeClassifyLayer extends AbstractLayerGenerator {
  readonly mappingData;
  readonly classifyData;
  readonly contourData;

  hotspotPolygons = null;
  monthHovered = null;
  layerList: any = null;

  constructor(
    mappingData,
    hotspotPolygons,
    classifyData,
    contourData,
    monthHovered
  ) {
    super();
    this.mappingData = mappingData;
    this.classifyData = classifyData;
    this.contourData = contourData;
    this.hotspotPolygons = hotspotPolygons;
    this.monthHovered = monthHovered;

    watch(monthHovered, (value) => {
      console.log("DEBUG: NodeClassifyLayer watch", value);
      this.needsToRedraw = true;
    });
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    // let data = this.mapping_data.map((d) => {
    //     return { ...d, classify_data: this.classify_data[d.id].value };
    // });

    let ret = [
      new PathLayer({
        id: "classify-layer",
        data: this.contourData,
        getPath: (d) =>
          pointsToCurve(d.contours.map((c) => [c[0], -c[1]])).flat(),
        positionFormat: "XY",
        getWidth: 0.1,
        getColor: (d) => colorPercentile(d.percentile),
      }),
      // new PathLayer({
      //     id: "classify-layer",
      //     data: [
      //         {
      //             // path: [-20, -63.19, 20, 142.918],
      //             path: [-8.43, 4.01, -8.03, 1.94],
      //             color: [240, 0, 0, 50],
      //         },
      //         {
      //             path: [2.177, 0.716, 5.13, -3.15],
      //             color: [0, 0, 240, 50],
      //         },
      //     ],
      //     getPath: (d) => d.path,
      //     getWidth: 0.5,
      //     positionFormat: "XY",
      //     getColor: (d) => d.color,
      // }),
      // new TextLayer({
      //   id: "classify-annotate-layer",
      //   fontFamily: "Arial",
      //   data: this.contourData,
      //   getPosition: (d) => [d.contours[0][0], -d.contours[0][1], 0.1],
      //   getText: (d) => `Percentile: ${d.percentile}`,
      //   depthTest: false,
      //   getSize: 32,
      // }),
      // new ContourLayer({
      //     id: "classify-layer-contour",
      //     data: data,
      //     contour: [
      //         { threshold: [0, 7.465e-5], color: [240, 0, 0, 50] },
      //         { threshold: [0.00042555, 1], color: [0, 0, 240, 50] },
      //     ],
      //     getPosition: (d) => [d.coords[0], -d.coords[1]],
      //     getWeight: (d) => d.classify_data,
      //     aggregation: "MEAN",
      // }),
      // new ScatterplotLayer({
      //     id: "classify-layer-2",
      //     data: data,
      //     getPosition: (d) => [d.coords[0], -d.coords[1]],
      //     getColor: (d) => {
      //         if (d.classify_data < 7.465e-5) {
      //             return [240, 0, 0, 50];
      //         } else if (d.classify_data > 0.00042555) {
      //             return [0, 0, 240, 50];
      //         } else {
      //             return [0, 0, 0, 0];
      //         }
      //     },
      //     getRadius: 0.1,
      //     pickable: true,
      //     onClick: (info, event) => {
      //         console.log(info);
      //     },
      // }),
    ];
    if (this.monthHovered.value) {
      let month = this.monthHovered.value;
      console.log("DEBUG HOTSPOT POLYGONS MONTH CHANGED", month);
      this.hotspotPolygons[month].forEach((polygon, index) => {
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

    // Object.keys(this.hotspotPolygons).forEach((month) => {
    //   console.log(
    //     "DEBUG HOTSPOT POLYGONS",
    //     d3.interpolateRgbBasis(["purple", "green", "orange"])((month - 1) / 11)
    //   );
    //   this.hotspotPolygons[month].forEach((polygon, index) => {
    //     // debugger;
    //     ret.push(
    //       new ScatterplotLayer({
    //         id: `hotspot-scatter-${month}-${index}`,
    //         data: polygon,
    //         // data: [this.hotspotPolygons[month]],
    //         getPosition: (d) => [d[0], -d[1]],
    //         getRadius: 0.1,
    //         // getPolygon: (vertices) => {
    //         //   let ret = vertices.map((p) => [p[0], -p[1]]);
    //         //   console.log("DEBUG HOTSPOT POLYGONS", ret, vertices);
    //         //   return ret;
    //         // },
    //         filled: true,
    //         // stroked: true,
    //         opacity: 0.2,
    //         pickable: true,
    //         // getFillColor: d3.interpolateRainbow(month - 1 / 11),
    //         // getFillColor: d3
    //         //   .interpolateRgbBasis(["purple", "green", "orange"])(
    //         //     (month - 1) / 11
    //         //   )
    //         //   .replace(/[^\d,]/g, "")
    //         //   .split(",")
    //         //   .map((d) => Number(d)),
    //         visible: false,

    //         onClick: (info, event) => {
    //           console.log("Clicked:", month);
    //         },
    //       })
    //     );
    //     ret.push(
    //       new PolygonLayer({
    //         id: `hotspot-polygon-${month}-${index}`,
    //         data: [polygon],
    //         // data: [this.hotspotPolygons[month]],
    //         getPolygon: (vertices) => {
    //           let ret = vertices.map((p) => [p[0], -p[1]]);
    //           console.log("DEBUG HOTSPOT POLYGONS", ret, vertices);
    //           return ret;
    //         },
    //         filled: true,
    //         // stroked: true,
    //         opacity: 0.2,
    //         getLineWidth: 0.1,
    //         pickable: true,
    //         // getFillColor: d3.interpolateRainbow(month - 1 / 11),
    //         getFillColor: d3
    //           .interpolateRgbBasis(["purple", "green", "orange"])(
    //             (month - 1) / 11
    //           )
    //           .replace(/[^\d,]/g, "")
    //           .split(",")
    //           .map((d) => Number(d)),

    //         onClick: (info, event) => {
    //           console.log("Clicked:", month);
    //         },
    //       })
    //     );
    //   });
    // });

    this.layerList = ret;
    return ret;
  }
}
