import { BitmapLayer } from "@deck.gl/layers";
import { useCloned } from "@vueuse/core";
import { ILayerGenerator } from "./layerGenerator";

export class NodeLayer implements ILayerGenerator {
    readonly mapping_data;
    readonly imgSrc;
    readonly drawEveryN: number;
    readonly needsToRedraw: boolean = false;

    layerList: any = null;

    constructor(mapping_data, imgSrc, drawEveryN) {
        this.mapping_data = mapping_data;
        this.imgSrc = imgSrc;
        this.drawEveryN = drawEveryN;
    }

    checkNeedsToRedraw() {
        return this.needsToRedraw;
    }
    getLayers() {
        if (this.layerList && !this.needsToRedraw) {
            return this.layerList;
        }
        let ret = [];
        for (let i = 0; i < 900; i += this.drawEveryN) {
            // for (let i = 0; i < 100; i += 2) {
            ret = [
                ...ret,
                new BitmapLayer({
                    id: `image-layer-${i}`,
                    image: `http://localhost:5002/node_images/${i}.png`,
                    // image: image_data.body,
                    // image: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-districts.png",
                    pickable: true,
                    bounds: [
                        // 0, 0,
                        this.mapping_data[i].coords[0] - 0.4,
                        -this.mapping_data[i].coords[1] - 0.5,
                        this.mapping_data[i].coords[0] + 0.4,
                        -this.mapping_data[i].coords[1] + 0.5,
                    ],
                    index: i,
                    loadOptions: {
                        imagebitmap: {
                            // Flip the image vertically
                            imageOrientation: "flipY",
                        },
                    },
                    onClick: (info, event) => {
                        this.imgSrc.value = `http://localhost:5002/node_images/${info.layer.props.index}.png`;
                        console.log("Clicked:", info);
                    },
                }),
            ];
        }
        this.layerList = ret;
        return ret;
    }
}
