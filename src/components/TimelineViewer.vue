<template>
  <div id="timelineContainer" class="relative h-full w-full">
    <div
      class="absolute left-0 top-0 w-fit z-[2] h-fit text-black text-lg flex flex-row justify-normal items-center"
    >
      <Dropdown
        v-model="selectedModel"
        :options="models"
        optionLabel="name"
        class="m-2"
        placeholder="Select a Model"
      />
      <Button
        @click="selectedModel = null"
        icon="pi pi-times"
        class="m-2 p-2 bg-red-200 aspect-square w-fit h-fit flex flex-row justify-normal items-center"
      />

      <Dropdown
        v-model="selectedType"
        :options="types"
        optionLabel="name"
        class="m-2"
        placeholder="Select a Type"
      />
      <Button
        @click="selectedType = null"
        icon="pi pi-times"
        class="m-2 p-2 bg-red-200 aspect-square w-fit h-fit flex flex-row justify-normal items-center"
      />
      <ToggleButton
        v-model="isShowingClusterMean"
        @change="toggleIsShowingClusterMean"
        onLabel="Color by cluster means"
        offLabel="Remove cluster means color"
      />
    </div>
    <TooltipView
      id="tooltip"
      v-if="showTooltip"
      :members="selectedTimelineCluster"
      :month="selectedTimelineClusterMonth"
      @close-card="showTooltip = false"
      class="absolute bg-white border border-gray-300 shadow-lg rounded-lg text-black bottom-0 right-0"
    />
    <div
      id="timelineSVG"
      class="w-full h-full text-black flex justify-around"
    ></div>
    <div v-if="isRecalculatingTimeline" class="overlay">
      <div class="overlay-text">Recalculating Timeline...</div>
    </div>
  </div>
  <div
    id="tooltipText"
    v-show="showTooltipText"
    @click="showTooltipText = false"
    class="absolute bg-white border border-gray-300 shadow-lg rounded-lg p-2 text-black"
  >
    {{ tooltipData }}
  </div>
</template>

<script setup lang="ts">
import * as d3 from "d3";
import API from "@/api/api";
import { onMounted, ref, inject, reactive, watch, nextTick } from "vue";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";
import TooltipView from "./TooltipView.vue";
import { dataset_name, timeType } from "./utils/utils";

import ToggleButton from "primevue/togglebutton";

import { sspAllLabels, months } from "./utils/utils";
import { useStore } from "@/store/main";
import { storeToRefs } from "pinia";

const store = useStore();
const showTooltip = ref(false);
const showTooltipText = ref(false);
const selectedTimelineCluster = ref([]);
const selectedTimelineClusterMonth = ref(-1);

const isMDS = ref(true);
const isShowingClusterMean = ref(true);
const isRecalculatingTimeline = ref(false);

const splitterResized = inject("splitterResized");

const selectedModel = ref();
const selectedType = ref();
const tooltipData = ref();

// let monthList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
let monthListOriginal = [1, 2, 3, 4, 5, 10, 11, 12];
// let monthListOriginal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
let monthList = [10, 11, 12, 1, 2, 3, 4, 5];

function toggleIsShowingClusterMean() {
  d3.selectAll("rect")
    .filter(function () {
      return (
        d3.select(this)?.attr("id") &&
        d3.select(this).attr("id").startsWith("clusterRect")
      );
    })
    .classed("grey-rect", isShowingClusterMean.value);
}

watch(selectedModel, (value) => {
  if (value == null) {
    d3.selectAll("path")
      .filter(function () {
        return (
          d3.select(this)?.attr("id") &&
          d3.select(this).attr("id").startsWith("clusterPath")
        );
      })
      .classed("not-selected", false)
      .classed("selected", false);
    return;
  }

  d3.selectAll("path")
    .filter(function () {
      return (
        d3.select(this)?.attr("id") &&
        d3.select(this).attr("id").startsWith("clusterPath")
      );
    })
    .classed("not-selected", true)
    .classed("selected", false);
  d3.selectAll("path")
    // Filter elements based on the stroke-width attribute
    .filter(function () {
      return (
        d3.select(this).datum() &&
        members[d3.select(this).datum()["index"]] &&
        members[d3.select(this).datum()["index"]].model_name == value.name
      );
    })
    .classed("not-selected", false)
    .classed("selected", true);
});

