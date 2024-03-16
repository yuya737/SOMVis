import { ScatterplotLayer, PathLayer, CompositeLayer } from "deck.gl/typed";
import { DataFilterExtension } from "@deck.gl/extensions";
import type { LayersList } from "deck.gl/typed";
import { line, curveNatural } from "d3";
import { pointsOnPath } from "points-on-path";
import {
    scalePointsToSquare,
    colorSim,
    colorMonth,
    orbitView,
    orthoView,
    miniorthoView,
    layerFilter,
    DECKGL_SETTINGS,
    pointsToCurve,
} from "../utils/utils";

export class CurveLayer extends CompositeLayer {
    // readonly coords: any;
    // readonly name: string;

    // constructor(coords, name: string) {
    //     this.coords = coords;
    //     this.name = name;
    // }
    initializeState() {
        super.initializeState();
        this.setState({
            name: this.props.name,
        });
    }
    shouldUpdateState({ changeFlags }) {
        return (
            changeFlags.updateTriggersChanged || changeFlags.propsOrDataChanged
        );
    }

    // getLayer() {
    renderLayers() {
        let ret = [];

        let curve = line().curve(curveNatural);
        if (this.props.drawMonthly) {
            console.log("Draw Monthly");
            let month_dict = {
                1: [],
                2: [],
                3: [],
                4: [],
                5: [],
                6: [],
                7: [],
                8: [],
                9: [],
                10: [],
                11: [],
                12: [],
            };
            this.props.data
                .map((d) => d.coords)
                .forEach((d, i) => {
                    month_dict[(i % 12) + 1].push(d);
                });
            let month_divided_data = Object.entries(month_dict).map((v) => {
                return {
                    month: parseInt(v[0]),
                    coords: pointsToCurve(v[1])
                        .map((d) => [d[0], -d[1]])
                        .flat(),
                };
            });

            let l = new PathLayer({
                id: `${this.props.name}-path`,
                data: month_divided_data,
                // data: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/bart-lines.json",
                positionFormat: "XY",
                // getPath: (d) => d.coords,
                getPath: (d) => d.coords,
                getColor: (d) => colorMonth(d.month - 1),
                getWidth: 0.005,
                // extensions: [new DataFilterExtension({ filterSize: 1 })],
                // getFilterValue: (d) => d.month,
                // // getFilterValue: (d) => {
                // //     console.log(d);
                // //     return d.month == 1 ? 1 : 0;
                // // },
                // filterRange: [1, 1],
            });
            ret = [...ret, l];
        } else {
            console.log("Draw Non Monthly");
            let curve_points = pointsToCurve(
                this.props.data.map((d) => d.coords),
            );
            let transformed_curve_points = curve_points
                .map((d) => [d[0], -d[1]])
                .flat();
            let l = new PathLayer({
                id: `${this.props.name}-path`,
                data: [transformed_curve_points],
                positionFormat: "XY",
                // data: curve_points,
                getPath: (d) => d,
                getPosition: (d) => [d[0], -d[1]],
                getColor: colorSim(this.props.name),
                getWidth: 0.005,
                // getRadius: 0.05,
                // radiusUnits: "pixels",
            });
            ret = [...ret, l];
        }
        console.log(ret);
        return ret;
    }
}
CurveLayer.layerName = "CurveLayer";
CurveLayer.defaultProps = {
    ...CompositeLayer.defaultProps,
    ...PathLayer.defaultProps,
    ...ScatterplotLayer.defaultProps,
    drawMonthly: false,
    name: "curve-default",
};
