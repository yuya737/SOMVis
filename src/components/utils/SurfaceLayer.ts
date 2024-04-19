import { scaleLinear } from "d3";
import type { LayersList } from "deck.gl/typed";

import PlotLayer, {
  Axes,
  PlotLayerPickingInfo,
} from "@/components/layers/plot-layer";

import { AbstractLayerGenerator } from "./AbstractLayerGenerator";

import { generateMonthRangeList } from "./utils";

export class SurfaceLayer extends AbstractLayerGenerator {
  // readonly coords: any;
  readonly data: any;
  // readonly name: string;
  readonly selectedTimeRange: any;
  readonly selectedMonthRange: any;
  readonly selectedModel: any;

  selectedMonthRangeList: any = [];

  constructor(mappingData, data, timeRange, monthRange, model) {
    super();
    this.mappingData = mappingData;
    // this contains list of dicts with a coord key, i want to find the extents

    this.data = data;
    debugger;
    this.selectedTimeRange = timeRange;
    this.selectedMonthRange = monthRange;
    this.selectedModel = model;
    this.selectedMonthRangeList = generateMonthRangeList(
      this.selectedMonthRange.value[0],
      this.selectedMonthRange.value[1]
    );
  }

  getLayers(): LayersList {
    const equation = (x, y) => (Math.sin(x * x + y * y) * x) / Math.PI;
    const MAX_SIZE = 24;
    const resolution = 500;

    let plot = new PlotLayer({
      getPosition: (u, v) => {
        const x = (u - 1 / 2) * Math.PI * 2;
        const y = (v - 1 / 2) * Math.PI * 2;
        return [x, equation(x, y) + 1, y];
      },
      getColor: (x, z, y) => [40, (z - 1) * 128 + 128, 160],
      uCount: resolution,
      vCount: resolution,
      drawAxes: false,
      axesPadding: 0.25,
      axesColor: [0, 0, 0, 128],
      pickable: true,
      // updateTriggers: {
      //   getPosition: equation,
      // },
    });
    this.layerList = [plot];
    return this.layerList;
  }
}
