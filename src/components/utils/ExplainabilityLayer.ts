import { Deck, IconLayer, TextLayer, LayersList } from "deck.gl/typed";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { watch, Ref } from "vue";
import API from "@/api/api";
import { timeType } from "./utils";
import distance from "@turf/distance";
import bearing from "@turf/bearing";
import { point } from "@turf/turf";
import { useStore } from "@/store/main";

function addNewlinesEvery8Words(text: string): string {
  const words = text.split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += 8) {
    chunks.push(words.slice(i, i + 8).join(" "));
  }
  return chunks.join("\n");
}

export class ExplainabilityLayer extends AbstractLayerGenerator {
  readonly explainablityPointsGetter: Ref<[Coords, Coords]>;
  readonly deck: Deck;
  NLDescriptions: [];
  NLComparison: null;
  store: any;

  constructor({ explainablityPointsGetter, deck }) {
    super();
    this.explainablityPointsGetter = explainablityPointsGetter;
    this.deck = deck;
    this.NLDescriptions = [null, null];
    this.NLComparison = null;
    this.store = useStore();
    watch(this.explainablityPointsGetter, () => (this.needsToRedraw = true), {
      deep: true,
    });
    watch(this.NLDescriptions, () => (this.needsToRedraw = true));
  }
  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    const points = this.explainablityPointsGetter.value;
    if (!points[0] || !points[1]) {
      this.layerList = [];
      this.needsToRedraw = false;
      return this.layerList;
    }
    const data = [
      ["source", ...points[0]],
      ["dest", ...points[1]],
    ];
    const layer = new IconLayer({
      id: "explainability-layer",
      data,
      getColor: (d) => (d[0] === "dest" ? [0, 0, 255] : [255, 0, 0]),
      getIcon: (d) => "marker",
      getPosition: (d) => [d[1], d[2]],
      getSize: 50,
      iconAtlas:
        "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
      iconMapping:
        "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.json",
      pickable: true,
      onDragStart: (info, event) => {
        this.deck.setProps({ controller: { dragPan: false } });
      },
      onDrag: (info, event) => {
        let lngLat = info.coordinate;
        const d = distance([0, 0], lngLat, {
          units: "meters",
        });
        const a = bearing([0, 0], lngLat);
        const x = d * Math.sin((a * Math.PI) / 180);
        const y = d * Math.cos((a * Math.PI) / 180);
        if (info.object[0] === "source") {
          this.explainablityPointsGetter.value[0] = [x, y];
        }
        if (info.object[0] === "dest") {
          this.explainablityPointsGetter.value[1] = [x, y];
        }
      },
      onDragEnd: (info, event) => {
        let lngLat = info.coordinate;
        const d = distance([0, 0], lngLat, {
          units: "meters",
        });
        const a = bearing([0, 0], lngLat);
        const x = d * Math.sin((a * Math.PI) / 180);
        const y = d * Math.cos((a * Math.PI) / 180);
        // this.store.updateMapping(this.time_type, info.layer.props.index, [
        //   x,
        //   y,
        // ]);
        // this.anchors.value["ids"].push(info.layer.props.index);
        // this.anchors.value["coords"].push([x, y]);
        console.log("DEBUG DRAG END", lngLat, d, x, y);
        API.fetchData("/get_natlang_description", true, {
          point: [x / 3, y / 3],
        }).then((response) => {
          if (info.object[0] === "source") {
            this.NLDescriptions[0] = {
              coords: [x, y],
              description: response["description"][0],
            };
          }
          if (info.object[0] === "dest") {
            this.NLDescriptions[1] = {
              coords: [x, y],
              description: response["description"][0],
            };
          }
          this.needsToRedraw = true;
          if (this.NLDescriptions[0] && this.NLDescriptions[1]) {
            API.fetchData("/get_natlang_comparison", true, {
              description1: this.NLDescriptions[0].description,
              description2: this.NLDescriptions[1].description,
            }).then(({ comparison }) => {
              this.NLComparison = addNewlinesEvery8Words(
                "Comparison (From Red to Blue): " + comparison
              );
              this.needsToRedraw = true;
              this.store.redrawFlag = !this.store.redrawFlag;
            });
          }
          this.store.redrawFlag = !this.store.redrawFlag;
        });

        this.deck.setProps({ controller: { dragPan: true } });
      },
    });
    console.log(
      "DEBUG IN EXPLAINABILITY LAYER DRAW",
      this.NLDescriptions.filter((d) => d != null)
    );
    const comparisonLayer = new TextLayer({
      id: "explainability-comparison-text-layer",
      data: [this.NLComparison],
      // data: [1],
      // getPosition: [0, 0],
      // getText: (d) => "SDFSDFSDF",
      getSize: 24,
      getPosition: (d) => [40, 40, 3],
      getText: (d) => d,
      background: true,
    });
    // const textLayer = new TextLayer({
    //   id: "explainability-text-layer",
    //   data: this.NLDescriptions.filter((d) => d !== null),
    //   // data: [1],
    //   // getPosition: [0, 0],
    //   // getText: (d) => "SDFSDFSDF",
    //   getSize: 16,
    //   getPosition: (d) => [...d.coords, 3],
    //   getText: (d) => d.description,
    // });
    // this.needsToRedraw = false;
    this.layerList = [comparisonLayer, layer];
    return this.layerList;
  }
}
