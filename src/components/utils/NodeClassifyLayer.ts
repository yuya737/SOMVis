import { PathLayer, TextLayer } from "@deck.gl/layers";
// import type { LayersList } from "deck.gl/typed";
import { colorPercentile, pointsToCurve } from "./utils";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";

export class NodeClassifyLayer extends AbstractLayerGenerator {
  readonly mappingData;
  readonly classifyData;
  readonly contourData;
  readonly needsToRedraw: boolean = false;

  layerList: any = null;

  constructor(mappingData, classifyData, contourData) {
    super();
    this.mappingData = mappingData;
    this.classifyData = classifyData;
    this.contourData = contourData;
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
      new TextLayer({
        id: "classify-annotate-layer",
        fontFamily: "Arial",
        data: this.contourData,
        getPosition: (d) => [d.contours[0][0], -d.contours[0][1]],
        getText: (d) => `Percentile: ${d.percentile}`,
        getSize: 32,
      }),
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
    this.layerList = ret;
    return [ret];
  }
}
