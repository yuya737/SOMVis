import { BitmapLayer, PathLayer } from "@deck.gl/layers";
import { watch } from "vue";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";

export class NodeLayer extends AbstractLayerGenerator {
  readonly dataset_type;
  readonly time_type;
  readonly mappingData;
  readonly imgSrc;
  readonly drawEveryN: number;
  readonly dims: number;

  indexClicked: number = -1;
  layerList: any = null;

  constructor(
    dataset_type,
    time_type,
    mappingData,
    imgSrc,
    drawEveryN,
    dims = 30
  ) {
    super();
    this.dataset_type = dataset_type;
    this.time_type = time_type;
    this.mappingData = mappingData;
    this.imgSrc = imgSrc;
    this.drawEveryN = drawEveryN;
    this.dims = dims;

    watch(imgSrc, () => {
      this.needsToRedraw = true;
    });
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    let ret = [];

    for (let i = 0; i < this.dims * this.dims; i += this.drawEveryN) {
      // for (let i = 0; i < 100; i += 2) {
      let random = Math.random() * 10;
      ret = [
        ...ret,
        new BitmapLayer({
          id: `image-layer-${i}`,
          coordinateSystn: [0, 0, 0],
          image: `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${i}.png`,
          // image: image_data.body,
          // image: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-districts.png",
          pickable: true,
          bounds: [
            // 0, 0,
            this.mappingData[i].coords[0] - 0.4,
            -this.mappingData[i].coords[1] - 0.5,
            this.mappingData[i].coords[0] + 0.4,
            -this.mappingData[i].coords[1] + 0.5,
            // ]
            // [
            //   this.mappingData[i].coords[0] - 0.4,
            //   -this.mappingData[i].coords[1] - 0.5,
            //   random,
            // ],
            // [
            //   this.mappingData[i].coords[0] + 0.4,
            //   -this.mappingData[i].coords[1] + 0.5,
            //   random,
            // ],
            // [
            //   this.mappingData[i].coords[0] - 0.4,
            //   this.mappingData[i].coords[1] + 0.5,
            //   random,
            // ],
            // [
            //   this.mappingData[i].coords[0] + 0.4,
            //   -this.mappingData[i].coords[1] - 0.5,
            //   random,
            // ],
            // this.mappingData[i].coords[0] - 0.4,
            // -this.mappingData[i].coords[1] - 0.2,
            // this.mappingData[i].coords[0] + 0.4,
            // -this.mappingData[i].coords[1] + 0.2,
          ],
          index: i,
          loadOptions: {
            imagebitmap: {
              // Flip the image vertically
              // imageOrientation: "flipY",
            },
          },
          // pickable: true,
          onClick: (info, event) => {
            this.imgSrc.value = `http://localhost:5002/node_images/${this.dataset_type}/${this.time_type}/${info.layer.props.index}.png`;
            this.indexClicked = info.layer.props.index;
            console.log("Clicked:", info);
          },
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
              [
                this.mappingData[i].coords[0] - 0.4,
                -this.mappingData[i].coords[1] - 0.5,
              ],
              [
                this.mappingData[i].coords[0] - 0.4,
                -this.mappingData[i].coords[1] + 0.5,
              ],
              [
                this.mappingData[i].coords[0] + 0.4,
                -this.mappingData[i].coords[1] + 0.5,
              ],
              [
                this.mappingData[i].coords[0] + 0.4,
                -this.mappingData[i].coords[1] - 0.5,
              ],
              [
                this.mappingData[i].coords[0] - 0.4,
                -this.mappingData[i].coords[1] - 0.5,
              ],
            ],
          ],
        }),
      ];
      console.log("DEBUG PATHLAYER", [
        [
          this.mappingData[i].coords[0] - 0.4,
          -this.mappingData[i].coords[1] - 0.5,
        ],
        [
          this.mappingData[i].coords[0] - 0.4,
          -this.mappingData[i].coords[1] + 0.5,
        ],
        [
          this.mappingData[i].coords[0] + 0.4,
          -this.mappingData[i].coords[1] + 0.5,
        ],
        [
          this.mappingData[i].coords[0] + 0.4,
          -this.mappingData[i].coords[1] - 0.5,
        ],
      ]);
    }

    this.layerList = ret;
    return ret;
  }
}
