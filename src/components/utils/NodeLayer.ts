import { BitmapLayer, PathLayer } from "@deck.gl/layers";
import { watch, ComputedRef } from "vue";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { useStore } from "@/store/main";

import { timeType } from "./utils";

import distance from "@turf/distance";
import bearing from "@turf/bearing";
import { booleanEqual } from "@turf/turf";

export class NodeLayer extends AbstractLayerGenerator {
  readonly dataset_type;
  readonly time_type;
  readonly nodeMapGetter: ComputedRef<(timeType: timeType) => any>;
  readonly nodeMapUpdater: ComputedRef<(timeType: timeType) => any>;
  readonly imgSrc;
  readonly drawEveryN: number;
  readonly dims: number;
  readonly deck: any;
  isEditingMap;

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
    isEditingMap,
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
    this.isEditingMap = isEditingMap;
    this.anchors = anchors;

    this.store = useStore();

    watch(imgSrc, () => {
      this.needsToRedraw = true;
    });
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
            this.map[i].coords[0] - 1.5,
            -this.map[i].coords[1] + 1.5,
            this.map[i].coords[0] + 1.5,
            -this.map[i].coords[1] - 1.5,

            // this.mappingData[i].coords[0] - 1.5,
            // -this.mappingData[i].coords[1] + 1.5,
            // this.mappingData[i].coords[0] + 1.5,
            // -this.mappingData[i].coords[1] - 1.5,
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
            this.isEditingMap.value = true;
          },
          onDrag: (info, event) => {
            let lngLat = info.coordinate;
            const d = distance([0, 0], lngLat, {
              units: "meters",
            });
            const a = bearing([0, 0], lngLat);
            const x = d * Math.sin((a * Math.PI) / 180);
            const y = -d * Math.cos((a * Math.PI) / 180);
            console.log(this.map[info.layer.props.index].coords[0]);
            this.map[info.layer.props.index].coords = [x, y];
            this.deck.setProps({ controller: { dragPan: true } });
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
            this.isEditingMap.value = false;
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
              [this.map[i].coords[0] - 1.5, -this.map[i].coords[1] - 1.5],
              [this.map[i].coords[0] - 1.5, -this.map[i].coords[1] + 1.5],
              [this.map[i].coords[0] + 1.5, -this.map[i].coords[1] + 1.5],
              [this.map[i].coords[0] + 1.5, -this.map[i].coords[1] - 1.5],
              [this.map[i].coords[0] - 1.5, -this.map[i].coords[1] - 1.5],
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
