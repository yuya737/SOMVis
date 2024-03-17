import { PathLayer } from "@deck.gl/layers";

export class AxisLayer {
    readonly min: number;
    readonly max: number;
    readonly gridWidth: number;
    readonly isThreeD: boolean;
    needsToRedraw: boolean = false;

    layerList: any = null;

    constructor(
        min: number,
        max: number,
        gridWidth: number,
        isThreeD: boolean,
    ) {
        this.min = min;
        this.max = max;
        this.gridWidth = gridWidth;
        this.isThreeD = isThreeD;
    }

    checkNeedsToRedraw() {
        return this.needsToRedraw;
    }

    _get2DLayers(): LayersList {
        // X-Y axis layer
        let axisLayer = new PathLayer({
            id: "axis-layer",
            data: [
                [
                    [this.min, 0, 0],
                    [this.max, 0, 0],
                ],
                [
                    [0, this.min, 0],
                    [0, this.max, 0],
                ],
                // [
                //     [0.01, 0, -5],
                //     [0.02, 0, 5],
                // ],
            ],
            getPath: (d) => d,
            getColor: [155, 155, 155],
            getWidth: 4,
            pickable: false,
            widthUnits: "pixels",
        });
        let ret: LayersList = [axisLayer];

        const generateNumbers = (max, min, interval) =>
            Array.from(
                { length: Math.floor((max - min) / interval) + 1 },
                (_, index) => max - index * interval,
            );

        generateNumbers(this.max, this.min, this.gridWidth).forEach(
            (i, index) => {
                ret.push(
                    new PathLayer({
                        id: `grid-x-layer-${index}`,
                        data: [
                            [
                                [i, this.min],
                                [i, this.max],
                            ],
                        ],
                        getPath: (d) => d,
                        getColor: [100, 100, 100],
                        getWidth: 1,
                        pickable: false,
                        widthUnits: "pixels",
                    }),
                );
                ret.push(
                    new PathLayer({
                        id: `grid-y-layer-${index}`,
                        data: [
                            [
                                [this.min, i],
                                [this.max, i],
                            ],
                        ],
                        getPath: (d) => d,
                        getColor: [100, 100, 100],
                        getWidth: 1,
                        pickable: false,
                        widthUnits: "pixels",
                    }),
                );
                ret.push(
                    new PathLayer({
                        id: `grid-z-layer-${index}`,
                        data: [
                            [
                                [0, this.min, i],
                                [0, this.max, i],
                            ],
                        ],
                        getPath: (d) => d,
                        getColor: [100, 100, 100],
                        getWidth: 1,
                        pickable: false,
                        widthUnits: "pixels",
                    }),
                );
            },
        );
        return ret;
    }

    // _get3DLayers() : LayersList {
    //     // X-Y-Z axis layer
    //     let axisLayer = new PathLayer({
    //         id: 'axis-layer',
    //         data: [[[this.min, 0, 0], [this.max, 0, 0]], [[0, this.min, 0], [0, this.max, 0]], [[0, 0, this.min], [0, 0, this.max]]],
    //         getPath: d => d,
    //         getColor: [155, 155, 155],
    //         getWidth: 4,
    //         pickable: false,
    //         widthUnits: 'pixels'
    //     })
    //     let ret: LayersList = [axisLayer]

    //     const generateNumbers = (max, min, interval) =>
    //         Array.from({ length: Math.floor((max - min) / interval) + 1 }, (_, index) => max - index * interval);

    //     generateNumbers(this.max, this.min, this.gridWidth).forEach((i, index) => {
    //         ret.push(new PathLayer({
    //             id: `grid-x-layer-${index}`,
    //             data: [[[i, this.min, 0], [i, this.max, 0]]],
    //             getPath: d => d,
    //             getColor: [100, 100, 100],
    //             getWidth: 1,
    //             pickable: false,
    //             widthUnits: 'pixels'
    //         }))
    //         ret.push(new PathLayer({
    //             id: `grid-y-layer-${index}`,
    //             data: [[[this.min, i, 0], [this.max, i, 0]]],
    //             getPath: d => d,
    //             getColor: [100, 100, 100],
    //             getWidth: 1,
    //             pickable: false,
    //             widthUnits: 'pixels'
    //         }))
    //         ret.push(new PathLayer({
    //             id: `grid-z-layer-${index}`,
    //             data: [[[this.min, y], [0, this.max, i]]],
    //             getPath: d => d,
    //             getColor: [100, 100, 100],
    //             getWidth: 1,
    //             pickable: false,
    //             widthUnits: 'pixels'
    //         }))
    //     })
    //     return ret

    // }
    getLayers(): LayersList {
        if (this.layerList && !this.needsToRedraw) {
            return this.layerList;
        }
        // if (this.isThreeD){
        //     // return this._get3DLayers()
        // } else {
        let ret = this._get2DLayers();
        this.layerList = ret;
        return ret;
        // }
    }
}
