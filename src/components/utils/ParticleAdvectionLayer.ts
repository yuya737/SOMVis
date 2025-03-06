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
    let layer = new SimpleMeshLayer({
      id: "vector-field",
      data: data,
      mesh: "https://raw.githubusercontent.com/yuya737/arrow_obj/main/arrowV2.obj",
      loaders: [OBJLoader],
      getPosition: (d) => [d[0], d[1]],
      getColor: (d) => [120, 120, 120, 130],
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
