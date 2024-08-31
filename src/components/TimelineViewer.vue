<template>
  <div id="timelineContainer" class="relative h-full w-full">
    <Dropdown
      v-model="selectedModel"
      :options="models"
      optionLabel="name"
      placeholder="Select a Model"
      class="absolute left-0 top-0 w-fit z-[2] bg-gray-200 m-4 text-black text-lg"
    />
    <div
      id="tooltip"
      v-show="showTooltip"
      class="absolute bg-white border border-gray-300 shadow-lg rounded-lg p-2 text-black"
    >
      {{ tooltipData }}
    </div>
    <div id="timelineSVG" class="w-full h-full text-black"></div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from "d3";
import API from "@/api/api";
import { onMounted, ref, reactive, watch, nextTick } from "vue";
import Dropdown from "primevue/dropdown";
import { sspAllLabels } from "./utils/utils";

const showTooltip = ref(false);
const tooltipData = ref("");

const selectedModel = ref();
watch(selectedModel, (value) => {
  console.log(value.name);
  d3.selectAll("path")
    .attr("stroke", "black")
    .attr("stroke-opacity", "0.5")
    .attr("stroke-width", "1");
  d3.selectAll("path")
    // Filter elements based on the stroke-width attribute
    .filter(function () {
      return (
        d3.select(this).datum() &&
        fileNames[d3.select(this).datum()["index"]].includes(value.name + "_")
      );
    })
    .attr("stroke", "crimson")
    .attr("stroke-opacity", "1")
    .attr("stroke-width", "4");
});

const colors = [
  // "#4e79a7",
  "#f28e2c",
  // "#e15759",
  // "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ab",
  "#8dd3c7",
  "#ffffb3",
  "#bebada",
  // "#fb8072",
  "#80b1d3",
  "#fdb462",
  "#b3de69",
  "#fccde5",
  "#d9d9d9",
  "#bc80bd",
  "#ccebc5",
  "#ffed6f",
  "#000000",
  "#ffdd89",
  "#957244",
  "#f26223",
  "#4e79a7",
  "#d3d3d3",
];

const fileNames = [
  "CMIP6_pr_delta_historical_S5L0.02_30x30_ACCESS-CM2_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_ACCESS-CM2_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_ACCESS-CM2_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_CESM2-LENS_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_CESM2-LENS_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_CNRM-ESM2-1_historical_r1i1p1f2_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_CNRM-ESM2-1_ssp370_r1i1p1f2_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_CNRM-ESM2-1_ssp585_r1i1p1f2_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_EC-Earth3-Veg_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_EC-Earth3-Veg_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_EC-Earth3-Veg_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_EC-Earth3_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_EC-Earth3_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_EC-Earth3_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_FGOALS-g3_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_FGOALS-g3_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_FGOALS-g3_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_GFDL-ESM4_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_GFDL-ESM4_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_GFDL-ESM4_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_HadGEM3-GC31-LL_historical_r1i1p1f3_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_HadGEM3-GC31-LL_ssp585_r1i1p1f3_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_INM-CM5-0_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_INM-CM5-0_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_INM-CM5-0_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_IPSL-CM6A-LR_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_IPSL-CM6A-LR_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_IPSL-CM6A-LR_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_KACE-1-0-G_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_KACE-1-0-G_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_KACE-1-0-G_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MIROC6_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MIROC6_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MIROC6_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MPI-ESM1-2-HR_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MPI-ESM1-2-HR_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MPI-ESM1-2-HR_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MRI-ESM2-0_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MRI-ESM2-0_ssp370_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_MRI-ESM2-0_ssp585_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_TaiESM1_historical_r1i1p1f1_pr.nc",
  "CMIP6_pr_delta_historical_S5L0.02_30x30_TaiESM1_ssp370_r1i1p1f1_pr.nc",
];

// const cities = ref(
//   fileNames.map((fileName) => {
//     return {
//       code: fileName,
//     };
//   })
// );
const models = ref(
  Array.from(new Set(fileNames.map((fileName) => fileName.split("_")[6]))).map(
    (name) => {
      return {
        name,
        // code: fileNames.find((fileName) => fileName.includes(name)),
      };
    }
  )
);

