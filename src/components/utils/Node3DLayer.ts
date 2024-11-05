import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { watch } from "vue";
import PlotLayer from "@/components/layers/plot-layer";
import { timeType } from "./utils";
import {
  ScatterplotLayer,
  PointCloudLayer,
  PolygonLayer,
  BitmapLayer,
  IconLayer,
} from "deck.gl/typed";
import * as d3 from "d3";

export class Node3DLayer extends AbstractLayerGenerator {
  readonly interpolatedSurfaceGetter: ComputedRef<(timeType: timeType) => any>;
  readonly mappingDataGetter: ComputedRef<(timeType: timeType) => any>;
  readonly meanPerNodeGetter: ComputedRef<(timeType: timeType) => any>;
  readonly monthHovered: any;
  readonly hotspotPolygonsGetter: ComputedRef<(timeType: timeType) => any>;
  readonly multiplier: number;
  readonly time_type: timeType;

  constructor({
    interpolatedSurfaceGetter,
    mappingDataGetter,
    meanPerNodeGetter,
    monthHovered,
    hotspotPolygonsGetter,
    time_type,
  }) {
    super();
    this.interpolatedSurfaceGetter = interpolatedSurfaceGetter;
    this.mappingDataGetter = mappingDataGetter;
    this.meanPerNodeGetter = meanPerNodeGetter;
    this.monthHovered = monthHovered;
    this.hotspotPolygonsGetter = hotspotPolygonsGetter;

    this.multiplier = 10;
    this.time_type = time_type;

    watch(monthHovered, (value) => {
      this.needsToRedraw = true;
    });

    watch(
      () => this.interpolatedSurfaceGetter.value(this.time_type),
      () => (this.needsToRedraw = true),
      { deep: true }
    );
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    const interpolatedSurface = this.interpolatedSurfaceGetter.value(
      this.time_type
    );
    const mappingData = this.mappingDataGetter.value(this.time_type);
    const meanPerNode = this.meanPerNodeGetter.value(this.time_type);
    console.log("DEBUG: INTERPOLATED SURFACE", interpolatedSurface);
    let surface = new PlotLayer({
      id: "node3d-surface-layer",
      getPosition: (u, v) => {
        return [
          interpolatedSurface.x[
            Math.round(u * (interpolatedSurface.resolution - 1))
          ],
          -interpolatedSurface.y[
            Math.round(v * (interpolatedSurface.resolution - 1))
          ],
          // 10,
          interpolatedSurface.interpolatedSurface[
            Math.round(v * (interpolatedSurface.resolution - 1))
          ][Math.round(u * (interpolatedSurface.resolution - 1))] *
            this.multiplier +
            10,
        ];
      },
      getShouldDiscard: (u, v) =>
        interpolatedSurface.interpolatedSurface[
          Math.round(v * (interpolatedSurface.resolution - 1))
        ][Math.round(u * (interpolatedSurface.resolution - 1))] == 0,

      getColor: (x, y, z) => {
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
      uCount: interpolatedSurface.resolution,
      vCount: interpolatedSurface.resolution,
      drawAxes: false,
      axesPadding: 0.25,
      axesColor: [0, 0, 0, 128],
      pickable: true,
      material: {
        ambient: 0.8,
        specularColor: [0.3, 0.1, 0.2],
      },
      updateTriggers: {
        getPosition: interpolatedSurface,
      },
    });
    let zeroSurface = new PlotLayer({
      id: "node3d-surface-layer2",
      getPosition: (u, v) => {
        return [
          interpolatedSurface.x[
            Math.round(u * (interpolatedSurface.resolution - 1))
          ],
          -interpolatedSurface.y[
            Math.round(v * (interpolatedSurface.resolution - 1))
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
      uCount: interpolatedSurface.resolution,
      vCount: interpolatedSurface.resolution,
      drawAxes: false,
      axesPadding: 0.25,
      axesColor: [0, 0, 0, 128],
      pickable: true,
    });

    // let scatter = new ScatterplotLayer({
    let scatter = new PointCloudLayer({
      id: "node3d-pointcloud-layer",
      data: mappingData.map((d, i) => {
        return { ...d, val: meanPerNode[i].value };
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

    let ret = [surface, zeroSurface, scatter];
    for (let i = 0; i < dims * dims; i += 17) {
      // for (let i = 0; i < 100; i += 2) {
      ret = [
        ...ret,
        new IconLayer({
          id: `node3d-layer-icon-${i}`,
          data: [
            {
              ...mappingData[i],
              val: meanPerNode[i].value,
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
    }

    this.needsToRedraw = false;
    this.layerList = ret;
    return ret;
  }
}
