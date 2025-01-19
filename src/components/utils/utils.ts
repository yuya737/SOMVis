import { scaleOrdinal, scaleLinear } from "d3-scale";
import {
  interpolateRainbow,
  interpolateBlues,
  interpolateRdBu,
  interpolateBrBG,
  interpolateViridis,
} from "d3-scale-chromatic";
import { line, curveNatural } from "d3";
import { pointsOnPath } from "points-on-path";

import distance from "@turf/distance";
import bearing from "@turf/bearing";

import { OrthographicView, MapView, OrbitView } from "@deck.gl/core/typed";

// const prefix = 'CMIP6_pr_historical_S3L0.02_'
const prefix = "CMIP6_pr_delta_historical_S5L0.02_30x30_";

export enum subsetType {
  month = "month",
  waterYear = "water_year_mean",
}

export enum timeType {
  All = "All",
  OctMar = "OctMar",
  AprSep = "AprSep",
  OctMay = "OctMay",
}

export const timeTypeMonths = {
  [timeType.All]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  [timeType.OctMar]: [1, 2, 3, 10, 11, 12],
  [timeType.AprSep]: [4, 5, 6, 7, 8, 9],
  [timeType.OctMay]: [1, 2, 3, 4, 5, 10, 11, 12],
};

export function scalePointsToSquare(
  points: number[][],
  maxWidth = 40,
  maxHeight = 40
) {
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
      (point[0] - minX) * xScale +
      (maxWidth - (maxX - minX) * xScale) / 2 -
      maxWidth / 2;
    const scaledY =
      (point[1] - minY) * yScale +
      (maxHeight - (maxY - minY) * yScale) / 2 -
      maxHeight / 2;
    return [scaledX, scaledY];
  });
}

export function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

export function constructZones(mapAnnotation) {
  const zones = mapAnnotation.features.map((d, i) => {
    let offsetGeometry = JSON.parse(JSON.stringify(d.geometry));
    offsetGeometry.coordinates = [
      offsetGeometry.coordinates[0].map((lngLat) => {
        const d = distance([0, 0], lngLat, {
          units: "meters",
        });
        const a = bearing([0, 0], lngLat);
        const x = d * Math.sin((a * Math.PI) / 180);
        const y = d * Math.cos((a * Math.PI) / 180);
        return [x / 10, y / 10];
      }),
    ];
    console.log("DEBUG getCharacteristic lngLat", offsetGeometry.coordinates);
    return {
      name: d.properties.name,
      geometry: offsetGeometry,
      id: i,
    };
  });
  return zones;
}

// export function getMonthDividedData(data, name) {
//   let monthDict = {
//     1: [],
//     2: [],
//     3: [],
//     4: [],
//     5: [],
//     6: [],
//     7: [],
//     8: [],
//     9: [],
//     10: [],
//     11: [],
//     12: [],
//   };
//   data
//     .map((d) => d.coords)
//     .forEach((d, i) => {
//       monthDict[(i % 12) + 1].push(d);
//     });
//   let monthDividedData = Object.entries(monthDict).map((v, i) => {
//     return {
//       month: parseInt(v[0]),
//       scatter: v[1].map((d) => [d[0], -d[1]]),
//       name: name,
//       year: i,
//     };
//   });
//   return monthDividedData;
// }