const monthlyMDS = {
  1: [-60.48460452386658, 60.48460452386658],
  2: [
    -58.35699554933664, 22.082520836554114, -84.31039378515354,
    120.58486846890054,
  ],
  3: [-58.99908299309351, 58.99908299309351],
  4: [-52.76784974875045, 52.76784974875045],
  5: [-3.8243457595546873, -62.45500571775372, 66.27935148202184],
  6: [35.90798359834169, 0.7258520588195637, -36.63383565308662],
  7: [
    -15.034233972736136, 34.9318640088883, -72.17780389521027,
    52.28017385896895,
  ],
  8: [-28.91615066005589, 28.91615066005589],
  9: [
    -52.499638886043215, 68.8565399612014, 10.615661527484376,
    -26.97256260014477,
  ],
  10: [69.11744244437034, 2.82353971038528, -71.94098217317824],
  11: [74.07991469889366, -1.0163887348363057, -73.06352596908818],
  12: [
    -74.08971868558595, 78.70062893531168, 12.386626041040053,
    -16.997536311258227,
  ],
};

const data = reactive([]);
const dataT = reactive([]);
// const data = [
//   [
//     0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
//   ],
//   [
//     0, 1, 2, 2, 0, 2, 1, 1, 0, 3, 1, 0, 1, 2, 2, 1, 3, 0, 1, 2, 1, 1, 2, 0, 2,
//     0, 3, 1, 0, 0, 0, 1, 1, 0, 0, 3, 1, 0, 0, 0, 0, 0,
//   ],
//   [
//     0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//   ],
//   [
//     0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1,
//   ],
//   [
//     0, 0, 0, 1, 0, 0, 2, 2, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
//     0, 0, 0, 1, 2, 1, 0, 1, 2, 1, 2, 0, 0, 0, 0, 1, 0,
//   ],
//   [
//     0, 1, 2, 1, 0, 0, 1, 1, 1, 2, 0, 0, 0, 2, 0, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0,
//     0, 1, 1, 0, 2, 2, 2, 2, 2, 0, 1, 1, 0, 1, 1, 0, 1,
//   ],
//   [
//     0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 3, 0, 2, 0, 0, 1, 0, 0, 0,
//     0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0,
//   ],
//   [
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
//   ],
//   [
//     0, 1, 2, 0, 0, 0, 3, 3, 0, 2, 2, 0, 2, 1, 2, 0, 0, 0, 0, 3, 0, 1, 3, 3, 3,
//     0, 3, 2, 2, 1, 1, 2, 3, 2, 0, 0, 2, 0, 0, 0, 2, 3,
//   ],
//   [
//     0, 1, 2, 2, 2, 1, 2, 2, 1, 2, 2, 0, 1, 2, 1, 1, 0, 1, 0, 2, 1, 1, 1, 1, 0,
//     1, 2, 2, 1, 1, 0, 0, 2, 1, 1, 2, 1, 1, 1, 2, 1, 0,
//   ],
//   [
//     0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 2, 1, 1,
//     1, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 0,
//   ],
//   [
//     0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0, 0, 0, 1, 1, 0, 2, 3, 0, 1, 0, 1, 3, 0, 1,
//     1, 0, 0, 1, 0, 3, 3, 0, 1, 2, 0, 1, 3, 1, 1, 0, 3,
//   ],
// ];

