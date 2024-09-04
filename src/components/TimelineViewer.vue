<template>
  <div id="timelineContainer" class="relative h-full w-full">
    <Dropdown
      v-model="selectedModel"
      :options="models"
      optionLabel="name"
      placeholder="Select a Model"
      class="absolute left-0 top-0 w-fit z-[2] bg-gray-200 m-4 text-black text-lg"
    />
    <!-- <div
      id="tooltip"
      v-show="showTooltip"
      class="absolute bg-white border border-gray-300 shadow-lg rounded-lg p-2 text-black"
    >
      {{ tooltipData }}
    </div> -->
    <TooltipView
      id="tooltip"
      v-if="showTooltip"
      :members="selectedTimelineCluster"
      @close-card="showTooltip = false"
      class="absolute bg-white border border-gray-300 shadow-lg rounded-lg text-black bottom-0 right-0"
    />
    <div id="timelineSVG" class="w-full h-full text-black"></div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from "d3";
import API from "@/api/api";
import { onMounted, ref, reactive, watch, nextTick } from "vue";
import Dropdown from "primevue/dropdown";
import TooltipView from "./TooltipView.vue";
import { sspAllLabels } from "./utils/utils";

const showTooltip = ref(false);
const tooltipData = ref("");
const selectedTimelineCluster = ref([]);
const isMDS = ref(true);

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
const fileNames = sspAllLabels;
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

// const monthlyMDS = {
//   1: [-60.48460452386658, 60.48460452386658],
//   2: [
//     -58.35699554933664, 22.082520836554114, -84.31039378515354,
//     120.58486846890054,
//   ],
//   3: [-58.99908299309351, 58.99908299309351],
//   4: [-52.76784974875045, 52.76784974875045],
//   5: [-3.8243457595546873, -62.45500571775372, 66.27935148202184],
//   6: [35.90798359834169, 0.7258520588195637, -36.63383565308662],
//   7: [
//     -15.034233972736136, 34.9318640088883, -72.17780389521027,
//     52.28017385896895,
//   ],
//   8: [-28.91615066005589, 28.91615066005589],
//   9: [
//     -52.499638886043215, 68.8565399612014, 10.615661527484376,
//     -26.97256260014477,
//   ],
//   10: [69.11744244437034, 2.82353971038528, -71.94098217317824],
//   11: [74.07991469889366, -1.0163887348363057, -73.06352596908818],
//   12: [
//     -74.08971868558595, 78.70062893531168, 12.386626041040053,
//     -16.997536311258227,
//   ],
// };

