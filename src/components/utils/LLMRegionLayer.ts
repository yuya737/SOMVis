import { LayersList, PolygonLayer, TextLayer } from "deck.gl/typed";
import { watch } from "vue";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { timeType } from "./utils";
import API from "@/API/api";

export class LLMRegionLayer extends AbstractLayerGenerator {
  readonly nodeMapGetter: ComputedRef<(timeType: timeType) => any>;
  readonly LLMQueryGetter: Ref<LLMQueryResult[]>;
  readonly indexToShow;
  readonly isShowingLLMRegion;
  readonly time_type: timeType;

  constructor({
    nodeMapGetter,
    indexToShow,
    LLMQueryGetter,
    isShowingLLMRegion,
    time_type,
  }) {
    super();
    this.nodeMapGetter = nodeMapGetter;
    this.indexToShow = indexToShow;
    this.LLMQueryGetter = LLMQueryGetter;
    this.isShowingLLMRegion = isShowingLLMRegion;
    this.time_type = time_type;
    this.layerList = [];

    watch(
      () => [
        this.nodeMapGetter.value(this.time_type),
        this.indexToShow.value,
        this.isShowingLLMRegion.value,
      ],
      () => {
        this.needsToRedraw = true;
      }
    );
  }

  getLayers(): LayersList {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }

    if (
      this.indexToShow.value > this.LLMQueryGetter.value.length - 1 ||
      this.indexToShow.value < 0
    ) {
      console.log("DEBUG: Error in LLMRegion Layer");
      return this.layerList;
    }

    let ret = [];
    const nodesToShow =
      this.LLMQueryGetter.value[this.indexToShow.value].result;

    const BMUPolygon = API.fetchData("/get_bounding_shape", true, {
      points: this.nodeMapGetter
        .value(this.time_type)
        .filter((d) => nodesToShow.includes(d.id))
        .map((d) => d.coords),
      threshold: 0.9,
    });
    ret = [
      ...ret,
      new PolygonLayer({
        id: `llm-region-polygon-layer`,
        data: BMUPolygon,
        getPolygon: (d) => d,
        getFillColor: [255, 255, 153, 80],
        stroked: false,
        visible: this.isShowingLLMRegion.value,
      }),
      new TextLayer({
        id: `llm-region-polygon-label-layer`,
        data: BMUPolygon,
        getPosition: (d) => [...d[0], 2],
        getText: () => `LLM-queried region`,
        getColor: () => [0, 0, 0, 255],
        background: true,
        backgroundPadding: [4, 4],
        getSize: 20,
        fontFamily: "Arial",
        visible: this.isShowingLLMRegion.value,
      }),
    ];
    this.layerList = ret;
    this.needsToRedraw = false;
    return ret;
  }
}