// For DataFilterExtension on strings
// https://github.com/visgl/deck.gl/issues/7827
export function hashString(str: string): number {
  var hash = 0;
  if (str.length === 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

export function stripSOMprefix(model: string): string {
  let basefile = model.split("/").slice(-1)[0];
  let ret;

  if (basefile.includes("sfbay")) {
    let prefix = "CMIP6_pr_historical_sfbay_S2L0.1_20x20_";
    ret = basefile.slice(prefix.length);
  } else {
    // let prefix = "CMIP6_pr_historical_S3L0.02_";
    // strip the prefix
    ret = basefile.slice(prefix.length);
  }
  return ret;
}

export function getModelType(model: string): string {
  if (model == "All") return "All";
  let ret: string;
  // e.g. CMIP6_pr_historical_S3L0.02_ACCESS-CM2_historical_r1i1p1f1_pr.nc => ACCESS-CM2_historical_r1i1p1f1
  // first get basefile name
  let basefile = model.split("/").slice(-1)[0];
  if (basefile.includes("sfbay")) {
    let prefix = "CMIP6_pr_historical_sfbay_S2L0.1_20x20_";
    ret = basefile.slice(prefix.length).split("_")[0];
  } else {
    // let prefix = "CMIP6_pr_historical_S3L0.02_";
    // strip the prefix
    ret =
      basefile.slice(prefix.length, -7).split("_")[0] +
      "_" +
      basefile.slice(prefix.length, -7).split("_")[1];
  }
  return ret;
}

// Generate a list of months from start (e.g. 9: September )to end (e.g. 1: January)
// Accounts for cases where the months wrap around (e.g. 9 to 1)
export function generateMonthRangeList(start: number, end: number): number[] {
  let ret = [];
  if (start <= end) {
    for (let i = start; i <= end; i++) {
      ret.push(i);
    }
  } else {
    for (let i = 1; i <= end; i++) {
      ret.push(i);
    }
    for (let i = start; i <= 12; i++) {
      ret.push(i);
    }
  }
  return ret;
}

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
  ].map(hexToRgb)
);

export const addJitter = (d: number[], jitter = 0.01) => [
  d[0] + (Math.random() - 0.5) * jitter,
  d[1] + (Math.random() - 0.5) * jitter,
];

export const colorPercentile = (d: number) =>
  // // hexToRgb(interpolateRdBu(d / 100));
  // hexToRgb(interpolateViridis(d / 100));
  interpolateBrBG(d / 100)
    // interpolateSpectral((d / 12 + 0.5) % 1)
    .replace(/[^\d,]/g, "")
    .split(",")
    .map((d) => Number(d));

export const colorMonth = (d: number) =>
  interpolateRainbow((0.7 - d / 12) % 1)
    // interpolateSpectral((d / 12 + 0.5) % 1)
    .replace(/[^\d,]/g, "")
    .split(",")
    .map((d) => Number(d));

export const colorInterpDifference = (value: number) =>
  interpolateRdBu(scaleLinear().domain([-0.0005, 0.0005]).range([0, 1])(value))
    .replace(/[^\d,]/g, "")
    .split(",")
    .map((d) => Number(d));

export const colorInterp = (value: number) =>
  interpolateBlues(scaleLinear().domain([0.008, 0]).range([1, 0])(value))
    .replace(/[^\d,]/g, "")
    .split(",")
    .map((d) => Number(d));

export const pointsToCurve = (points: number[][]) => {
  let curve = line().curve(curveNatural);
  return pointsOnPath(curve(points), 0.001)[0];
};

export const approx = (a, b, epsilon = 0.0001) => Math.abs(a - b) < epsilon;

export const orbitView = new OrbitView({
  id: "main",
  // orbitAxis: "Y",
  controller: true,
  minRotationX: 0,
});

export const mapView = new MapView({
  id: "main",
});

export const orthoView = new OrthographicView({
  id: "main",
  controller: true,
});
export const miniorthoView = new OrthographicView({
  id: "minimap",
  // zoom: 3.5,
  x: 20,
  y: 20,
  width: "25%",
  height: "25%",
  // clear: true,
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
    rotationX: 90,
    zoom: 20,
    latitude: 0,
    longitude: 0,
    maxZoom: 25,
    minZoom: 18,
    maxPitch: 89,
  },
};

export function getChildren(node, listSoFar = []) {
  if (node.children) {
    getChildren(node.children[0], listSoFar);
    getChildren(node.children[1], listSoFar);
  } else {
    listSoFar.push(node.data.index);
  }
  return listSoFar;
}