// const dataT = [
//   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
//   [0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1],
//   [1, 2, 0, 0, 0, 2, 1, 0, 2, 2, 0, 1],
//   [0, 2, 0, 0, 1, 1, 0, 0, 0, 2, 1, 1],
//   [1, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 1],
//   [0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
//   [0, 1, 1, 1, 2, 1, 0, 0, 3, 2, 0, 1],
//   [0, 1, 0, 1, 2, 1, 0, 0, 3, 2, 0, 1],
//   [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2],
//   [1, 3, 0, 1, 0, 2, 0, 0, 2, 2, 0, 1],
//   [0, 1, 0, 0, 2, 0, 0, 0, 2, 2, 0, 0],
//   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0],
//   [0, 1, 0, 1, 0, 0, 2, 0, 2, 1, 0, 0],
//   [0, 2, 0, 1, 0, 2, 2, 0, 1, 2, 0, 1],
//   [0, 2, 0, 0, 0, 0, 3, 0, 2, 1, 2, 1],
//   [1, 1, 1, 0, 0, 1, 3, 0, 0, 1, 2, 0],
//   [0, 3, 1, 0, 0, 1, 3, 0, 0, 0, 2, 2],
//   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3],
//   [0, 1, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0],
//   [1, 2, 0, 1, 0, 0, 0, 0, 3, 2, 0, 1],
//   [0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0],
//   [0, 1, 0, 0, 1, 2, 1, 0, 1, 1, 0, 1],
//   [0, 2, 0, 0, 0, 0, 0, 0, 3, 1, 2, 3],
//   [0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 1, 0],
//   [0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 1, 1],
//   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
//   [0, 3, 0, 0, 0, 1, 0, 0, 3, 2, 2, 0],
//   [0, 1, 0, 0, 0, 1, 0, 1, 2, 2, 0, 0],
//   [0, 0, 1, 0, 1, 0, 0, 1, 2, 1, 2, 1],
//   [0, 0, 0, 1, 2, 2, 1, 0, 1, 1, 0, 0],
//   [0, 0, 0, 0, 1, 2, 1, 0, 1, 0, 0, 3],
//   [0, 1, 0, 0, 0, 2, 0, 0, 2, 0, 0, 3],
//   [0, 1, 0, 1, 1, 2, 0, 0, 3, 2, 0, 0],
//   [0, 0, 0, 0, 2, 2, 0, 0, 2, 1, 0, 1],
//   [0, 0, 0, 0, 1, 0, 2, 0, 0, 1, 0, 2],
//   [1, 3, 0, 0, 2, 1, 2, 0, 0, 2, 0, 0],
//   [1, 1, 0, 0, 0, 1, 2, 0, 2, 1, 0, 1],
//   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3],
//   [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 2, 1],
//   [0, 0, 0, 1, 0, 1, 0, 0, 0, 2, 1, 1],
//   [0, 0, 0, 0, 1, 0, 0, 0, 2, 1, 1, 0],
//   [0, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 3],
// ];

let perTimeStepClusterCounts;
let maxClusterSize;
// console.log(data[0]);
const counts = (d) =>
  d.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

function calculateClusterBoxes({
  month,
  monthlyClustering,
  clusterHeightScale,
  xScale,
  yScale,
}) {
  const rectWidth = xScale.bandwidth() * 0.4;

  const monthlyCounts = counts(monthlyClustering);

  const data = Object.entries(monthlyCounts).map(([key, value]) => {
    return {
      month: month,
      cluster: parseInt(key),
      numElements: value,
      x: xScale(month) - rectWidth / 2,
      y:
        // yScale(month)(parseInt(key)) -
        yScale(month).bandwidth() / 2 - clusterHeightScale(value) / 2,
      width: rectWidth,
      height: clusterHeightScale(value),
    };
  });
  return data;
}

