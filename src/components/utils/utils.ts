import { scaleOrdinal } from "d3-scale";
import {
    interpolateSpectral,
    interpolateRainbow,
    interpolateViridis,
} from "d3-scale-chromatic";
import { interpolateBlues } from "d3-scale-chromatic";
import { line, curveNatural } from "d3";
import { pointsOnPath } from "points-on-path";

import { OrthographicView, OrbitView } from "@deck.gl/core";

export function scalePointsToSquare(points, maxWidth = 40, maxHeight = 40) {
    // Find minimum and maximum values for x and y
    const minX = Math.min(...points.map((p) => p[0]));
    const maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1]));
    const maxY = Math.max(...points.map((p) => p[1]));

    // Calculate scaling factors
    const xScale = maxWidth / (maxX - minX);
    const yScale = maxHeight / (maxY - minY);

    // Scale each point and adjust for centering
    return points.map((point) => {
        const scaledX =
            (points[0] - minX) * xScale +
            (maxWidth - (maxX - minX) * xScale) / 2 -
            maxWidth / 2;
        const scaledY =
            (point[1] - minY) * yScale +
            (maxHeight - (maxY - minY) * yScale) / 2 -
            maxHeight / 2;
        return [scaledX, scaledY];
    });
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16),
          ]
        : null;
}
export const getModelType = (model) => {
    // e.g. CMIP6_pr_historical_S3L0.02_ACCESS-CM2_historical_r1i1p1f1_pr.nc => ACCESS-CM2_historical_r1i1p1f1
    // first get basefile name
    let basefile = model.split("/").slice(-1)[0];
    let prefix = "CMIP6_pr_historical_S3L0.02_";
    // strip the prefix
    let ret = basefile.slice(prefix.length, -7).split("_")[0];
    return ret;
};
export const colorSim = scaleOrdinal(
    [
        "#e6194b",
        "#3cb44b",
        "#ffe119",
        "#4363d8",
        "#f58231",
        "#911eb4",
        "#46f0f0",
        "#f032e6",
        "#bcf60c",
        "#fabebe",
        "#008080",
        "#e6beff",
        "#9a6324",
        "#fffac8",
        "#800000",
        "#aaffc3",
        "#808000",
        "#ffd8b1",
        "#000075",
        "#808080",
        "#ffffff",
        "#000000",
    ].map(hexToRgb),
);

export const addJitter = (points, jitter = 0.5) =>
    points.map((d) => [
        d[0] + (Math.random() - 0.5) * jitter,
        d[1] + (Math.random() - 0.5) * jitter,
    ]);

export const colorPercentile = (d) => hexToRgb(interpolateViridis(d / 100));

export const colorMonth = (d) =>
    interpolateRainbow((0.7 - d / 12) % 1)
        // interpolateSpectral((d / 12 + 0.5) % 1)
        .replace(/[^\d,]/g, "")
        .split(",")
        .map((d) => Number(d));

export const pointsToCurve = (points) => {
    let curve = line().curve(curveNatural);
    return pointsOnPath(curve(points), 0.001)[0];
};

export const orbitView = new OrbitView({
    id: "main",
    controller: true,
});

export const orthoView = new OrthographicView({
    id: "main",
    controller: true,
});
export const miniorthoView = new OrthographicView({
    id: "minimap",
    zoom: 3.5,
    x: 20,
    y: 20,
    width: "25%",
    height: "25%",
    clear: true,
});

export const DECKGL_SETTINGS = {
    canvas: "deck-canvas-projection-viewer",
    width: "100%",
    height: "100%",
    controller: true,

    // initialViewState: {
    //     main: {
    //         target: [0, 0, 0],
    //         zoom: 6,
    //     },
    //     minimap: {
    //         target: [0, 0, 0],
    //         zoom: 6,
    //     },
    // },
    initialViewState: {
        target: [0, 0, 0],
        zoom: 6,
    },
};

