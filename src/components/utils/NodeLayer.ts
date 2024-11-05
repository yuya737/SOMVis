import { BitmapLayer, PathLayer } from "@deck.gl/layers";
import { watch, ComputedRef } from "vue";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { useStore } from "@/store/main";

import { timeType } from "./utils";

import distance from "@turf/distance";
import bearing from "@turf/bearing";
import { booleanEqual } from "@turf/turf";

export class NodeLayer extends AbstractLayerGenerator {
  readonly nodeMapGetter: ComputedRef<(timeType: timeType) => any>;

  readonly dataset_type;
  readonly time_type: timeType;
  readonly imgSrc;
  readonly drawEveryN: number;
  readonly dims: number;
  readonly deck: any;

  indexClicked: number = -1;
  layerList: any = null;

  anchors: any;

  map: any;
  store: any;

  constructor({
    dataset_type,
    time_type,
    nodeMapGetter,
    imgSrc,
    drawEveryN,
    dims = 30,
    deck,
    anchors,
  }) {
    super();
    this.dataset_type = dataset_type;
    this.time_type = time_type;
    this.nodeMapGetter = nodeMapGetter;
    this.imgSrc = imgSrc;
    this.drawEveryN = drawEveryN;
    this.dims = dims;
    this.deck = deck;
    this.anchors = anchors;

    this.store = useStore();

    watch(imgSrc, () => {
      this.needsToRedraw = true;
    });
    // watch(
    //   () => this.nodeMapGetter.value(this.time_type),
    //   () => (this.needsToRedraw = true),
    //   { deep: true }
    // );
    watch(
      () => this.nodeMapGetter.value(this.time_type),
      () => (this.needsToRedraw = true),
      { deep: true }
    );
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    let ret = [];

    this.map = this.nodeMapGetter.value(this.time_type);

    for (let i = 0; i < this.dims * this.dims; i += this.drawEveryN) {
      ret = [
        ...ret,
        new BitmapLayer({
          id: `image-layer-${i}`,
          image: `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${i}.png`,
          pickable: true,
          bounds: [
            this.map[i].coords[0] - 2,
            -this.map[i].coords[1] + 2,
            this.map[i].coords[0] + 2,
            -this.map[i].coords[1] - 2,

            // this.mappingData[i].coords[0] - 2,
            // -this.mappingData[i].coords[1] + 2,
            // this.mappingData[i].coords[0] + 2,
            // -this.mappingData[i].coords[1] - 2,
          ],
          index: i,
          loadOptions: {
            imagebitmap: {
              // Flip the image vertically
              imageOrientation: "flipY",
            },
          },
          // pickable: true,
          onClick: (info, event) => {
            this.imgSrc.value = `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${info.layer.props.index}.png`;
            this.indexClicked = info.layer.props.index;
            console.log("Clicked:", info);
          },
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
            const y = -d * Math.cos((a * Math.PI) / 180);
            this.map[info.layer.props.index].coords = [x, y];
          },
          onDragEnd: (info, event) => {
            let lngLat = info.coordinate;
            const d = distance([0, 0], lngLat, {
              units: "meters",
            });
            const a = bearing([0, 0], lngLat);
            const x = d * Math.sin((a * Math.PI) / 180);
            const y = -d * Math.cos((a * Math.PI) / 180);
            this.store.updateMapping(this.time_type, info.layer.props.index, [
              x,
              y,
            ]);
            this.anchors.value["ids"].push(info.layer.props.index);
            this.anchors.value["coords"].push([x, y]);
            console.log("DEBUG DRAG END", lngLat, d, x, y);
            this.deck.setProps({ controller: { dragPan: true } });
          },
          // updateTriggers: {
          //   bounds: this.map,
          // },
          // transitions: {
          //   bounds: 1000,
          // },
        }),
      ];
    }

    const numAnchors = this.anchors.value["ids"].length;
    for (let i = 0; i < numAnchors; i++) {
      const id = this.anchors.value["ids"][i];
      ret = [
        ...ret,
        new PathLayer({
          id: "selected-node-border-layer",
          positionFormat: "XY",
          getPath: (d) => d,
          getWidth: 0.1,
          getColor: [255, 0, 0],
          data: [
            [
              [this.map[id].coords[0] - 2, -this.map[id].coords[1] - 2],
              [this.map[id].coords[0] - 2, -this.map[id].coords[1] + 2],
              [this.map[id].coords[0] + 2, -this.map[id].coords[1] + 2],
              [this.map[id].coords[0] + 2, -this.map[id].coords[1] - 2],
              [this.map[id].coords[0] - 2, -this.map[id].coords[1] - 2],
            ],
          ],
        }),
      ];
    }

    if (this.imgSrc.value !== "") {
      console.log("DEBUG PATHLAYER", this.indexClicked);
      let i = this.indexClicked;
      ret = [
        ...ret,
        new PathLayer({
          id: "selected-node-border-layer",
          positionFormat: "XY",
          getPath: (d) => d,
          getWidth: 0.1,
          data: [
            [
              [this.map[i].coords[0] - 2, -this.map[i].coords[1] - 2],
              [this.map[i].coords[0] - 2, -this.map[i].coords[1] + 2],
              [this.map[i].coords[0] + 2, -this.map[i].coords[1] + 2],
              [this.map[i].coords[0] + 2, -this.map[i].coords[1] - 2],
              [this.map[i].coords[0] - 2, -this.map[i].coords[1] - 2],
            ],
          ],
        }),
      ];
    }

    this.layerList = ret;
    this.needsToRedraw = false;
    return ret;
  }
}