watch(selectedType, (value) => {
  if (value == null) {
    d3.selectAll("path")
      .filter(function () {
        return (
          d3.select(this)?.attr("id") &&
          d3.select(this).attr("id").startsWith("clusterPath")
        );
      })
      .classed("not-selected", false)
      .classed("selected", false);
    return;
  }

  d3.selectAll("path")
    .filter(function () {
      return (
        d3.select(this)?.attr("id") &&
        d3.select(this).attr("id").startsWith("clusterPath")
      );
    })
    .classed("not-selected", true)
    .classed("selected", false);
  d3.selectAll("path")
    // Filter elements based on the stroke-width attribute
    .filter(function () {
      return (
        d3.select(this).datum() &&
        members[d3.select(this).datum()["index"]] &&
        members[d3.select(this).datum()["index"]].ssp == value.name
      );
    })
    .classed("not-selected", false)
    .classed("selected", true);
});

onMounted(() => {
  const { getMapEditFlag } = storeToRefs(store);
  watch(
    getMapEditFlag,
    () => {
      draw();
    },
    { immediate: true }
  );
  watch(splitterResized, () => {
    // remove the svg
    const element = document.getElementById("timelineSVG");
    if (element) {
      element.innerHTML = "";
      drawTimeline();
    }
  });
});

function draw() {
  isRecalculatingTimeline.value = true;
  getData().then(() => {
    nextTick(() => {
      const element = document.getElementById("timelineSVG");
      if (element) {
        drawTimeline();
      }
    });
    isRecalculatingTimeline.value = false;
  });
}

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
const members = sspAllLabels;
const models = ref(
  Array.from(new Set(members.map((member) => member.model_name))).map(
    (model) => {
      return { name: model };
    }
  )
);
const types = ref(
  Array.from(new Set(members.map((member) => member.ssp))).map((type) => {
    return { name: type };
  })
);
console.log("DEBUG: MODELS ", members, models);

const data = reactive({}); // data[i][j] is the clustering for month i, member j
const dataT = reactive({}); // dataT[i][j] is the clustering for ensemble i, month j
let monthlyMDS = reactive({}); // monthlyMDS[i] is the MDS for month i

let perTimeStepClusterCounts = {};
let maxClusterSize;
// console.log(data[0]);
const counts = (d) =>
  d.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