export function layerFilter({ layer, viewport }) {
    if (layer.id != "viewport-bounds") {
        return true;
    }
    return viewport.id == "minimap";
}
export const calsim_labels = [
    "bl_h000",
    "CS3_ALT3_2022MED",
    "CS3_ALT3_2040MED",
    "CS3_NAA_2022MED",
    "CS3_NAA_2040MED",
    "LTO_BA_EXP1_2022MED",
];
export const historical_labels = [
    "CMIP6_pr_historical_S3L0.02_ACCESS-CM2_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_ACCESS-CM2_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_ACCESS-CM2_historical_r3i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r10i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r5i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r6i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r7i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r8i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_CESM2-LENS_historical_r9i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_CNRM-ESM2-1_historical_r1i1p1f2_pr.nc",
    "CMIP6_pr_historical_S3L0.02_EC-Earth3_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_historical_r5i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_FGOALS-g3_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_FGOALS-g3_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_FGOALS-g3_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_FGOALS-g3_historical_r5i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_GFDL-ESM4_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_HadGEM3-GC31-LL_historical_r1i1p1f3_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_HadGEM3-GC31-LL_historical_r2i1p1f3_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_HadGEM3-GC31-LL_historical_r3i1p1f3_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_INM-CM5-0_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_INM-CM5-0_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_INM-CM5-0_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_INM-CM5-0_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_INM-CM5-0_historical_r5i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r10i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r5i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r6i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r7i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r8i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_historical_r9i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_KACE-1-0-G_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_KACE-1-0-G_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_KACE-1-0-G_historical_r3i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_MIROC6_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_historical_r5i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r10i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r5i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r6i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r7i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r8i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_historical_r9i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MRI-ESM2-0_historical_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MRI-ESM2-0_historical_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MRI-ESM2-0_historical_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MRI-ESM2-0_historical_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MRI-ESM2-0_historical_r5i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_TaiESM1_historical_r1i1p1f1_pr.nc",

    // "CMIP6_taxmax_historical_S3L0.1_ACCESS-CM2_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_ACCESS-CM2_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_ACCESS-CM2_historical_r3i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r10i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r5i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r6i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r7i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r8i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_CESM2-LENS_historical_r9i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_CNRM-ESM2-1_historical_r1i1p1f2_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_historical_r5i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_historical_r5i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_GFDL-ESM4_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_HadGEM3-GC31-LL_historical_r1i1p1f3_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_HadGEM3-GC31-LL_historical_r2i1p1f3_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_HadGEM3-GC31-LL_historical_r3i1p1f3_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_INM-CM5-0_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_INM-CM5-0_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_INM-CM5-0_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_INM-CM5-0_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_INM-CM5-0_historical_r5i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r10i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r5i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r6i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r7i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r8i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_historical_r9i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_KACE-1-0-G_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_KACE-1-0-G_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_KACE-1-0-G_historical_r3i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_MIROC6_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_historical_r5i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r10i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r5i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r6i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r7i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r8i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_historical_r9i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MRI-ESM2-0_historical_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MRI-ESM2-0_historical_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MRI-ESM2-0_historical_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MRI-ESM2-0_historical_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MRI-ESM2-0_historical_r5i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_TaiESM1_historical_r1i1p1f1_tasmax.nc"
];

export const ssp585_labels = [
    "CMIP6_pr_historical_S3L0.02_ACCESS-CM2_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_ACCESS-CM2_ssp585_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_ACCESS-CM2_ssp585_r3i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_CNRM-ESM2-1_ssp585_r1i1p1f2_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3_ssp585_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3_ssp585_r4i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_ssp585_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_ssp585_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_EC-Earth3-Veg_ssp585_r4i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_FGOALS-g3_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_FGOALS-g3_ssp585_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_FGOALS-g3_ssp585_r4i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_GFDL-ESM4_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_HadGEM3-GC31-LL_ssp585_r1i1p1f3_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_HadGEM3-GC31-LL_ssp585_r2i1p1f3_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_HadGEM3-GC31-LL_ssp585_r3i1p1f3_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_INM-CM5-0_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_ssp585_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_ssp585_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_IPSL-CM6A-LR_ssp585_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_KACE-1-0-G_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_KACE-1-0-G_ssp585_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_KACE-1-0-G_ssp585_r3i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_MIROC6_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_ssp585_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_ssp585_r3i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_ssp585_r4i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MIROC6_ssp585_r5i1p1f1_pr.nc",
    "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_ssp585_r1i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MPI-ESM1-2-HR_ssp585_r2i1p1f1_pr.nc",
    // "CMIP6_pr_historical_S3L0.02_MRI-ESM2-0_ssp585_r1i1p1f1_pr.nc",

    // "CMIP6_taxmax_historical_S3L0.1_ACCESS-CM2_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_ACCESS-CM2_ssp585_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_ACCESS-CM2_ssp585_r3i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_CNRM-ESM2-1_ssp585_r1i1p1f2_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_ssp585_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3_ssp585_r4i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_ssp585_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_ssp585_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_EC-Earth3-Veg_ssp585_r4i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_ssp585_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_FGOALS-g3_ssp585_r4i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_GFDL-ESM4_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_HadGEM3-GC31-LL_ssp585_r1i1p1f3_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_HadGEM3-GC31-LL_ssp585_r2i1p1f3_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_HadGEM3-GC31-LL_ssp585_r3i1p1f3_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_INM-CM5-0_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_ssp585_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_ssp585_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_IPSL-CM6A-LR_ssp585_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_KACE-1-0-G_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_KACE-1-0-G_ssp585_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_KACE-1-0-G_ssp585_r3i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_MIROC6_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_ssp585_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_ssp585_r3i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_ssp585_r4i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MIROC6_ssp585_r5i1p1f1_tasmax.nc",
    // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_ssp585_r1i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MPI-ESM1-2-HR_ssp585_r2i1p1f1_tasmax.nc",
    // // "CMIP6_taxmax_historical_S3L0.1_MRI-ESM2-0_ssp585_r1i1p1f1_tasmax.nc"
];

export const labels = historical_labels;
