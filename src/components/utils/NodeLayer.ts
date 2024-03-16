import { BitmapLayer } from "deck.gl/typed";
import { useCloned } from "@vueuse/core";

export class NodeLayer {
    readonly mapping_data;
    readonly imgSrc;

    constructor(mapping_data, imgSrc) {
        this.mapping_data = mapping_data;
        this.imgSrc = imgSrc;
    }
    getLayer() {
        let ret = [];
        for (let i = 0; i < 900; i += 13) {
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
        return ret;
    }
}