// Accept a ml-hclust object and return a list of nodes from left to right
export function getNodeOrder(node, listSoFar = []) {
  if (node.children.length > 0) {
    getNodeOrder(node.children[0], listSoFar);
    getNodeOrder(node.children[1], listSoFar);
  } else {
    listSoFar.push(node.index);
  }
  return listSoFar;
}

export function layerFilter({ layer, viewport }) {
  if (layer.id != "viewport-bounds") {
    return true;
  }
  return viewport.id == "minimap";
}

export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const calsimLabels = [
  "bl_h000",
  "CS3_ALT3_2022MED",
  "CS3_ALT3_2040MED",
  "CS3_NAA_2022MED",
  "CS3_NAA_2040MED",
  "LTO_BA_EXP1_2022MED",
];
export const historicalLabels = [
  "ACCESS-CM2_historical_r1i1p1f1_pr.nc",
  "CESM2-LENS_historical_r1i1p1f1_pr.nc",
  "CNRM-ESM2-1_historical_r1i1p1f2_pr.nc",
  "EC-Earth3-Veg_historical_r1i1p1f1_pr.nc",
  "EC-Earth3_historical_r1i1p1f1_pr.nc",
  "FGOALS-g3_historical_r1i1p1f1_pr.nc",
  "GFDL-ESM4_historical_r1i1p1f1_pr.nc",
  "HadGEM3-GC31-LL_historical_r1i1p1f3_pr.nc",
  "INM-CM5-0_historical_r1i1p1f1_pr.nc",
  "IPSL-CM6A-LR_historical_r1i1p1f1_pr.nc",
  "KACE-1-0-G_historical_r1i1p1f1_pr.nc",
  "MIROC6_historical_r1i1p1f1_pr.nc",
  "MPI-ESM1-2-HR_historical_r1i1p1f1_pr.nc",
  "MRI-ESM2-0_historical_r1i1p1f1_pr.nc",
  "TaiESM1_historical_r1i1p1f1_pr.nc",
];

export let ssp245Labels = [
  "ACCESS-CM2_ssp245_r1i1p1f1_pr.nc",
  "CNRM-ESM2-1_ssp245_r1i1p1f2_pr.nc",
  "EC-Earth3-Veg_ssp245_r1i1p1f1_pr.nc",
  "EC-Earth3_ssp245_r1i1p1f1_pr.nc",
  "FGOALS-g3_ssp245_r1i1p1f1_pr.nc",
  "GFDL-ESM4_ssp245_r1i1p1f1_pr.nc",
  "HadGEM3-GC31-LL_ssp245_r1i1p1f3_pr.nc",
  "INM-CM5-0_ssp245_r1i1p1f1_pr.nc",
  "IPSL-CM6A-LR_ssp245_r1i1p1f1_pr.nc",
  "KACE-1-0-G_ssp245_r1i1p1f1_pr.nc",
  "MIROC6_ssp245_r1i1p1f1_pr.nc",
  "MPI-ESM1-2-HR_ssp245_r1i1p1f1_pr.nc",
  "MRI-ESM2-0_ssp245_r1i1p1f1_pr.nc",
  "TaiESM1_ssp245_r1i1p1f1_pr.nc",
];

export let ssp370Labels = [
  "ACCESS-CM2_ssp370_r1i1p1f1_pr.nc",
  "CESM2-LENS_ssp370_r1i1p1f1_pr.nc",
  "CNRM-ESM2-1_ssp370_r1i1p1f2_pr.nc",
  "EC-Earth3-Veg_ssp370_r1i1p1f1_pr.nc",
  "EC-Earth3_ssp370_r1i1p1f1_pr.nc",
  "FGOALS-g3_ssp370_r1i1p1f1_pr.nc",
  "GFDL-ESM4_ssp370_r1i1p1f1_pr.nc",
  "INM-CM5-0_ssp370_r1i1p1f1_pr.nc",
  "IPSL-CM6A-LR_ssp370_r1i1p1f1_pr.nc",
  "KACE-1-0-G_ssp370_r1i1p1f1_pr.nc",
  "MIROC6_ssp370_r1i1p1f1_pr.nc",
  "MPI-ESM1-2-HR_ssp370_r1i1p1f1_pr.nc",
  "MRI-ESM2-0_ssp370_r1i1p1f1_pr.nc",
  "TaiESM1_ssp370_r1i1p1f1_pr.nc",
];