const data = reactive([]); // data[i] is the clustering for month i
const dataT = reactive([]); // dataT[i] is the clustering for ensemble i
let monthlyMDS = reactive({}); // monthlyMDS[i] is the MDS for month i

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
      members: monthlyClustering
        .map((cluster, index) => {
          return cluster === parseInt(key) ? index : -1;
        })
        .filter((d) => d !== -1),
      x: xScale(month) - rectWidth / 2,
      y:
        yScale(month)(parseInt(key)) -
        // yScale(month).bandwidth() / 2 -
        clusterHeightScale(value) / 2,
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
            } else {
              return prevClusterAValue - prevClusterBValue;
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

function adjustMDS({
  minDistBetweenMDS,
  yScale,
  clusterHeightScale,
  height,
  margin,
}) {
  // iterate over the monthlyMDS object
  for (let month = 1; month < 13; month += 1) {
    let mds = monthlyMDS[month];
    // iterate over the clusters in the month
    const sorted = Object.entries(mds).sort((a, b) => {
      let bottomA =
        yScale(month)(parseInt(a[0])) -
        clusterHeightScale(
          perTimeStepClusterCounts[month - 1][parseInt(a[0])]
        ) /
          2;
      let bottomB =
        yScale(month)(parseInt(b[0])) -
        clusterHeightScale(
          perTimeStepClusterCounts[month - 1][parseInt(b[0])]
        ) /
          2;
      return bottomA - bottomB;
      // return a[1] - b[1]
    });
    console.log("DEBUG: SORTED ", month, sorted);
    for (let i = 1; i < sorted.length; i++) {
      const currentCluster = sorted[i];
      const prevCluster = sorted[i - 1];

      if (month == 8) {
        console.log(
          "DEBUG CURRENT: ",
          month,
          currentCluster[0],
          currentCluster[1]
        );
        console.log("DEBUG PREV: ", month, prevCluster[0], prevCluster[1]);
      }
      // console.log("DEBUG: ", month, prevCluster[1]);

      const currentClusterBottom =
        yScale(month)(parseInt(currentCluster[0])) -
        clusterHeightScale(
          perTimeStepClusterCounts[month - 1][parseInt(currentCluster[0])]
        ) /
          2;

      const prevClusterTop =
        yScale(month)(parseInt(prevCluster[0])) +
        clusterHeightScale(
          perTimeStepClusterCounts[month - 1][parseInt(prevCluster[0])]
        ) /
          2;

      // This is a conflict - resolve it
      if (currentClusterBottom < prevClusterTop + 20) {
        const reverseScale = d3
          .scaleLinear()
          .domain([margin, height - margin])
          .range([-150, 150]);

        // commit the changes
        monthlyMDS[month][parseInt(currentCluster[0])] = reverseScale(
          prevClusterTop +
            clusterHeightScale(
              perTimeStepClusterCounts[month - 1][parseInt(currentCluster[0])]
            ) /
              2 +
            20
        );

        sorted[i][1] = monthlyMDS[month][parseInt(currentCluster[0])];
        console.log("DEBUG: ADJUSTED ", month, currentCluster, sorted[i][1]);
      }
    }
    // Force the midpoint to be 0
    const [min, max] = d3.extent(monthlyMDS[month]);
    monthlyMDS[month] = monthlyMDS[month].map((d) => d - (max + min) / 2);
  }
}

function drawTimeline() {
  const WIDTH = document.getElementById("timelineSVG").clientWidth;
  const HEIGHT = document.getElementById("timelineSVG").clientHeight;

  const clusterHeightMax = HEIGHT / 10;
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

  const minDistBetweenMDS =
    d3
      .scaleLinear()
      .range([-150, 150])
      .domain([MARGIN, HEIGHT - MARGIN])(clusterHeightMax) -
    d3
      .scaleLinear()
      .range([-150, 150])
      .domain([MARGIN, HEIGHT - MARGIN])(0);

  // add a y-axis legend for clusters:
  /**
   * @param {number} month is from 1 to 12
   */
  let yScale = (month) => {
    if (isMDS.value) {
      return (clusterId) =>
        d3
          .scaleLinear()
          .domain([-150, 150])
          .range([
            // MARGIN + (HEIGHT - 2 * MARGIN) * 0.2,
            // HEIGHT - MARGIN - (HEIGHT - 2 * MARGIN) * 0.2,
            MARGIN,
            HEIGHT - MARGIN,
          ])(monthlyMDS[month][clusterId]);
    } else {
      return d3
        .scaleBand()
        .domain(
          d3.range(Object.keys(perTimeStepClusterCounts[month - 1]).length)
        )
        .range([MARGIN, HEIGHT - MARGIN])
        .padding(0.1);
    }
  };

  const clusterHeightScale = d3
    .scaleLinear()
    .domain([0, maxClusterSize])
    .range(
      isMDS.value
        ? [10, clusterHeightMax]
        : [yScale(1).bandwidth() / 10, yScale(1).bandwidth()]
    );

  console.log("DEBUG: BEFORE ADJUSTMENT ", monthlyMDS);
  adjustMDS({
    minDistBetweenMDS: minDistBetweenMDS,
    yScale: yScale,
    clusterHeightScale: clusterHeightScale,
    height: HEIGHT,
    margin: MARGIN,
  });
  yScale = (month) => {
    if (isMDS.value) {
      return (clusterId) =>
        d3
          .scaleLinear()
          .domain([-150, 150])
          .range([
            // MARGIN + (HEIGHT - 2 * MARGIN) * 0.2,
            // HEIGHT - MARGIN - (HEIGHT - 2 * MARGIN) * 0.2,
            MARGIN,
            HEIGHT - MARGIN,
          ])(monthlyMDS[month][clusterId]);
    } else {
      return d3
        .scaleBand()
        .domain(
          d3.range(Object.keys(perTimeStepClusterCounts[month - 1]).length)
        )
        .range([MARGIN, HEIGHT - MARGIN])
        .padding(0.1);
    }
  };

  console.log("DEBUG: AFTER ADJUSTMENT ", monthlyMDS);

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
  console.log("DEBUG: MODIFIERSCALES ", modifierScales);

  let pathData = [];
  for (let ensembleID = 0; ensembleID < dataT.length; ensembleID++) {
    const clusterHistory = dataT[ensembleID];
    const controlPoints = clusterHistory.map((currentCluster, month) => {
      return {
        x: xScale(month + 1),
        y:
          yScale(month + 1)(currentCluster) +
          // yScale(month + 1).bandwidth() / 2 +
          modifierScales[month + 1][currentCluster](ensembleID),
        // modifierScales[month + 1][currentCluster].bandwidth() / 2,
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
  console.log("DEBUG: PATHDATA ", pathData);

  for (let i = 1; i < 13; i++) {
    let clusterBoxes = calculateClusterBoxes({
      month: i,
      monthlyClustering: data[i - 1],
      clusterHeightScale,
      xScale,
      yScale,
    });
    console.log("DEBUG: CLUSTERBOXES ", clusterBoxes);
    svg
      .selectAll(`rect${i}`)
      .data(clusterBoxes)
      .join("rect")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      // .attr("fill", (d) => colors[d.cluster])
      .attr("fill", (d) => "darkgrey")
      .attr("fill-opacity", 0.5)
      .attr("stroke", "black")
      .attr("transform", `translate(${xScale.bandwidth() / 2}, ${0})`)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "black");
        d3.selectAll("path").attr("stroke-opacity", 0.2);
        d3.selectAll("path")
          // Filter elements based on the stroke-width attribute
          .filter(function () {
            return (
              d3.select(this).datum() &&
              d3.select(this).datum()["cluster"][d.month - 1] === d.cluster
            );
          })
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 2);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", "darkgrey");
        d3.selectAll("path").attr("stroke-opacity", 1).attr("stroke-width", 1);
      })
      .on("click", (event, d) => {
        selectedTimelineCluster.value = d.members.map((member) => {
          return {
            model_name: fileNames[member].split("_")[6],
            ssp: fileNames[member].split("_")[7],
            variant: fileNames[member].split("_")[8],
          };
        });
        // tooltipData.value = `Cluster: ${d.cluster}, Num Elements: ${d.numElements}`;

        showTooltip.value = true;
        console.log(
          "DEBUG: CLUSTER CLICK ",
          d.cluster,
          " NUM ELEMENTS ",
          d.numElements
        );
      });
  }
  svg
    .selectAll("clusterPath")
    .data(pathData)
    .join("path")
    .attr("d", (d) => d.path)
    .attr("fill", "none")
    .attr("stroke", (d) => {
      if (fileNames[d.index].includes("historical_r")) {
        return "steelblue";
      }
      if (fileNames[d.index].includes("ssp245_r")) {
        return "darkkhaki";
      }
      if (fileNames[d.index].includes("ssp370_r")) {
        return "crimson";
      }
      if (fileNames[d.index].includes("ssp585_r")) {
        return "forestgreen";
      }
    })
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
    });
  // .on("click", function (event, d) {

  //   tooltipData.value = `${fileNames[d.index].split("_")[7]} ${
  //     fileNames[d.index].split("_")[6]
  //   }`;
  //   document
  //     .getElementById("tooltip")
  //     ?.style.setProperty("top", `${event.clientY}px`);
  //   document
  //     .getElementById("tooltip")
  //     ?.style.setProperty("left", `${event.clientX}px`);
  // });
}
async function getData() {
  for (let month = 1; month < 13; month += 1) {
    // for (let month = 1; month < 2; month += 1) {
    const { distances } = await API.fetchData("distance_matrix", true, {
      files: sspAllLabels,
      subsetType: "month",
      months: [month],
      years: [-1],
    });
    console.log("DEBUG: DISTANCES ", month, distances);
    const { clustering } = await API.fetchData("run_clustering", true, {
      distance_matrix: distances,
      linkage_method: "average",
      threshold: 250,
    });
    data.push(clustering);
    console.log("DEBUG: CLUSTERING ", month, clustering);

    const { MDSClusterEmbedding } = await API.fetchData("run_MDS", true, {
      distance_matrix: distances,
      clustering: clustering,
    });
    // Force the midpoint to be 0
    const [max, min] = d3.extent(MDSClusterEmbedding);
    monthlyMDS[month] = MDSClusterEmbedding == 0 ? [0] : MDSClusterEmbedding;
    console.log("DEBUG: MDS ", month, MDSClusterEmbedding);
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
  console.log("DEBUG: PER TIMESTEP CLUSTER COUNTS ", perTimeStepClusterCounts);
  maxClusterSize = Math.max(
    ...data.map((d) => {
      return Math.max(...Object.values(counts(d)));
    })
  );
  console.log("DEBUG: DATA ", data);
  console.log("DEBUG: DATA T ", dataT);
  console.log("DEBUG MDS: ", monthlyMDS);
}
const arrToI = (i) => Array.from({ length: i }, (_, index) => index);
</script>
