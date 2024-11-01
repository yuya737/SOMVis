import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { watch } from "vue";
import PlotLayer from "@/components/layers/plot-layer";
import {
  ScatterplotLayer,
  PointCloudLayer,
  PolygonLayer,
  BitmapLayer,
  IconLayer,
} from "deck.gl/typed";
import * as d3 from "d3";

export class Node3DLayer extends AbstractLayerGenerator {
  readonly interpolatedSurface: any;
  readonly mappingData: any;
  readonly meanPerNode: any;
  readonly monthHovered: any;
  readonly hotspotPolygons: any;
  readonly multiplier: number;

  constructor({
    interpolatedSurface,
    mappingData,
    meanPerNode,
    monthHovered,
    hotspotPolygons,
  }) {
    super();
    this.interpolatedSurface = interpolatedSurface;
    this.mappingData = mappingData;
    this.meanPerNode = meanPerNode;
    this.monthHovered = monthHovered;
    this.hotspotPolygons = hotspotPolygons;

    this.multiplier = 10;

    watch(monthHovered, (value) => {
      this.needsToRedraw = true;
    });
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    console.log("DEBUG: INTERPOLATED SURFACE", this.interpolatedSurface);
    let surface = new PlotLayer({
      id: "node3d-surface-layer",
      getPosition: (u, v) => {
        return [
          this.interpolatedSurface.x[
            Math.round(u * (this.interpolatedSurface.resolution - 1))
          ],
          -this.interpolatedSurface.y[
            Math.round(v * (this.interpolatedSurface.resolution - 1))
          ],
          // 10,
          this.interpolatedSurface.interpolatedSurface[
            Math.round(v * (this.interpolatedSurface.resolution - 1))
          ][Math.round(u * (this.interpolatedSurface.resolution - 1))] *
            this.multiplier +
            10,
        ];
      },
      getShouldDiscard: (u, v) =>
        this.interpolatedSurface.interpolatedSurface[
          Math.round(v * (this.interpolatedSurface.resolution - 1))
        ][Math.round(u * (this.interpolatedSurface.resolution - 1))] == 0,

      // getNormal: (u, v) => {
      //   return normal[
      //     parseInt(u * resolution * (resolution - 1) + v * (resolution - 1))
      //   ];
      // },
      // getColor: (x, z, y) => [40, interpolateGreens(z/15), 160, (z / 15) * 255],
      getColor: (x, y, z) => {
        // return [128, 0, 0, 255];
        // let t = interpolateGreens(
        // if (z == 10) {
        //   return [128, 0, 0, 0];
        // }
        let t = d3
          .interpolateRdBu(
            d3.scaleLinear().domain([-10, 10]).range([0, 1])(z - 10)
          )
          .replace(/[^\d,]/g, "")
          .split(",")
          .map((d) => Number(d));
        // t.push(128);
        // t.push((z / 4) * 255);
        return t;
      },
      uCount: this.interpolatedSurface.resolution,
      vCount: this.interpolatedSurface.resolution,
      drawAxes: false,
      axesPadding: 0.25,
      axesColor: [0, 0, 0, 128],
      pickable: true,
      material: {
        ambient: 0.8,
        specularColor: [0.3, 0.1, 0.2],
      },
    });
    let surface2 = new PlotLayer({
      id: "node3d-surface-layer2",
      getPosition: (u, v) => {
        return [
          this.interpolatedSurface.x[
            Math.round(u * (this.interpolatedSurface.resolution - 1))
          ],
          -this.interpolatedSurface.y[
            Math.round(v * (this.interpolatedSurface.resolution - 1))
          ],
          10,
        ];
      },
      getShouldDiscard: (u, v) => 0,

      // getNormal: (u, v) => {
      //   return normal[
      //     parseInt(u * resolution * (resolution - 1) + v * (resolution - 1))
      //   ];
      // },
      // getColor: (x, z, y) => [40, interpolateGreens(z/15), 160, (z / 15) * 255],
      getColor: (x, y, z) => {
        return [128, 128, 128, 35];
      },
      uCount: this.interpolatedSurface.resolution,
      vCount: this.interpolatedSurface.resolution,
      drawAxes: false,
      axesPadding: 0.25,
      axesColor: [0, 0, 0, 128],
      pickable: true,
    });

    // let scatter = new ScatterplotLayer({
    let scatter = new PointCloudLayer({
      id: "node3d-pointcloud-layer",
      data: this.mappingData.map((d, i) => {
        return { ...d, val: this.meanPerNode[i].value };
      }),
      getPosition: (d, i) => [
        d.coords[0],
        -d.coords[1],
        d.val * this.multiplier + 10 + 0.3,
        // this.meanPerNode[i].value * 20000 + 10,
      ],
      // sizeUnits: "meters",
      sizeUnits: "pixels",
      pointSize: 1,
      getRadius: 0.1,
      parameters: {
        depthTest: false,
      },
    });

    let dims = 30;

    let ret = [surface, surface2, scatter];
    for (let i = 0; i < dims * dims; i += 17) {
      // for (let i = 0; i < 100; i += 2) {
      ret = [
        ...ret,
        new IconLayer({
          id: `node3d-layer-icon-${i}`,
          data: [
            {
              ...this.mappingData[i],
              val: this.meanPerNode[i].value,
              index: i,
            },
          ],
          getIcon: (d) => ({
            url: `http://localhost:5002/node_images/California/OctMay/${d.index}.png`,
            width: 423,
            height: 389,
            // anchorY: 389,
          }),
          // getSize: 1,
          sizeUnits: "meters",
          getSize: 2,
          // sizeUnits: "pixels",
          // billboard: true,
          parameters: { depthTest: false },
          getPosition: (d) => [
            d.coords[0],
            -d.coords[1],
            d.val * this.multiplier + 10 + 0.3,
          ],
          // visible: false,
        }),
      ];
      // new BitmapLayer({
      //   id: `image-layer-${i}`,
      //   coordinateSystn: [0, 0, 0],
      //   image: `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${i}.png`,
      //   // image: image_data.body,
      //   // image: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-districts.png",
      //   pickable: true,
      //   bounds: [
      //     // 0, 0,
      //     this.mappingData[i].coords[0] - 0.4,
      //     -this.mappingData[i].coords[1] + 0.5,
      //     this.mappingData[i].coords[0] + 0.4,
      //     -this.mappingData[i].coords[1] - 0.5,
      //     // ]
      //     // [
      //     //   this.mappingData[i].coords[0] - 0.4,
      //     //   -this.mappingData[i].coords[1] - 0.5,
      //     //   random,
      //     // ],
      //     // [
      //     //   this.mappingData[i].coords[0] + 0.4,
      //     //   -this.mappingData[i].coords[1] + 0.5,
      //     //   random,
      //     // ],
      //     // [
      //     //   this.mappingData[i].coords[0] - 0.4,
      //     //   this.mappingData[i].coords[1] + 0.5,
      //     //   random,
      //     // ],
      //     // [
      //     //   this.mappingData[i].coords[0] + 0.4,
      //     //   -this.mappingData[i].coords[1] - 0.5,
      //     //   random,
      //     // ],
      //     // this.mappingData[i].coords[0] - 0.4,
      //     // -this.mappingData[i].coords[1] - 0.2,
      //     // this.mappingData[i].coords[0] + 0.4,
      //     // -this.mappingData[i].coords[1] + 0.2,
      //   ],
      //   index: i,
      //   loadOptions: {
      //     imagebitmap: {
      //       // Flip the image vertically
      //       // imageOrientation: "flipY",
      //     },
      //   },
      //   // pickable: true,
      //   onClick: (info, event) => {
      //     this.imgSrc.value = `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${info.layer.props.index}.png`;
      //     this.indexClicked = info.layer.props.index;
      //     console.log("Clicked:", info);
      //   },
      // }),
      // ];
    }

    // if (this.monthHovered.value) {
    //   let month = this.monthHovered.value;

    //   let hotspotPolygons3D = [];

    //   this.hotspotPolygons[month][0].forEach((polygon, index) => {
    //     // console.log("DEBUG HOTSPOT POLYGONS", polygon, index);
    //     let xDiff = this.interpolatedSurface.x.map((d) =>
    //       Math.abs(d - polygon[0])
    //     );
    //     let yDiff = this.interpolatedSurface.y.map((d) =>
    //       Math.abs(d - polygon[1])
    //     );
    //     let xIndex = xDiff.indexOf(Math.min(...xDiff));
    //     let yIndex = yDiff.indexOf(Math.min(...yDiff));
    //     // let xIndex = this.interpolatedSurface.x.indexOf(
    //     //   Math.min(
    //     //     ...this.interpolatedSurface.x.map((d) => Math.abs(d - polygon[0]))
    //     //   )
    //     // );
    //     // let yIndex = this.interpolatedSurface.y.indexOf(
    //     //   Math.min(
    //     //     this.interpolatedSurface.y.map((d) => Math.abs(d - polygon[1]))
    //     //   )
    //     // );
    //     // debugger;
    //     hotspotPolygons3D.push([
    //       this.interpolatedSurface.x[xIndex],
    //       this.interpolatedSurface.y[yIndex],
    //       this.interpolatedSurface.interpolatedSurface[yIndex][xIndex] * 20000 +
    //         10 +
    //         0.3,
    //     ]);
    //   });
    //   console.log("DEBUG HOTSPOT POLYGONS 3D", hotspotPolygons3D);

    //   this.hotspotPolygons[month].forEach((polygon, index) => {
    //     ret.push(
    //       new PolygonLayer({
    //         id: `hotspot-polygon-${month}-${index}`d.month,
    //         data: [hotspotPolygons3D],
    //         // data: [this.hotspotPolygons[month]],
    //         getPolygon: (vertices) => {
    //           let ret = vertices.map((p) => [p[0], -p[1], p[2]]);
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

    //         visible: false,
    //         onClick: (info, event) => {
    //           console.log("Clicked:", month);
    //         },
    //       })
    //     );
    //   });
    // }
    // console.log("DEBUG: Node3DLayerlist", ret);
    this.needsToRedraw = false;
    this.layerList = ret;
    return ret;
  }
}
