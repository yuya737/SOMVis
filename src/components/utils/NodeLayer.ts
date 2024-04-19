import { BitmapLayer } from "@deck.gl/layers";
import { AbstractLayerGenerator } from "./AbstractLayerGenerator";

export class NodeLayer extends AbstractLayerGenerator {
  readonly mappingData;
  readonly imgSrc;
  readonly drawEveryN: number;
  readonly needsToRedraw: boolean = false;
  readonly dims: number;

  layerList: any = null;

  constructor(mappingData, imgSrc, drawEveryN, dims = 30) {
    super();
    this.mappingData = mappingData;
    this.imgSrc = imgSrc;
    this.drawEveryN = drawEveryN;
    this.dims = dims;
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    let ret = [];
    for (let i = 0; i < this.dims * this.dims; i += this.drawEveryN) {
      // for (let i = 0; i < 100; i += 2) {
      ret = [
        ...ret,
        new BitmapLayer({
          id: `image-layer-${i}`,
          image: `http://localhost:5002/node_images/${i}.png`,
          // image: image_data.body,
          // image: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-districts.png",
          // pickable: true,
          bounds: [
            // 0, 0,
            this.mappingData[i].coords[0] - 0.4,
            -this.mappingData[i].coords[1] - 0.5,
            this.mappingData[i].coords[0] + 0.4,
            -this.mappingData[i].coords[1] + 0.5,
          ],
          index: i,
          loadOptions: {
            imagebitmap: {
              // Flip the image vertically
              // imageOrientation: "flipY",
            },
          },
          onClick: (info, event) => {
            this.imgSrc.value = `http://localhost:5002/node_images/${info.layer.props.index}.png`;
            console.log("Clicked:", info);
          },
        }),
      ];
    }
    // return [];
    this.layerList = ret;
    return ret;
  }
}
