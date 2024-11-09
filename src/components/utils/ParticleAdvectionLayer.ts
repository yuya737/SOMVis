import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import GL from "@luma.gl/constants";
import ParticleLayer from "../layers/ParticleAdvection/particle-layer";

import * as d3 from "d3";
import { ComputedRef, watch } from "vue";
import { timeType } from "./utils";
import { LayersList } from "deck.gl/typed";

export class ParticleAdvectionLayer extends AbstractLayerGenerator {
  readonly vectorFieldGetter: ComputedRef<(timeType: timeType) => any>;

  vectorField: any;
  time_type: timeType;

  constructor({ vectorFieldGetter, time_type }) {
    super();
    this.vectorFieldGetter = vectorFieldGetter;
    this.time_type = time_type;

    watch(
      () => this.vectorFieldGetter.value(this.time_type),
      () => (this.needsToRedraw = true),
      { deep: true }
    );
  }

  getLayers(): LayersList {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    this.vectorField = this.vectorFieldGetter.value(this.time_type);
    if (!this.vectorField) {
      this.layerList = [];
      this.needsToRedraw = false;
      return this.layerList;
    }
    console.log("DEBUG IN PARTICLE ADVECTION LAYER", this.vectorField);
    // if (windData.weather_variables.length == 0) {
    //   return undefined;
    // }
    let textureData = {
      width: this.vectorField.x.length,
      height: this.vectorField.y.length,
      data: [],
      type: GL.UNSIGNED_BYTE,
      format: GL.RGBA,
      dataFormat: GL.RGBA,
      parameters: {
        [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
        [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
      },
      pixelStore: {
        [GL.UNPACK_FLIP_Y_WEBGL]: false,
      },
    };
    // console.log("windData", windData.grids.wind_direction);
    // console.log("extent", d3.extent(windData.grids.wind_speed));

    // const windScale = d3
    //   .scaleLinear()
    //   .domain(d3.extent(windData.grids.wind_speed))
    //   .range([0.3, 1]);

    let minMax = d3.extent([
      ...this.vectorField.u.flat(),
      ...this.vectorField.v.flat(),
    ]);
    console.log("minMax", minMax);

    const vectorScale = d3.scaleLinear().domain(minMax).range([0, 255]);

    for (let i = 0; i < this.vectorField.x.length; i++) {
      for (let j = 0; j < this.vectorField.y.length; j++) {
        let valid =
          this.vectorField.u[i][j] != 0 && this.vectorField.v[i][j] != 0;
        textureData.data.push(vectorScale(this.vectorField.u[i][j]));
        textureData.data.push(vectorScale(this.vectorField.v[i][j]));
        textureData.data.push(0);
        textureData.data.push(valid ? 255 : 0);
      }
    }

    textureData.data = new Uint8Array([...textureData.data]);
    // const bounds = [newXmin, newYMin, newXmax, newYMax];
    const bounds = [
      this.vectorField.x[0] * 3,
      this.vectorField.y[0] * 3,
      this.vectorField.x[this.vectorField.x.length - 1] * 3,
      this.vectorField.y[this.vectorField.y.length - 1] * 3,
    ];
    console.log("bounds", bounds);
    console.log("textureData", textureData);

    let particleLayer = new ParticleLayer({
      id: "wind_particle",
      //image: wind_image,
      image: textureData,
      //image: wind_image2,

      //imageUnscale: [-128, 127],
      //   imageUnscale: [-20, 20],
      imageUnscale: minMax,
      //bounds: [-180, -90, 180, 90],
      bounds: bounds,
      numParticles: 500,
      maxAge: 90,
      speedFactor: 5000000,
      color: [0, 0, 0],
      width: 2,
      opacity: 0.1,
      updateTriggers: {
        image: this.vectorFieldGetter.value(this.time_type),
      },
    });
    particleLayer.setNeedsRedraw();
    this.needsToRedraw = false;
    this.layerList = [particleLayer];
    return this.layerList;
  }
}
