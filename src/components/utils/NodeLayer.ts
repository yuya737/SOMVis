import { BitmapLayer, PathLayer } from "@deck.gl/layers";
import { watch, ComputedRef, Ref } from "vue";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";

import { timeType } from "./utils";
import anchorSVG from "@/assets/anchor.svg?raw";
import cancelSVG from "@/assets/cancel.svg?raw";

import distance from "@turf/distance";
import bearing from "@turf/bearing";
import { IconLayer } from "deck.gl/typed";
// const API_URL = "http://infovis.cs.ucdavis.edu/climatesom/api";
const API_URL = "http://0.0.0.0:5003";
export class NodeLayer extends AbstractLayerGenerator {
  readonly nodeMapGetter: ComputedRef<() => any>;
  readonly highlightedNodeGetter: ComputedRef<Array<number>>;

  readonly dataset_type;
  readonly time_type: timeType;
  readonly drawEveryN: number;
  readonly dims: number;
  readonly deck: any;

  indexClicked: number = -1;
  layerList: any = null;

  anchors: any;
  nodeClickedID: Ref<number>;
  currentStep: Ref<step>;

  map: any;

  constructor({
    dataset_type,
    time_type,
    nodeMapGetter,
    highlightedNodeGetter,
    drawEveryN,
    dims = 30,
    deck,
    anchors,
    nodeClickedID,
    currentStep,
  }) {
    super();
    this.dataset_type = dataset_type;
    this.time_type = time_type;
    this.nodeMapGetter = nodeMapGetter;
    this.highlightedNodeGetter = highlightedNodeGetter;
    this.drawEveryN = drawEveryN;
    this.dims = dims;
    this.deck = deck;
    this.anchors = anchors;
    this.nodeClickedID = nodeClickedID;
    this.currentStep = currentStep;

    // watch(
    //   () => this.nodeMapGetter.value(this.time_type),
    //   () => (this.needsToRedraw = true),
    //   { deep: true }
    // );
    watch(this.highlightedNodeGetter, () => (this.needsToRedraw = true));
    watch(
      this.nodeClickedID,
      () => {
        this.needsToRedraw = true;
        console.log("DEBUG: CLICKED NODE ID", this.nodeClickedID.value);
      },
      { deep: true }
    );

    watch(
      () => [
        this.nodeMapGetter.value(this.time_type),
        this.anchors.value,
        this.currentStep.value,
      ],
      () => {
        this.needsToRedraw = true;
      },
      { deep: true }
    );
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    let ret = [];

    this.map = this.nodeMapGetter.value(this.time_type);

    let WIDTH = 4;
    // const HEIGHT = 2.5;
    let HEIGHT = 5;

    if (this.dataset_type == "NorthWest") {
      WIDTH = 4.5;
      HEIGHT = 2.25;
    }

    for (let i = 0; i < this.dims; i += this.drawEveryN) {
      for (
        let j = Math.floor(this.drawEveryN / 2);
        j < this.dims;
        j += this.drawEveryN
      ) {
        let index = i * this.dims + j;
        ret = [
          ...ret,
          new BitmapLayer({
            id: `image-layer-${index}`,
            image: `${API_URL}/node_images/${this.dataset_type}/${this.time_type}/${index}/`,
            pickable: true,
            bounds: [
              this.map[index].coords[0] - WIDTH,
              this.map[index].coords[1] + HEIGHT,
              this.map[index].coords[0] + WIDTH,
              this.map[index].coords[1] - HEIGHT,

              // this.mappingData[i].coords[0] - 2,
              // -this.mappingData[i].coords[1] + 2,
              // this.mappingData[i].coords[0] + 2,
              // -this.mappingData[i].coords[1] - 2,
            ],
            index: index,
            loadOptions: {
              imagebitmap: {
                // Flip the image vertically
                imageOrientation: "flipY",
              },
            },
            // pickable: true,
            onClick: (info) => {
              if (info.layer.props.index == this.indexClicked) {
                this.indexClicked = -1;
                this.nodeClickedID.value = -1;
              } else {
                this.indexClicked = info.layer.props.index;
                this.nodeClickedID.value = info.layer.props.index;
              }
            },
            onDragStart: () => {
              if (this.currentStep.value != "Anchor")
                // Only active in the Anchor stage
                return;
              this.deck.setProps({ controller: { dragPan: false } });
            },
            onDrag: (info) => {
              if (this.currentStep.value != "Anchor")
                // Only active in the Anchor stage
                return;
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
              if (this.currentStep.value != "Anchor")
                // Only active in the Anchor stage
                return;
              let lngLat = info.coordinate;
              const d = distance([0, 0], lngLat, {
                units: "meters",
              });
              const a = bearing([0, 0], lngLat);
              const x = d * Math.sin((a * Math.PI) / 180);
              const y = d * Math.cos((a * Math.PI) / 180);
              this.map[info.layer.props.index].coords = [x, y];
              if (!this.anchors.value["ids"].includes(info.layer.props.index)) {
                this.anchors.value["ids"].push(info.layer.props.index);
                this.anchors.value["coords"].push([x, y]);
              } else {
                const index = this.anchors.value["ids"].indexOf(
                  info.layer.props.index
                );
                this.anchors.value["coords"][index] = [x, y];
              }
              console.log("DEBUG DRAG END", lngLat, d, x, y);
              this.deck.setProps({ controller: { dragPan: true } });
            },
          }),
        ];
      }
    }

    // const highlightedNodes = this.highlightedNodeGetter.value;
    // const highlightedNodeData = [];
    // for (let i = 0; i < highlightedNodes.length; i++) {
    //   const id = highlightedNodes[i];
    //   if (id % this.drawEveryN == 0) {
    //     highlightedNodeData.push([
    //       [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Bottom-left corner
    //       [this.map[id].coords[0] + size, this.map[id].coords[1] - size], // Bottom-right corner
    //       [this.map[id].coords[0] + size, this.map[id].coords[1] + size], // Top-right corner
    //       [this.map[id].coords[0] - size, this.map[id].coords[1] + size], // Top-left corner
    //       [this.map[id].coords[0] - size, this.map[id].coords[1] - size], // Closing the rectangle
    //     ]);
    //   }
    // }
    // ret = [
    //   ...ret,
    //   new PathLayer({
    //     id: `highlighted-border-layer`,
    //     positionFormat: "XY",
    //     getPath: (d) => d,
    //     getWidth: 0.1,
    //     getColor: [0, 255, 0],
    //     data: highlightedNodeData,
    //   }),
    // ];

    console.log("DEBUG PATHLAYER", this.indexClicked);
    if (this.indexClicked != -1) {
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
              [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] - HEIGHT], // Bottom-left corner
              [this.map[id].coords[0] + WIDTH, this.map[id].coords[1] - HEIGHT], // Bottom-right corner
              [this.map[id].coords[0] + WIDTH, this.map[id].coords[1] + HEIGHT], // Top-right corner
              [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] + HEIGHT], // Top-left corner
              [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] - HEIGHT], // Closing the rectangle
            ],
          ],
        }),
        new IconLayer({
          id: "selected-node-icon-layer",
          data: [
            [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] + HEIGHT],
          ],
          getPosition: (d) => d,
          iconAtlas: new URL("/magnifying-glass.svg", import.meta.url).href,
          getIcon: (d) => "marker",
          getSize: 40,
          iconMapping: {
            marker: {
              x: 0,
              y: 0,
              width: 800,
              height: 800,
              // mask: true,
            },
          },
        }),
      ];
    }

    const numAnchors = this.anchors.value["ids"].length;
    const data = [];
    for (let i = 0; i < numAnchors; i++) {
      const id = this.anchors.value["ids"][i];
      data.push({
        position: [
          [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] - HEIGHT], // Bottom-left corner
          [this.map[id].coords[0] + WIDTH, this.map[id].coords[1] - HEIGHT], // Bottom-right corner
          [this.map[id].coords[0] + WIDTH, this.map[id].coords[1] + HEIGHT], // Top-right corner
          [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] + HEIGHT], // Top-left corner
          [this.map[id].coords[0] - WIDTH, this.map[id].coords[1] - HEIGHT], // Closing the rectangle
        ],
        id: id,
      });
    }
    function svgToDataURL(svg) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    ret = [
      ...ret,
      new PathLayer({
        id: `selected-anchor-border-layer`,
        positionFormat: "XY",
        getPath: (d) => d.position,
        getWidth: 0.1,
        getColor: [255, 0, 0],
        data: data,
        visible: this.currentStep.value == "Anchor",
      }),
      new IconLayer({
        id: "selected-anchor-icon-layer",
        data: data,
        getPosition: (d) => d.position[2],
        // iconAtlas: new URL("/anchor.jpg", import.meta.url).href,
        iconAtlas: svgToDataURL(anchorSVG),
        // iconAtlas: anchorSVG,
        // iconAtlas: temp,
        // iconAtlas: new URL("")
        getIcon: (d) => "marker",
        getSize: 40,
        sizeScale: 1,
        loadOptions: {
          imagebitmap: {
            resizeWidth: 256,
            resizeHeight: 256,
            resizeQuality: "high",
          },
        },
        iconMapping: {
          marker: {
            x: 0,
            y: 0,
            width: 256,
            height: 256,
            // mask: true,
          },
        },
        visible: this.currentStep.value == "Anchor",
      }),
      new IconLayer({
        id: "selected-anchor-cancel-icon-layer",
        data: data,
        getPosition: (d) => d.position[1],
        iconAtlas: svgToDataURL(cancelSVG),
        getIcon: (d) => "marker",
        getSize: 20,
        loadOptions: {
          imagebitmap: {
            resizeWidth: 256,
            resizeHeight: 256,
            resizeQuality: "high",
          },
        },
        iconMapping: {
          marker: {
            x: 0,
            y: 0,
            width: 256,
            height: 256,
            // mask: true,
          },
        },
        pickable: true,
        onClick: (info) => {
          const index = this.anchors.value["ids"].indexOf(info.object.id);
          console.log("DEBUG ANCHOR CANCEL ICON LAYER", index);
          this.anchors.value["ids"].splice(index, 1);
          this.anchors.value["coords"].splice(index, 1);
        },
        visible: this.currentStep.value == "Anchor",
      }),
    ];

    this.layerList = ret;
    this.needsToRedraw = false;
    return ret;
  }
}
