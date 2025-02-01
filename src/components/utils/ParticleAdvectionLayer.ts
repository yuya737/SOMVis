import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { TextLayer } from "deck.gl/typed";
import { OBJLoader } from "@loaders.gl/obj";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import GL from "@luma.gl/constants";
import ParticleLayer from "../layers/ParticleAdvection/particle-layer";

import * as d3 from "d3";
import { ComputedRef, watch } from "vue";
import { timeType } from "./utils";
import { LayersList, picking } from "deck.gl/typed";
import { get } from "@vueuse/core";

export class ParticleAdvectionLayer extends AbstractLayerGenerator {
  readonly vectorFieldGetter: ComputedRef<(timeType: timeType) => any>;

  vectorField: any;
  time_type: timeType;
  currentStep: Ref<step>;

  constructor({ vectorFieldGetter, time_type, currentStep }) {
    super();
    this.vectorFieldGetter = vectorFieldGetter;
    this.time_type = time_type;
    this.currentStep = currentStep;

    watch(
      () => [
        this.vectorFieldGetter.value(this.time_type),
        this.currentStep.value,
      ],
      () => (this.needsToRedraw = true),
      { deep: true }
    );
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    this.vectorField = this.vectorFieldGetter.value(this.time_type);
    if (!this.vectorField) {
      this.layerList = [];
      this.needsToRedraw = false;
      return this.layerList;
    }
    let data = [];
    for (let i = 0; i < this.vectorField.x.length; i++) {
      for (let j = 0; j < this.vectorField.y.length; j++) {
        let angle =
          (Math.atan2(this.vectorField.v[j][i], this.vectorField.u[j][i]) *
            180) /
          Math.PI;
        let length = Math.sqrt(
          this.vectorField.u[j][i] ** 2 + this.vectorField.v[j][i] ** 2
        );
        data.push([
          this.vectorField.x[i] * 10,
          this.vectorField.y[j] * 10,
          angle,
          this.vectorField.u[i][j],
          this.vectorField.v[i][j],
          length,
        ]);
      }
    }
    // let data = Array.from(
    //   { length: this.vectorField.u.flat().length },
    //   (_, i) => {
    //     let col = i % this.vectorField.x.length;
    //     let row = Math.floor(i / this.vectorField.x.length);
    //     let angle =
    //       (Math.atan2(
    //         this.vectorField.v[row][col],
    //         this.vectorField.u[row][col]
    //       ) *
    //         180) /
    //       Math.PI;
    //     let length = Math.sqrt(
    //       this.vectorField.u[row][col] ** 2 + this.vectorField.v[row][col] ** 2
    //     );
    //     // angle = angle + 180;
    //     // angle = angle < 0 ? angle + 3 : angle;
    //     return [
    //       this.vectorField.x[row] * 3,
    //       this.vectorField.y[col] * 3,
    //       angle,
    //       this.vectorField.u[row][col],
    //       this.vectorField.v[row][col],
    //       length,
    //     ];
    //   }
    // );
    console.log("DEBUG IN PARTICLE ADVECTION LAYER", data);
    // data = data.filter((d) => d[2] != 0);
    // let layer2 = new TextLayer({
    //   id: "Wind_Arrows2",
    //   data: data,
    //   visible: false,
    //   getSize: 18,
    //   getPosition: (d) => [d[0], d[1]],
    //   // getText: (d) => d[2].toFixed(2),
    //   getText: (d) => [d[3].toFixed(2), d[4].toFixed(2)].join(", "),
    //   // getOrientation: (d) => [0, -180 - d[2], 0],
    //   // // getOrientation: (d) => [0, 0, 0],
    //   // pickable: true,
    //   // onHover: (d) => console.log(d)
    // });
    let layer = new SimpleMeshLayer({
      id: "vector-field",
      data: data,
      mesh: "https://raw.githubusercontent.com/yuya737/arrow_obj/main/Arrow5.obj",
      loaders: [OBJLoader],
      getPosition: (d) => [d[0], d[1]],
      getColor: (d) => [
        120, 120, 120, 130,
        // d3.scaleLinear().domain([0, 360]).range([0, 255])(d[2]),
        // 0,
        // 0,
        // 105,
      ],
      // getOrientation: (d) => [0, -180 + d[2], 0],
      getScale: (d) => [d[5] / 3, d[5] / 3, d[5] / 3],
      getOrientation: (d) => [0, d[2], 0],
      // getScale: [0.3, 0.3, 0.3],
      pickable: true,
      onHover: (d) => console.log(d),
      parameters: { cull: true },
      visible: this.currentStep.value == "Analyze",
    });

    this.needsToRedraw = false;
    this.layerList = [layer];
    // this.layerList = [particleLayer];
    return this.layerList;
  }
}