export const ssp585Labels = [
  "ACCESS-CM2_ssp585_r1i1p1f1_pr.nc",
  "CNRM-ESM2-1_ssp585_r1i1p1f2_pr.nc",
  "EC-Earth3-Veg_ssp585_r1i1p1f1_pr.nc",
  "EC-Earth3_ssp585_r1i1p1f1_pr.nc",
  "FGOALS-g3_ssp585_r1i1p1f1_pr.nc",
  "GFDL-ESM4_ssp585_r1i1p1f1_pr.nc",
  "HadGEM3-GC31-LL_ssp585_r1i1p1f3_pr.nc",
  "INM-CM5-0_ssp585_r1i1p1f1_pr.nc",
  "IPSL-CM6A-LR_ssp585_r1i1p1f1_pr.nc",
  "KACE-1-0-G_ssp585_r1i1p1f1_pr.nc",
  "MIROC6_ssp585_r1i1p1f1_pr.nc",
  "MPI-ESM1-2-HR_ssp585_r1i1p1f1_pr.nc",
  "MRI-ESM2-0_ssp585_r1i1p1f1_pr.nc",
];

// export const dataset_name = "NorthWest";
export const dataset_name = "California";

export const sspAllLabels: EnsembleMember[] = [
  ...historicalLabels,
  ...ssp245Labels,
  ...ssp370Labels,
  ...ssp585Labels,
].map((d) => {
  return {
    dataset_name: dataset_name,
    model_name: d.split("_")[0],
    ssp: d.split("_")[1],
    variant: d.split("_")[2],
  };
});

export const historicalLabelsSfbay = [
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_ACCESS-CM2_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_ACCESS-CM2_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_ACCESS-CM2_historical_r3i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r10i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r5i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r6i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r7i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r8i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CESM2-LENS_historical_r9i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_CNRM-ESM2-1_historical_r1i1p1f2_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3_historical_r4i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3-Veg_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3-Veg_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3-Veg_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3-Veg_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_EC-Earth3-Veg_historical_r5i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_FGOALS-g3_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_FGOALS-g3_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_FGOALS-g3_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_FGOALS-g3_historical_r5i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_GFDL-ESM4_historical_r1i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_HadGEM3-GC31-LL_historical_r1i1p1f3_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_HadGEM3-GC31-LL_historical_r2i1p1f3_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_HadGEM3-GC31-LL_historical_r3i1p1f3_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_INM-CM5-0_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_INM-CM5-0_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_INM-CM5-0_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_INM-CM5-0_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_INM-CM5-0_historical_r5i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r10i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r5i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r6i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r7i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r8i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_IPSL-CM6A-LR_historical_r9i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_KACE-1-0-G_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_KACE-1-0-G_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_KACE-1-0-G_historical_r3i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MIROC6_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MIROC6_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MIROC6_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MIROC6_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MIROC6_historical_r5i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r10i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r5i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r6i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r7i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r8i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MPI-ESM1-2-HR_historical_r9i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MRI-ESM2-0_historical_r1i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MRI-ESM2-0_historical_r2i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MRI-ESM2-0_historical_r3i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MRI-ESM2-0_historical_r4i1p1f1_pr_sfbay.nc",
  //   "CMIP6_pr_historical_sfbay_S3L0.1_20x20_MRI-ESM2-0_historical_r5i1p1f1_pr_sfbay.nc",
  "CMIP6_pr_historical_sfbay_S3L0.1_20x20_TaiESM1_historical_r1i1p1f1_pr_sfbay.nc",
];

// export const labels = historicalLabelsfbay;