function computeClusterPositionModifier({
  yScale,
  prevModifierScale,
  clusterHeightScale,
}) {
  // HH, HL, LH LL

  let modifierScales = {};

  if (prevModifierScale == null) {
    for (let month = 1; month < 13; month += 1) {
      const numClusters = Object.keys(
        perTimeStepClusterCounts[month - 1]
      ).length;
      const scales = {};

      for (let clusterNum = 0; clusterNum < numClusters; clusterNum += 1) {
        let allEnsembleIds;
        if (month == 1) {
          allEnsembleIds = data[month - 1]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const nextClusterA = dataT[ensembleIDA][month];
            const nextClusterB = dataT[ensembleIDB][month];
            return (
              yScale(month + 1)(nextClusterA) - yScale(month + 1)(nextClusterB)
            );
          });
        } else if (month == 12) {
          allEnsembleIds = data[month - 1]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const prevClusterA = dataT[ensembleIDA][month - 2];
            const prevClusterB = dataT[ensembleIDB][month - 2];
            return (
              yScale(month - 1)(prevClusterA) - yScale(month - 1)(prevClusterB)
            );
          });
          // allEnsembleIds.sort(
          //   (a, b) => yScale(month - 1)(a) - yScale(month - 1)(b)
          // );
        } else {
          allEnsembleIds = data[month - 1]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const prevClusterA = dataT[ensembleIDA][month - 2];
            const prevClusterB = dataT[ensembleIDB][month - 2];
            const nextClusterA = dataT[ensembleIDA][month + 0];
            const nextClusterB = dataT[ensembleIDB][month + 0];
            if (
              yScale(month - 1)(prevClusterA) <
                yScale(month - 1)(prevClusterB) &&
              yScale(month + 1)(nextClusterA) < yScale(month + 1)(nextClusterB)
            ) {
              return (
                Math.abs(
                  yScale(month - 1)(prevClusterA) -
                    yScale(month - 1)(prevClusterB)
                ) +
                Math.abs(
                  yScale(month + 1)(nextClusterA) -
                    yScale(month + 1)(nextClusterB)
                )
              );
            } else if (
              yScale(month - 1)(prevClusterA) >
                yScale(month - 1)(prevClusterB) &&
              yScale(month + 1)(nextClusterA) > yScale(month + 1)(nextClusterB)
            ) {
              return -(
                Math.abs(
                  yScale(month - 1)(prevClusterA) -
                    yScale(month - 1)(prevClusterB)
                ) +
                Math.abs(
                  yScale(month + 1)(nextClusterA) -
                    yScale(month + 1)(nextClusterB)
                )
              );
            } else {
              if (
                yScale(month - 1)(prevClusterA) ==
                yScale(month - 1)(prevClusterB)
              ) {
                return (
                  yScale(month + 1)(nextClusterA) -
                  yScale(month + 1)(nextClusterB)
                );
              } else {
                return (
                  yScale(month - 1)(prevClusterA) -
                  yScale(month - 1)(prevClusterB)
                );
              }
            }
          });
        }
        scales[clusterNum] = d3
          .scaleBand()
          .domain(allEnsembleIds)
          .range([
            (-clusterHeightScale(allEnsembleIds.length) / 2) * 0.9,
            (clusterHeightScale(allEnsembleIds.length) / 2) * 0.9,
          ]);
      }
      modifierScales[month] = scales;
    }
  } else {
    modifierScales = { ...prevModifierScale };
    for (let month = 1; month < 13; month += 1) {
      const numClusters = Object.keys(
        perTimeStepClusterCounts[month - 1]
      ).length;

      const scales = {};

      for (let clusterNum = 0; clusterNum < numClusters; clusterNum += 1) {
        let allEnsembleIds;
        if (month == 1) {
          allEnsembleIds = data[month - 1]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);

          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const nextClusterA = dataT[ensembleIDA][month];
            const nextClusterB = dataT[ensembleIDB][month];

            const currentClusterAValue =
              yScale(month)(clusterNum) +
              modifierScales[month][clusterNum](ensembleIDA);
            const currentClusterBValue =
              yScale(month)(clusterNum) +
              modifierScales[month][clusterNum](ensembleIDB);

            const nextClusterAValue =
              yScale(month + 1)(nextClusterA) +
              modifierScales[month + 1][nextClusterA](ensembleIDA);
            const nextClusterBValue =
              yScale(month + 1)(nextClusterB) +
              modifierScales[month + 1][nextClusterB](ensembleIDB);

            return nextClusterAValue - nextClusterBValue;
          });
        } else if (month == 12) {
          allEnsembleIds = data[month - 1]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const prevClusterA = dataT[ensembleIDA][month - 2];
            const prevClusterB = dataT[ensembleIDB][month - 2];
            return (
              yScale(month - 1)(prevClusterA) +
              modifierScales[month - 1][prevClusterA](ensembleIDA) -
              (yScale(month - 1)(prevClusterB) +
                modifierScales[month - 1][prevClusterB](ensembleIDB))
            );
          });
          // allEnsembleIds.sort(
          //   (a, b) => yScale(month - 1)(a) - yScale(month - 1)(b)
          // );
        } else {
          allEnsembleIds = data[month - 1]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const prevClusterA = dataT[ensembleIDA][month - 2];
            const prevClusterB = dataT[ensembleIDB][month - 2];
            const nextClusterA = dataT[ensembleIDA][month + 0];
            const nextClusterB = dataT[ensembleIDB][month + 0];

            const prevClusterAValue =
              yScale(month - 1)(prevClusterA) +
              modifierScales[month - 1][prevClusterA](ensembleIDA);
            const prevClusterBValue =
              yScale(month - 1)(prevClusterB) +
              modifierScales[month - 1][prevClusterB](ensembleIDB);
            const nextClusterAValue =
              yScale(month + 1)(nextClusterA) +
              modifierScales[month + 1][nextClusterA](ensembleIDA);
            const nextClusterBValue =
              yScale(month + 1)(nextClusterB) +
              modifierScales[month + 1][nextClusterB](ensembleIDB);

            if (
              prevClusterAValue < prevClusterBValue &&
              nextClusterAValue < nextClusterBValue
            ) {
              return -(
                Math.abs(prevClusterAValue - prevClusterBValue)
                // Math.abs(nextClusterAValue - nextClusterBValue)
              );
            } else if (
              prevClusterAValue > prevClusterBValue &&
              nextClusterAValue > nextClusterBValue
            ) {
              return Math.abs(prevClusterAValue - prevClusterBValue);
              // Math.abs(nextClusterAValue - nextClusterBValue)
            } else {
              // if (prevClusterAValue == prevClusterBValue) {
              //   return nextClusterAValue - nextClusterBValue;
              // } else {
              return prevClusterAValue - prevClusterBValue;
              return nextClusterAValue - nextClusterBValue;
              return -(
                Math.abs(prevClusterAValue - prevClusterBValue) +
                Math.abs(nextClusterAValue - nextClusterBValue)
              );
              // }
            }
          });
        }
        scales[clusterNum] = d3
          .scaleBand()
          .domain(allEnsembleIds)
          .range([
            (-clusterHeightScale(allEnsembleIds.length) / 2) * 0.7,
            (clusterHeightScale(allEnsembleIds.length) / 2) * 0.7,
          ]);
      }
      modifierScales[month] = scales;
    }
  }

  return modifierScales;
}