async function calculateClusterBoxes({
  month,
  monthlyClustering,
  clusterHeightScale,
  xScale,
  yScale,
}) {
  const rectWidth = xScale.bandwidth() * 0.4;

  const monthlyCounts = counts(monthlyClustering);

  const data = await Promise.all(
    Object.entries(monthlyCounts).map(async ([key, value]) => {
      // const prefix = "CMIP6_pr_delta_historical_S5L0.02_30x30_";
      const memberFileNames = monthlyClustering
        .map((cluster, index) => {
          return cluster === parseInt(key) ? index : -1;
        })
        .filter((d) => d !== -1)
        .map((d) => members[d]);
      //   .map((d) => members[d]) // remove prefix
      //   .map((d) => d.slice(prefix.length));

      const { means } = await API.fetchData("get_all_means", true, {
        dataset_type: dataset_name,
        members: memberFileNames,
        months: [month],
        years: [-1],
      });
      // console.log("DEBUG: MEANS ", means, memberFileNames);

      return {
        month: month,
        cluster: parseInt(key),
        numElements: value,
        memberNames: sspAllLabels.map(
          (member) => `${member.model_name}:${member.ssp}:${member.variant}`
        ),
        clusterMean: means,

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
    })
  );
  return data;
}

function computeClusterPositionModifier({ yScale, clusterHeightScale }) {
  // // HH, HL, LH LL
  let modifierScales = {};
  for (let iteration = 0; iteration < 2; iteration += 1) {
    // for (let month = 1; month <= 12; month += 1) {
    for (let i = 0; i < monthList.length; i += 1) {
      let month = monthList[i];
      const numClusters = Object.keys(perTimeStepClusterCounts[month]).length;
      const scales = {};

      let nextMonth = i < monthList.length - 1 ? monthList[i + 1] : null;
      let prevMonth = i > 0 ? monthList[i - 1] : null;

      for (let clusterNum = 0; clusterNum < numClusters; clusterNum += 1) {
        let allEnsembleIds;
        if (i == 0) {
          allEnsembleIds = data[month]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const nextClusterA = dataT[ensembleIDA][nextMonth];
            const nextClusterB = dataT[ensembleIDB][nextMonth];

            let nextClusterAValue = yScale(nextMonth)(nextClusterA);
            let nextClusterBValue = yScale(nextMonth)(nextClusterB);

            if (iteration == 1) {
              nextClusterAValue +=
                modifierScales[nextMonth][nextClusterA](ensembleIDA);
              nextClusterBValue +=
                modifierScales[nextMonth][nextClusterB](ensembleIDB);
            }

            return nextClusterAValue - nextClusterBValue;
          });
        } else if (i == monthList.length - 1) {
          allEnsembleIds = data[month]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const prevClusterA = dataT[ensembleIDA][prevMonth];
            const prevClusterB = dataT[ensembleIDB][prevMonth];

            let prevClusterAValue = yScale(prevMonth)(prevClusterA);
            let prevClusterBValue = yScale(prevMonth)(prevClusterB);

            if (iteration == 1) {
              prevClusterAValue +=
                modifierScales[prevMonth][prevClusterA](ensembleIDA);
              prevClusterBValue +=
                modifierScales[prevMonth][prevClusterB](ensembleIDB);
            }

            return prevClusterAValue - prevClusterBValue;
          });
        } else {
          allEnsembleIds = data[month]
            .map((cluster, ensembleID) =>
              cluster === clusterNum ? ensembleID : -1
            )
            .filter((d) => d !== -1);
          allEnsembleIds.sort((ensembleIDA, ensembleIDB) => {
            const prevClusterA = dataT[ensembleIDA][prevMonth];
            const prevClusterB = dataT[ensembleIDB][prevMonth];
            const nextClusterA = dataT[ensembleIDA][nextMonth];
            const nextClusterB = dataT[ensembleIDB][nextMonth];

            let prevClusterAValue = yScale(prevMonth)(prevClusterA);
            let prevClusterBValue = yScale(prevMonth)(prevClusterB);
            let nextClusterAValue = yScale(nextMonth)(nextClusterA);
            let nextClusterBValue = yScale(nextMonth)(nextClusterB);

            if (iteration == 1) {
              prevClusterAValue +=
                modifierScales[prevMonth][prevClusterA](ensembleIDA);
              prevClusterBValue +=
                modifierScales[prevMonth][prevClusterB](ensembleIDB);
              nextClusterAValue +=
                modifierScales[nextMonth][nextClusterA](ensembleIDA);
              nextClusterBValue +=
                modifierScales[nextMonth][nextClusterB](ensembleIDB);
            }

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
            (-clusterHeightScale(allEnsembleIds.length) / 2) * 0.8,
            (clusterHeightScale(allEnsembleIds.length) / 2) * 0.8,
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

function adjustMDS({
  minDistBetweenMDS,
  yScale,
  clusterHeightScale,
  height,
  margin,
}) {
  // iterate over the monthlyMDS object
  // for (let month = 1; month <= 12; month += 1) {
  for (let i = 0; i < monthList.length; i += 1) {
    let month = monthList[i];
    let mds = monthlyMDS[month];
    // iterate over the clusters in the month
    const sorted = Object.entries(mds).sort((a, b) => {
      let bottomA =
        yScale(month)(parseInt(a[0])) -
        clusterHeightScale(perTimeStepClusterCounts[month][parseInt(a[0])]) / 2;
      let bottomB =
        yScale(month)(parseInt(b[0])) -
        clusterHeightScale(perTimeStepClusterCounts[month][parseInt(b[0])]) / 2;
      return bottomA - bottomB;
      // return a[1] - b[1]
    });
    console.log("DEBUG: SORTED ", month, sorted);
    for (let i = 1; i < sorted.length; i++) {
      const currentCluster = sorted[i];
      const prevCluster = sorted[i - 1];

      const currentClusterBottom =
        yScale(month)(parseInt(currentCluster[0])) -
        clusterHeightScale(
          perTimeStepClusterCounts[month][parseInt(currentCluster[0])]
        ) /
          2;

      const prevClusterTop =
        yScale(month)(parseInt(prevCluster[0])) +
        clusterHeightScale(
          perTimeStepClusterCounts[month][parseInt(prevCluster[0])]
        ) /
          2;

      // This is a conflict - resolve it
      if (currentClusterBottom < prevClusterTop + minDistBetweenMDS) {
        const reverseScale = d3
          .scaleLinear()
          .domain([margin, height - margin])
          .range([-150, 150]);

        // commit the changes
        monthlyMDS[month][parseInt(currentCluster[0])] = reverseScale(
          prevClusterTop +
            clusterHeightScale(
              perTimeStepClusterCounts[month][parseInt(currentCluster[0])]
            ) /
              2 +
            minDistBetweenMDS
        );
        sorted[i][1] = monthlyMDS[month][parseInt(currentCluster[0])];
      }
    }
    // Force the midpoint to be 0
    const [min, max] = d3.extent(monthlyMDS[month]);
    monthlyMDS[month] = monthlyMDS[month].map((d) => d - (max + min) / 2);
  }
}

function checkFlipMDS({ yScale, HEIGHT, MARGIN }) {
  // Do a greedy optimization where we flip the MDS if it reduces the total distance with respect to the previous month
  // for (let month = 2; month <= 12; month += 1) {
  //         allEnsembleIds = data[month - 1]
  //           .map((cluster, ensembleID) =>
  for (let i = 1; i < monthList.length; i += 1) {
    let month = monthList[i];
    let prevMonth = monthList[i - 1];
    const flippedYScale = (month) => {
      return (clusterId) =>
        d3
          .scaleLinear()
          .domain([150, -150])
          .range([
            // MARGIN + (HEIGHT - 2 * MARGIN) * 0.2,
            // HEIGHT - MARGIN - (HEIGHT - 2 * MARGIN) * 0.2,
            MARGIN,
            HEIGHT - MARGIN,
          ])(monthlyMDS[month][clusterId]);
    };

    let totalDistance = 0;
    let totalDistanceFlipped = 0;

    for (
      let ensembleID = 0;
      ensembleID < sspAllLabels.length;
      ensembleID += 1
    ) {
      // Current
      let prevCluster = dataT[ensembleID][prevMonth];
      let currentCluster = dataT[ensembleID][month];

      let prevClusterValueCurrent = yScale(prevMonth)(prevCluster);
      let currentClusterValueCurrent = yScale(month)(currentCluster);

      let prevClusterValueFlipped = yScale(prevMonth)(prevCluster);
      let currentClusterValueFlipped = flippedYScale(month)(currentCluster);

      totalDistance += Math.abs(
        prevClusterValueCurrent - currentClusterValueCurrent
      );
      totalDistanceFlipped += Math.abs(
        prevClusterValueFlipped - currentClusterValueFlipped
      );
    }

    if (totalDistance > totalDistanceFlipped) {
      // Flip the MDS
      console.log("DEBUG: FLIPPING MDS ", month);
      monthlyMDS[month] = monthlyMDS[month].map((d) => -d);
    }
  }
}

async function drawTimeline() {
  const WIDTH = document.getElementById("timelineSVG").clientWidth;
  const HEIGHT = document.getElementById("timelineSVG").clientHeight;

  const clusterHeightMax = HEIGHT / 8;
  const MARGIN = 40;

  const svg = d3
    .select("#timelineSVG")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

  // add a black style class
  svg.append("style").text(`
    .black {
      stroke: black;
    }
    .not-selected {
      stroke: black;
      stroke-opacity: 0.2;
    }
    .selected {
      stroke-opacity: 1 !important;
      stroke-width: 4 !important;
    }
    .path-highlighted {
      stroke-width: 4 !important;
    }
    .path-not-highlighted {
      stroke-opacity: 0.5 !important;
    }
    .selected-rect {
      opacity: 1 !important;
      stroke: crimson !important;
      stroke-opacity: 1 !important;
      stroke-width: 4 !important;
    }
    .grey-rect{
      fill: darkgrey !important;
  `);

  // add a x-axis legend for months
  const xScale = d3
    .scaleBand()
    .domain(monthList)
    // .domain(d3.range(1, 13))
    // .range([MARGIN, WIDTH - MARGIN]);
    .range([MARGIN, WIDTH - MARGIN]);
  svg
    .append("g")
    .attr("transform", `translate(0, ${HEIGHT - MARGIN * 2})`)
    .call(d3.axisBottom(xScale).tickFormat((d) => `${months[d - 1]}`))
    .style("font-size", "large");
  svg
    .append("text")
    .attr("x", WIDTH / 2)
    .attr("y", HEIGHT - 10)
    .style("font-size", "large")
    .attr("text-anchor", "middle")
    .text("Months");

  // const minDistBetweenMDS =
  //   d3
  //     .scaleLinear()
  //     .range([-150, 150])
  //     .domain([MARGIN, HEIGHT - MARGIN])(clusterHeightMax / 2) -
  //   d3
  //     .scaleLinear()
  //     .range([-150, 150])
  //     .domain([MARGIN, HEIGHT - MARGIN])(0);
  let minDistBetweenMDS = 10;

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
        .domain(d3.range(Object.keys(perTimeStepClusterCounts[month]).length))
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

  checkFlipMDS({
    yScale: yScale,
    HEIGHT: HEIGHT,
    MARGIN: MARGIN,
  });

  let modifierScales = computeClusterPositionModifier({
    yScale: yScale,
    clusterHeightScale: clusterHeightScale,
  });

  // Store the order in the timeline to the store
  Object.entries(modifierScales).forEach(([month, scales]) => {
    let clusterOrder = [];
    let scalesSorted = Object.entries(scales).sort((a, b) => {
      const clusterA = parseInt(a[0]);
      const clusterB = parseInt(b[0]);
      return (
        monthlyMDS[parseInt(month)][clusterB] -
        monthlyMDS[parseInt(month)][clusterA]
      );
    });
    console.log("DEBUG: SCALES ", scalesSorted);
    scalesSorted.map(([key, value]) => {
      clusterOrder = [...value.domain(), -parseInt(key + 1), ...clusterOrder];
    });
    // return clusterOrder;
    store.clusterOrders[month] = clusterOrder;
  });
  console.log("DEBUG: MODIFIERSCALES ", modifierScales);

  let pathData = [];
  for (
    let ensembleID = 0;
    ensembleID < Object.values(dataT).length;
    ensembleID++
  ) {
    const clusterHistory = dataT[ensembleID];
    const controlPoints = monthList.map((month) => {
      let index = monthListOriginal.indexOf(month);
      let cluster = clusterHistory[month];
      // console.log("DEBUG: CONTROLPOINTS ", month, index, cluster);
      return {
        x: xScale(month),
        y:
          yScale(month)(cluster) +
          modifierScales[month][cluster](ensembleID) +
          modifierScales[month][cluster].bandwidth() / 2,
      };
    });
    // const controlPoints = Object.entries(clusterHistory).map(([m, cluster]) => {
    //   let month = parseInt(m);
    //   console.log("DEBUG: CONTROLPOINTS ", month, cluster);
    //   return {
    //     x: xScale(month),
    //     y:
    //       yScale(month)(cluster) +
    //       modifierScales[month][cluster](ensembleID) +
    //       modifierScales[month][cluster].bandwidth() / 2,
    //   };
    // });
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
  // console.log("DEBUG: PATHDATA ", pathData);

  let clusterBoxData = {};
  let clusterBoxDataPromise = await Promise.all(
    // arrToI(12, 1).map((month) => {
    monthList.map((month) => {
      return calculateClusterBoxes({
        month: month,
        monthlyClustering: data[month],
        clusterHeightScale: clusterHeightScale,
        xScale: xScale,
        yScale: yScale,
      });
    })
  );
  monthList.forEach((month, index) => {
    clusterBoxData[month] = clusterBoxDataPromise[index];
  });

  let clusterMeanMax = Math.max(
    ...clusterBoxDataPromise.flat().map((i) => i.clusterMean)
  );
  let clusterMeanMin = Math.min(
    ...clusterBoxDataPromise.flat().map((i) => i.clusterMean)
  );
  const meanDivergingScale = d3
    .scaleDiverging()
    .domain([clusterMeanMin, 0, clusterMeanMax])
    .interpolator(d3.interpolateRdBu);

  // for (let i = 1; i <= 12; i++) {
  for (let i = 0; i < monthList.length; i += 1) {
    let month = monthList[i];
    let clusterBoxes = clusterBoxData[month];
    // console.log("DEBUG: CLUSTERBOXES ", clusterBoxes);
    svg
      .selectAll(`rect${i}`)
      .data(clusterBoxes)
      .join("rect")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("id", (d) => `clusterRect${d.month}`)
      .attr("fill", (d) => meanDivergingScale(d.clusterMean))
      .attr("fill-opacity", 0.5)
      .attr("stroke", "black")
      .attr("transform", `translate(${xScale.bandwidth() / 2}, ${0})`)
      .on("mouseover", function (event, d) {
        d3.select(this).classed("selected-rect", true);
        d3.selectAll("path")
          .filter(function () {
            return (
              d3.select(this)?.attr("id") &&
              d3.select(this).attr("id").startsWith("clusterPath")
            );
          })
          .classed("path-not-highlighted", true)
          .classed("path-highlighted", false);
        d3.selectAll("path")
          // Filter elements based on the stroke-width attribute
          .filter(function () {
            return (
              d3.select(this).datum() &&
              d3.select(this).datum()["cluster"][d.month] === d.cluster
            );
          })
          // .attr("stroke-opacity", 1)
          // .attr("stroke-width", 2);
          .classed("path-not-highlighted", false)
          .classed("path-highlighted", true);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).classed("selected-rect", false);
        d3.selectAll("path")
          .filter(function () {
            return (
              d3.select(this)?.attr("id") &&
              d3.select(this).attr("id").startsWith("clusterPath")
            );
          })
          .classed("path-not-highlighted", false)
          .classed("path-highlighted", false);
        // d3.selectAll("path").attr("stroke-opacity", 1).attr("stroke-width", 1);
      })
      .on("click", (event, d) => {
        console.log("DEBUG: CLICK ", d);
        let selected = d.members.map((member) => {
          return {
            model_name: members[member].model_name,
            ssp: members[member].ssp,
            variant: members[member].variant,
          };
        });
        selectedTimelineCluster.value = selected;
        selectedTimelineClusterMonth.value = d.month;
        showTooltip.value = true;
        store.monthsSelected = [d.month];
        store.setFiles({ group1: selected, group2: [] });
      });
  }
  svg
    .selectAll("clusterPath")
    .data(pathData)
    .join("path")
    .attr("d", (d) => d.path)
    .attr("fill", "none")
    .attr("id", (d) => `clusterPath${d.index}`)
    .attr("stroke", (d) => {
      if (members[d.index].ssp == "historical") {
        return "steelblue";
      }
      if (members[d.index].ssp == "ssp245") {
        return "forestgreen";
      }
      if (members[d.index].ssp == "ssp370") {
        return "darkkhaki";
      }
      if (members[d.index].ssp == "ssp585") {
        return "crimson";
      }
    })
    .attr("stroke-dasharray", (d) =>
      members[d.index].ssp == "historical" ? "10,10" : "0"
    )
    .attr("stroke-width", (d) => {
      return 1;
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
      tooltipData.value = `${members[d.index].model_name}:${members[d.index].ssp}`;
      showTooltipText.value = true;
      console.log("DEBUG: Tooltip ", tooltipData.value);
      document
        .getElementById("tooltipText")
        ?.style.setProperty("top", `${event.clientY}px`);
      document
        .getElementById("tooltipText")
        ?.style.setProperty("left", `${event.clientX}px`);
    });

  const pathLegend = [
    { name: "Historical", color: "steelblue", dash: "10,10" },
    { name: "SSP245", color: "forestgreen", dash: "0" },
    { name: "SSP370", color: "darkkhaki", dash: "0" },
    { name: "SSP585", color: "crimson", dash: "0" },
  ];

  const pathLegendGroup = svg
    .append("g")
    .attr("transform", `translate(${WIDTH - MARGIN * 2 - 200}, 50)`);
  pathLegendGroup
    .append("text")
    .text("Path style")
    .attr("alignment-baseline", "before-edge")
    .attr("font-size", "large")
    .attr("font-weight", "bold");
  const pathLegendItems = pathLegendGroup
    .selectAll("g")
    .data(pathLegend)
    .enter()
    .append("g");

  pathLegendItems
    .append("line")
    .attr("x1", 0)
    .attr("x2", 50)
    .attr("y1", (d, i) => i * 20 + 30)
    .attr("y2", (d, i) => i * 20 + 30)
    .attr("stroke", (d) => d.color)
    .attr("stroke-dasharray", (d) => d.dash);

  pathLegendItems
    .append("text")
    .attr("x", 70)
    .attr("y", (d, i) => i * 20 + 30)
    .text((d) => d.name)
    .attr("alignment-baseline", "central");

  const rectLegend = arrToI(7).map((i) => {
    let adjustedI = i - 3;

    let value =
      adjustedI < 0
        ? d3.interpolate(0, clusterMeanMin)(-adjustedI / 3)
        : d3.interpolate(0, clusterMeanMax)(adjustedI / 3);
    // format number as a string in scientific notation
    return {
      name: value.toExponential(2),
      color: meanDivergingScale(value),
    };
  });

  const rectLegendGroup = svg
    .append("g")
    .attr("transform", `translate(${WIDTH - MARGIN * 2 - 500}, 50)`);

  rectLegendGroup
    .append("text")
    .text("Mean Δhistorical (kg/m^2/s)")
    .attr("alignment-baseline", "before-edge")
    .attr("font-size", "large")
    .attr("font-weight", "bold");

  const rectLegendItems = rectLegendGroup
    .selectAll("g")
    .data(rectLegend)
    .enter()
    .append("g");

  rectLegendItems
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20 + 30)
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", (d) => d.color);

  rectLegendItems
    .append("text")
    .attr("x", 30)
    .attr("y", (d, i) => i * 20 + 30 + 15)
    .text((d) => d.name);
  // .attr("alignment-baseline", "before-edge");
}
async function getData() {
  for (let i = 0; i < monthList.length; i += 1) {
    let month = monthList[i];
    const { distances } = await API.fetchData("distance_matrix", true, {
      dataset_type: dataset_name,
      // time_type: (month <= 3 || month >=10) timeType.All,
      time_type: month <= 3 || month >= 10 ? timeType.OctMar : timeType.AprSep,
      members: sspAllLabels,
      subsetType: "month",
      months: [month],
      years: [-1],
    });
    console.log("DEBUG: DISTANCES ", month, distances);
    const { clustering } = await API.fetchData("run_clustering", true, {
      distance_matrix: distances,
      // n_neighbors: 6, // For UMAP
      // n_neighbors: 5, // For UMAP
      n_neighbors: 4, // For UMAP
      // n_neighbors: 3, // For UMAP
      min_cluster_size: 3, // For HDBSCAN
    });
    data[month] = clustering;
    // console.log("DEBUG: CLUSTERING ", month, clustering);

    const { MDSClusterEmbedding } = await API.fetchData("run_MDS", true, {
      distance_matrix: distances,
      clustering: clustering,
    });
    // Force the midpoint to be 0
    monthlyMDS[month] = MDSClusterEmbedding == 0 ? [0] : MDSClusterEmbedding;
    // console.log("DEBUG: MDS ", month, MDSClusterEmbedding);
  }
  sspAllLabels.forEach((model, i) => {
    dataT[i] = {};
    monthList.forEach((month, j) => {
      dataT[i][month] = data[month][i];
    });
    // dataT.push(data.map((d) => d[i]));
  });
  monthList.forEach((month, i) => {
    perTimeStepClusterCounts[month] = data[month].reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  });
  // perTimeStepClusterCounts = data
  // .map((d) => {
  //   return d.reduce((acc, value) => {
  //     acc[value] = (acc[value] || 0) + 1;
  //     return acc;
  //   }, {});
  // });
  // console.log("DEBUG: PER TIMESTEP CLUSTER COUNTS ", perTimeStepClusterCounts);
  maxClusterSize = Math.max(
    ...Object.values(data).map((d) => {
      return Math.max(...Object.values(counts(d)));
    })
  );
  // console.log("DEBUG: DATA ", data);
  // console.log("DEBUG: DATA T ", dataT);
  // console.log("DEBUG MDS: ", monthlyMDS);
}
// const arrToI = (i, start=) => Array.from({ length: i }, (_, index) => index);
function arrToI(i, start = 0) {
  return Array.from({ length: i }, (_, index) => index + start);
}
</script>
