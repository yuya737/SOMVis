import { BitmapLayer, PathLayer } from "@deck.gl/layers";
import { watch, ComputedRef } from "vue";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";

import { timeType } from "./utils";

import distance from "@turf/distance";
import bearing from "@turf/bearing";

export class NodeLayer extends AbstractLayerGenerator {
  readonly nodeMapGetter: ComputedRef<() => any>;
  readonly highlightedNodeGetter: ComputedRef<Array<number>>;

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

  constructor({
    dataset_type,
    time_type,
    nodeMapGetter,
    highlightedNodeGetter,
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
    this.highlightedNodeGetter = highlightedNodeGetter;
    this.imgSrc = imgSrc;
    this.drawEveryN = drawEveryN;
    this.dims = dims;
    this.deck = deck;
    this.anchors = anchors;

    watch(imgSrc, () => {
      this.needsToRedraw = true;
    });
    // watch(
    //   () => this.nodeMapGetter.value(this.time_type),
    //   () => (this.needsToRedraw = true),
    //   { deep: true }
    // );
    watch(this.highlightedNodeGetter, () => (this.needsToRedraw = true));
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

    const size = 4;

    for (let i = 0; i < this.dims * this.dims; i += this.drawEveryN) {
      ret = [
        ...ret,
        new BitmapLayer({
          id: `image-layer-${i}`,
          image: `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${i}.png`,
          pickable: true,
          bounds: [
            this.map[i].coords[0] - size,
            this.map[i].coords[1] + size,
            this.map[i].coords[0] + size,
            this.map[i].coords[1] - size,

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
          onClick: (info) => {
            this.imgSrc.value = `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${info.layer.props.index}.png`;
            this.indexClicked = info.layer.props.index;
            console.log("Clicked:", info);
          },
          onDragStart: () => {
            this.deck.setProps({ controller: { dragPan: false } });
          },
          onDrag: (info) => {
            let lngLat = info.coordinate;
            const d = distance([0, 0], lngLat, {
              units: "meters",
            });
            const a = bearing([0, 0], lngLat);
            const x = d * Math.sin((a * Math.PI) / 180);
            const y = d * Math.cos((a * Math.PI) / 180);
            this.map[info.layer.props.index].coords = [x, y];
          },
          onDragEnd: (info) => {
            let lngLat = info.coordinate;
            const d = distance([0, 0], lngLat, {
              units: "meters",
            });
            const a = bearing([0, 0], lngLat);
            const x = d * Math.sin((a * Math.PI) / 180);
            const y = d * Math.cos((a * Math.PI) / 180);
            this.map[info.layer.props.index].coords = [x, y];
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
    const data = [];
    for (let i = 0; i < numAnchors; i++) {
      const id = this.anchors.value["ids"][i];
      data.push([
        [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Bottom-left corner
        [this.map[id].coords[0] + size, this.map[id].coords[1] - size], // Bottom-right corner
        [this.map[id].coords[0] + size, this.map[id].coords[1] + size], // Top-right corner
        [this.map[id].coords[0] - size, this.map[id].coords[1] + size], // Top-left corner
        [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Closing the rectangle
      ]);
    }
    ret = [
      ...ret,
      new PathLayer({
        id: `selected-anchor-border-layer`,
        positionFormat: "XY",
        getPath: (d) => d,
        getWidth: 0.1,
        getColor: [255, 0, 0],
        data: data,
      }),
    ];

    const highlightedNodes = this.highlightedNodeGetter.value;
    const highlightedNodeData = [];
    for (let i = 0; i < highlightedNodes.length; i++) {
      const id = highlightedNodes[i];
      if (id % this.drawEveryN == 0) {
        highlightedNodeData.push([
          [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Bottom-left corner
          [this.map[id].coords[0] + size, this.map[id].coords[1] - size], // Bottom-right corner
          [this.map[id].coords[0] + size, this.map[id].coords[1] + size], // Top-right corner
          [this.map[id].coords[0] - size, this.map[id].coords[1] + size], // Top-left corner
          [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Closing the rectangle
        ]);
      }
    }
    ret = [
      ...ret,
      new PathLayer({
        id: `highlighted-border-layer`,
        positionFormat: "XY",
        getPath: (d) => d,
        getWidth: 0.1,
        getColor: [0, 255, 0],
        data: highlightedNodeData,
      }),
    ];

    if (this.imgSrc.value !== "") {
      console.log("DEBUG PATHLAYER", this.indexClicked);
      let id = this.indexClicked;
      ret = [
        ...ret,
        new PathLayer({
          id: "selected-node-border-layer",
          positionFormat: "XY",
          getPath: (d) => d,
          getWidth: 0.1,
          data: [
            [
              [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Bottom-left corner
              [this.map[id].coords[0] + size, this.map[id].coords[1] - size], // Bottom-right corner
              [this.map[id].coords[0] + size, this.map[id].coords[1] + size], // Top-right corner
              [this.map[id].coords[0] - size, this.map[id].coords[1] + size], // Top-left corner
              [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Closing the rectangle
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