function getPath({ controlPoints, xScale }) {
  const rectWidth = xScale.bandwidth() * 0.4 * 0.5;
  const path = d3.path();
  const distBetweenRect = xScale.step() - xScale.bandwidth();

  path.moveTo(controlPoints[0].x - rectWidth, controlPoints[0].y);
  path.lineTo(controlPoints[0].x + rectWidth, controlPoints[0].y);
  for (let i = 1; i < controlPoints.length; i++) {
    // path.lineTo(controlPoints[i].x - rectWidth, controlPoints[i].y);
    path.quadraticCurveTo(
      // controlPoints[i - 1].x + rectWidth + distBetweenRect * 2,
      controlPoints[i - 1].x +
        (controlPoints[i].x - controlPoints[i - 1].x) / 3,
      controlPoints[i - 1].y,
      (controlPoints[i - 1].x + controlPoints[i].x) / 2,
      (controlPoints[i - 1].y + controlPoints[i].y) / 2
    );
    path.quadraticCurveTo(
      // controlPoints[i - 1].x + rectWidth + distBetweenRect * 2,
      controlPoints[i].x - (controlPoints[i].x - controlPoints[i - 1].x) / 3,
      controlPoints[i].y,
      controlPoints[i].x - rectWidth,
      controlPoints[i].y
    );
    path.lineTo(controlPoints[i].x + rectWidth, controlPoints[i].y);
  }
  return path.toString();
}

onMounted(() => {
  getData().then(() => {
    nextTick(() => {
      const element = document.getElementById("timelineSVG");
      if (element) {
        drawTimeline();
      }
    });
  });
});

function drawTimeline() {
  // const WIDTH = document.getElementById("timelineContainer").clientWidth;
  // const HEIGHT = document.getElementById("timelineContainer").clientHeight;
  const WIDTH = document.getElementById("timelineSVG").clientWidth;
  const HEIGHT = document.getElementById("timelineSVG").clientHeight;
  console.log("DEBUG: WIDTH ", WIDTH, " HEIGHT ", HEIGHT);
  const MARGIN = 40;

  const svg = d3
    .select("#timelineSVG")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

  // add a x-axis legend for months
  const xScale = d3
    .scaleBand()
    .domain(d3.range(1, 13))
    // .range([MARGIN, WIDTH - MARGIN]);
    .range([MARGIN, WIDTH - MARGIN]);
  svg
    .append("g")
    .attr("transform", `translate(0, ${HEIGHT - MARGIN * 2})`)
    .call(
      d3
        .axisBottom(xScale)
        .tickFormat((d) => `Month ${d}, #C: ${monthlyMDS[parseInt(d)].length}`)
    );
  svg
    .append("text")
    .attr("x", WIDTH / 2)
    .attr("y", HEIGHT - 10)
    .attr("text-anchor", "middle")
    .text("Months");
  // add a y-axis legend for clusters:
  /**
   * @param {number} month is from 1 to 12
   */
  const yScale = (month) => {
    return d3
      .scaleBand()
      .domain(d3.range(Object.keys(perTimeStepClusterCounts[month - 1]).length))
      .range([MARGIN, HEIGHT - MARGIN])
      .padding(0.1);
  };
  // const yScale = (month) => {
  //   return (clusterId) =>
  //     d3
  //       .scaleLinear()
  //       .domain([-100, 100])
  //       .range([
  //         MARGIN + (HEIGHT - 2 * MARGIN) * 0.2,
  //         HEIGHT - MARGIN - (HEIGHT - 2 * MARGIN) * 0.2,
  //       ])(monthlyMDS[month][clusterId]);
  //   // .padding(0.1);
  // };

  // const yScale = d3
  //   .scaleBand()
  //   .domain(d3.range(4))
  //   .range([MARGIN, HEIGHT - MARGIN])
  //   .padding(0.1);
  // svg
  //   .append("g")
  //   .call(d3.axisLeft(yScale).tickFormat((d) => d))
  //   .attr("transform", `translate(${MARGIN}, 0)`);
  // svg
  //   .append("text")
  //   .attr("y", 15)
  //   .attr("x", -HEIGHT / 2)
  //   .attr("text-anchor", "middle")
  //   .attr("transform", "rotate(-90)")
  //   .text("Clusters");

  const clusterHeightScale = d3
    .scaleLinear()
    .domain([0, maxClusterSize])
    // .range([20, 150]);
    .range([yScale(1).bandwidth() / 10, yScale(1).bandwidth()]);

  // Twice to optimize the timeline
  let modifierScales = computeClusterPositionModifier({
    yScale: yScale,
    prevModifierScale: null,
    clusterHeightScale: clusterHeightScale,
  });
  modifierScales = computeClusterPositionModifier({
    yScale: yScale,
    prevModifierScale: modifierScales,
    clusterHeightScale: clusterHeightScale,
  });

  let pathData = [];
  for (let ensembleID = 0; ensembleID < dataT.length; ensembleID++) {
    const clusterHistory = dataT[ensembleID];
    const controlPoints = clusterHistory.map((d, month) => {
      let currentCluster = d;
      return {
        x: xScale(month + 1),
        y:
          // yScale(month + 1)(d) +
          yScale(month + 1).bandwidth() / 2 +
          modifierScales[month + 1][currentCluster](ensembleID) +
          modifierScales[month + 1][currentCluster].bandwidth() / 2,
      };
    });
    // console.log("DEBUG: CONTROLPOINTS ", controlPoints);
    const pathString = getPath({
      controlPoints: controlPoints,
      xScale: xScale,
    });
    pathData.push({
      index: ensembleID,
      path: pathString,
      cluster: clusterHistory,
    });
  }
  // for (let i = 0; i < data[0].length; i++) {
  //   const pathString = getPath(
  //     data.map((d, index) => {
  //       let currentCluster = d[i];
  //       console.log("DEBUG: CURRENTCLUSTER ", currentCluster);
  //       let positionModifier = 0;

  //       let sizeCurrentCluster = data
  //         .map((d) => d[i])
  //         .filter((d) => d === currentCluster).length;

  //       data.slice(0, index).forEach((d) => {
  //         if (d[i] === currentCluster) {
  //           positionModifier += 1;
  //         }
  //       });
  //       console.log("DEBUG: POSITIONMODIFIER ", positionModifier);

  //       let positionModifierScale = d3
  //         .scaleLinear()
  //         .domain([0, sizeCurrentCluster])
  //         .range([
  //           yScale(d[i]) +
  //             yScale.bandwidth() / 2 -
  //             clusterHeightScale(maxClusterSize),
  //           yScale(d[i]) +
  //             yScale.bandwidth() / 2 +
  //             clusterHeightScale(maxClusterSize),
  //         ]);

  //       return {
  //         x: xScale(index + 1),
  //         y: yScale(d[i]) + yScale.bandwidth() / 2,
  //         // positionModifierScale(positionModifier),
  //       };
  //     })
  //   );
  //   pathData.push({ index: i, path: pathString });
  // }

  for (let i = 1; i < 13; i++) {
    let temp = calculateClusterBoxes({
      month: i,
      monthlyClustering: data[i - 1],
      clusterHeightScale,
      xScale,
      yScale,
    });
    svg
      .selectAll(`rect${i}`)
      .data(temp)
      .join("rect")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      // .attr("fill", (d) => colors[d.cluster])
      .attr("fill", (d) => "darkgrey")
      .attr("fill-opacity", 0.5)
      .attr("transform", `translate(${xScale.bandwidth() / 2}, ${0})`)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "black");
        d3.selectAll("path")
          // Filter elements based on the stroke-width attribute
          .filter(function () {
            return (
              d3.select(this).datum() &&
              d3.select(this).datum()["cluster"][d.month - 1] === d.cluster
            );
          })
          .attr("stroke-width", 2);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", "darkgrey");
        d3.selectAll("path")
          // Filter elements based on the stroke-width attribute
          .filter(function () {
            return (
              d3.select(this).datum() &&
              d3.select(this).datum()["cluster"][d.month - 1] === d.cluster
            );
          })
          .attr("stroke-width", 1);
      });
  }
  svg
    .selectAll("clusterPath")
    .data(pathData)
    .join("path")
    .attr("d", (d) => d.path)
    .attr("fill", "none")
    .attr(
      "stroke",
      (d) => {
        if (fileNames[d.index].includes("historical_r")) {
          return "steelblue";
        }
        if (fileNames[d.index].includes("ssp370_r")) {
          return "crimson";
        }
        if (fileNames[d.index].includes("ssp585_r")) {
          return "forestgreen";
        }
      }
      //   fileNames[d.index].includes("historical_r") ? "steelblue" : "crimson")
      // // fileNames[d.index].includes("historical_r") ? "none" : "steelblue"
    )
    .attr("stroke-dasharray", (d) =>
      fileNames[d.index].includes("historical_r") ? "10,10" : "0"
    )
    .attr("stroke-width", (d) => {
      if (fileNames[d.index].includes("historical_r")) {
        return 1;
      }
      if (fileNames[d.index].includes("ssp370_r")) {
        return 1;
      }
      if (fileNames[d.index].includes("ssp585_r")) {
        return 1;
      }
    })
    .attr("stroke-opacity", 1)
    .attr("transform", `translate(${xScale.bandwidth() / 2}, ${0})`)
    .attr("clusterHistory", (d) => d.clusterHistory)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke-width", 5);
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("stroke-width", 1);
    })
    .on("click", function (event, d) {
      showTooltip.value = true;
      tooltipData.value = `${fileNames[d.index].split("_")[7]} ${
        fileNames[d.index].split("_")[6]
      }`;
      document
        .getElementById("tooltip")
        ?.style.setProperty("top", `${event.clientY}px`);
      document
        .getElementById("tooltip")
        ?.style.setProperty("left", `${event.clientX}px`);
    });
}
async function getData() {
  for (let month = 1; month < 13; month += 1) {
    const { distances } = await API.fetchData("distance_matrix", true, {
      files: sspAllLabels,
      nodeMap: "CMIP6_pr_delta_historical_S5L0.02_umap_mapping.json",
      subsetType: "month",
      months: [month],
      years: [-1],
    });
    const { clustering } = await API.fetchData("run_clustering", true, {
      distance_matrix: distances,
      threshold: 130,
    });
    data.push(clustering);
  }
  sspAllLabels.forEach((model, i) => {
    dataT.push(data.map((d) => d[i]));
  });
  perTimeStepClusterCounts = data.map((d) => {
    return d.reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  });
  maxClusterSize = Math.max(
    ...data.map((d) => {
      return Math.max(...Object.values(counts(d)));
    })
  );
  console.log("DEBUG: DATA ", data);
}
const arrToI = (i) => Array.from({ length: i }, (_, index) => index);
</script>
