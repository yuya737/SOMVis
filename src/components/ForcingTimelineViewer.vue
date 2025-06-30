<template>
  <div id="timelineContainer" class="relative h-full w-full">
    <div
      class="absolute left-0 top-0 z-[2] flex h-fit w-full flex-row items-center justify-normal text-lg text-black"
    >
      <div
        class="m-2 max-w-[33%] rounded-lg bg-gray-100 p-2 text-sm text-gray-800"
      >
        Forcing clustering per month - GCMs are clustering based on its forcing
        from <kbd>historical</kbd> to <kbd>{{ selectedType }}</kbd
        >. Pick on the right.
      </div>
      <Dropdown
        v-model="selectedType"
        :options="['ssp245', 'ssp370', 'ssp585']"
        class="m-2"
        placeholder="Select a Type"
      />
      <Button
        @click="selectedType = null"
        icon="pi pi-times"
        class="m-2 flex aspect-square h-fit w-fit flex-row items-center justify-normal bg-red-200 p-2"
      />

      <Dropdown
        v-model="selectedModel"
        :options="models"
        option-label="name"
        class="m-2"
        placeholder="Select a Model"
      />
      <Button
        @click="selectedModel = null"
        icon="pi pi-times"
        class="m-2 flex aspect-square h-fit w-fit flex-row items-center justify-normal bg-red-200 p-2"
      />

      <!-- <ToggleButton
        v-model="isShowingClusterMean"
        on-label="Color by cluster means"
        off-label="Remove cluster means color"
        @change="toggleIsShowingClusterMean"
      /> -->
      <Button
        @click="clearClusterSelection"
        label="Reset Cluster Selection(s)"
        class="m-2 p-2"
      />
    </div>
    <!-- <TooltipView
      v-if="showTooltip"
      id="tooltip"
      :members="selectedTimelineCluster"
      :month="selectedTimelineClusterMonth"
      @close-card="showTooltip = false"
      class="absolute bottom-0 right-0 rounded-lg border border-gray-300 bg-white text-black shadow-lg"
    /> -->
    <div id="timelineSVG" class="flex h-full w-full justify-around text-black">
      <div
        id="tag1"
        v-show="isShowingTag1"
        @click="isShowingTag1 = false"
        class="absolute rounded-lg border border-gray-300 bg-white p-1 text-black"
      >
        {{ tag1Text }}
      </div>

      <div
        id="tag2"
        v-show="isShowingTag2"
        @click="isShowingTag2 = false"
        class="absolute rounded-lg border border-gray-300 bg-white p-1 text-black"
      >
        {{ tag2Text }}
      </div>
    </div>
    <div v-if="isRecalculatingTimeline" class="overlay">
      <div class="overlay-text">Loading Model Forcing Clustering...</div>
    </div>
  </div>
  <div
    id="tooltipText"
    v-show="showTooltipText"
    @click="showTooltipText = false"
    class="absolute rounded-lg border border-gray-300 bg-white p-2 text-black shadow-lg"
  >
    {{ tooltipData }}
  </div>
</template>

<script setup lang="ts">
import * as d3 from "d3";
import API from "@/API/api";
import { onMounted, ref, inject, reactive, watch, nextTick } from "vue";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";
import PopupView from "./ui/PopupView.vue";
import { dataset_name, timeType } from "./utils/utils";

import ToggleButton from "primevue/togglebutton";

import { sspAllLabels, months } from "./utils/utils";
import { useStore } from "@/store/main";
import { storeToRefs } from "pinia";

const store = useStore();
const showTooltip = ref(false);
const showTooltipText = ref(false);

const isShowingClusterMean = ref(true);
const isRecalculatingTimeline = ref(false);

const splitterResized = inject("splitterResized");

const selectedModel = ref();
const selectedType = ref("ssp585");
const tooltipData = ref();

let modelNames = Array.from(
  new Set(sspAllLabels.map((member) => member.model_name))
);

const clickedLocation = ref({ x: 0, y: 0 });

// let monthList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
let monthListOriginal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// let monthListOriginal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
let monthList = [10, 11, 12, 1, 2, 3, 4, 5];

let initiatedChange = true;

const isShowingTag1 = ref(false);
const isShowingTag2 = ref(false);
const tag1Text = ref("");
const tag2Text = ref("");

const props = defineProps({
  time_type: timeType,
});

// function toggleIsShowingClusterMean() {
//   d3.selectAll("rect")
//     .filter(function () {
//       return (
//         d3.select(this)?.attr("id") &&
//         d3.select(this).attr("id").startsWith("clusterRect")
//       );
//     })
//     .classed("grey-rect", isShowingClusterMean.value);
// }

function clearClusterSelection() {
  d3.selectAll("rect")
    .filter(function () {
      return (
        d3.select(this)?.attr("id") &&
        d3.select(this).attr("id").startsWith("clusterRect")
      );
    })
    .each((d) => (d.clicked = false));
  handleTags("hide", null, null);
  store.setFiles({ group1: [], group2: [] });
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

watch(selectedType, () => {
  draw();
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
      d3.select(element).select("svg").remove();
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
        d3.select(element).select("svg").remove();
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

const data = reactive({}); // data[i][j] is the clustering for month i, model j
const dataT = reactive({}); // dataT[i][j] is the clustering for model i, month j
const monthlyMDS: Record<number, Record<number, number>> = {}; // monthlyMDS[i][j] is the MDS for month i, model j

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
      const clusters = Object.keys(perTimeStepClusterCounts[month]).sort();
      const scales = {};

      let nextMonth = i < monthList.length - 1 ? monthList[i + 1] : null;
      let prevMonth = i > 0 ? monthList[i - 1] : null;

      for (let clusterNum = 0; clusterNum < clusters.length; clusterNum += 1) {
        let clusterID = parseInt(clusters[clusterNum]);
        let modelIds;
        if (i == 0) {
          modelIds = data[month]
            .map((cluster, modelID) => (cluster === clusterID ? modelID : -2))
            .filter((d) => d !== -2);
          modelIds.sort((modelIDA, modelIDB) => {
            const nextClusterA = dataT[modelIDA][nextMonth];
            const nextClusterB = dataT[modelIDB][nextMonth];

            let nextClusterAValue = yScale(nextMonth)(nextClusterA);
            let nextClusterBValue = yScale(nextMonth)(nextClusterB);

            if (iteration == 1) {
              nextClusterAValue +=
                modifierScales[nextMonth][nextClusterA](modelIDA);
              nextClusterBValue +=
                modifierScales[nextMonth][nextClusterB](modelIDB);
            }

            return nextClusterAValue - nextClusterBValue;
          });
        } else if (i == monthList.length - 1) {
          modelIds = data[month]
            .map((cluster, modelID) => (cluster === clusterID ? modelID : -2))
            .filter((d) => d !== -2);
          modelIds.sort((modelIDA, modelIDB) => {
            const prevClusterA = dataT[modelIDA][prevMonth];
            const prevClusterB = dataT[modelIDB][prevMonth];

            let prevClusterAValue = yScale(prevMonth)(prevClusterA);
            let prevClusterBValue = yScale(prevMonth)(prevClusterB);

            if (iteration == 1) {
              prevClusterAValue +=
                modifierScales[prevMonth][prevClusterA](modelIDA);
              prevClusterBValue +=
                modifierScales[prevMonth][prevClusterB](modelIDB);
            }

            return prevClusterAValue - prevClusterBValue;
          });
        } else {
          modelIds = data[month]
            .map((cluster, modelID) => (cluster === clusterID ? modelID : -2))
            .filter((d) => d !== -2);
          modelIds.sort((modelIDA, modelIDB) => {
            const prevClusterA = dataT[modelIDA][prevMonth];
            const prevClusterB = dataT[modelIDB][prevMonth];
            const nextClusterA = dataT[modelIDA][nextMonth];
            const nextClusterB = dataT[modelIDB][nextMonth];

            let prevClusterAValue = yScale(prevMonth)(prevClusterA);
            let prevClusterBValue = yScale(prevMonth)(prevClusterB);
            let nextClusterAValue = yScale(nextMonth)(nextClusterA);
            let nextClusterBValue = yScale(nextMonth)(nextClusterB);

            if (iteration == 1) {
              prevClusterAValue +=
                modifierScales[prevMonth][prevClusterA](modelIDA);
              prevClusterBValue +=
                modifierScales[prevMonth][prevClusterB](modelIDB);
              nextClusterAValue +=
                modifierScales[nextMonth][nextClusterA](modelIDA);
              nextClusterBValue +=
                modifierScales[nextMonth][nextClusterB](modelIDB);
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
        scales[clusterID] = d3
          .scaleBand()
          .domain(modelIds)
          .range([
            (-clusterHeightScale(modelIds.length) / 2) * 0.8,
            (clusterHeightScale(modelIds.length) / 2) * 0.8,
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
  minMDS,
  maxMDS,
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

    console.log("DEBUG: SORTED  ", month, sorted);
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
          .range([minMDS, maxMDS]);

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
    const min = Math.min(...Object.values(monthlyMDS[month]));
    const max = Math.max(...Object.values(monthlyMDS[month]));

    monthlyMDS[month] = Object.fromEntries(
      Object.entries(monthlyMDS[month]).map(([key, value]) => [
        key,
        value - (max + min) / 2,
      ])
    );

    // monthlyMDS[month].map((d) => d - (max + min) / 2);
  }
  // return yScale;
}

function checkFlipMDS({ yScale, HEIGHT, MARGIN, minMDS, maxMDS }) {
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
          .domain([minMDS, maxMDS])
          .range([
            // MARGIN + (HEIGHT - 2 * MARGIN) * 0.2,
            // HEIGHT - MARGIN - (HEIGHT - 2 * MARGIN) * 0.2,
            MARGIN,
            HEIGHT - MARGIN,
          ])(monthlyMDS[month][clusterId]);
    };

    let totalDistance = 0;
    let totalDistanceFlipped = 0;

    for (let modelID = 0; modelID < modelNames.length; modelID += 1) {
      // Current
      let prevCluster = dataT[modelID][prevMonth];
      let currentCluster = dataT[modelID][month];

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
      // monthlyMDS[month] = monthlyMDS[month].map((d) => -d);
      monthlyMDS[month] = Object.fromEntries(
        Object.entries(monthlyMDS[month]).map(([key, value]) => [key, -value])
      );
    }
  }
  // return yScale;
}

async function drawTimeline() {
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

  // add a black style class
  svg.append("style").text(`
    .black {
      stroke: black;
    }
    .not-selected {
      stroke: black;
      stroke-width: 1 !important;
      stroke-opacity: 0.2 !important;
    }
    .selected {
      stroke-opacity: 1 !important;
      stroke-width: 4 !important;
    }
    .path-highlighted {
    }
    .path-not-highlighted {
      stroke-width: 0.1 !important;
      stroke-opacity: 0.1 !important;
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
  let minDistBetweenMDS = HEIGHT / 20;

  let minMDS = Math.min(...Object.values(monthlyMDS).flatMap(Object.values));

  let maxMDS = Math.max(...Object.values(monthlyMDS).flatMap(Object.values));

  const yScale = (month) => {
    return (clusterId) => {
      if (clusterId == -1) {
        return MARGIN * 4;
      } else {
        return (
          d3
            .scaleLinear()
            // .domain([-150, 150])
            .domain([minMDS, maxMDS])
            .range([
              // MARGIN + (HEIGHT - 2 * MARGIN) * 0.2,
              // HEIGHT - MARGIN - (HEIGHT - 2 * MARGIN) * 0.2,
              MARGIN * 4,
              HEIGHT - MARGIN * 4,
            ])(monthlyMDS[month][clusterId])
        );
      }
    };
  };

  const clusterHeightScale = d3
    .scaleLinear()
    .domain([0, maxClusterSize])
    .range([10, clusterHeightMax]);

  adjustMDS({
    minDistBetweenMDS: minDistBetweenMDS,
    yScale: yScale,
    clusterHeightScale: clusterHeightScale,
    height: HEIGHT,
    margin: MARGIN * 4,
    minMDS: minMDS,
    maxMDS: maxMDS,
  });

  checkFlipMDS({
    yScale: yScale,
    HEIGHT: HEIGHT,
    MARGIN: MARGIN,
    minMDS: minMDS,
    maxMDS: maxMDS,
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
    scalesSorted.map(([key, value]) => {
      clusterOrder = [...value.domain(), -parseInt(key + 1), ...clusterOrder];
    });
    // return clusterOrder;
    store.clusterOrders[month] = clusterOrder;
  });
  console.log("DEBUG: MODIFIERSCALES ", modifierScales);

  let pathData = [];
  for (let modelID = 0; modelID < Object.values(dataT).length; modelID++) {
    const clusterHistory = dataT[modelID];
    console.log("DEBUG: CLUSTERHISTORY ", clusterHistory);
    const controlPoints = monthList.map((month) => {
      let cluster = clusterHistory[month];
      return {
        x: xScale(month),
        y:
          yScale(month)(cluster) +
          modifierScales[month][cluster](modelID) +
          modifierScales[month][cluster].bandwidth() / 2,
      };
    });
    const pathString = getPath({
      controlPoints: controlPoints,
      xScale: xScale,
    });
    pathData.push({
      index: modelID,
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
  console.log("DEBUG: CLUSTERBOXDATA ", clusterBoxDataPromise);
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
    .interpolator(d3.interpolateBrBG);

  // for (let i = 1; i <= 12; i++) {
  svg
    .selectAll("clusterPath")
    .data(pathData)
    .join("path")
    .attr("d", (d) => d.path)
    .attr("fill", "none")
    .attr("id", (d) => `clusterPath${d.index}`)
    .attr("stroke", (d) => {
      return "steelblue";
    })
    // .attr("stroke-dasharray", (d) =>
    //   members[d.index].ssp == "historical" ? "10,10" : "0"
    // )
    // .attr("stroke-width", (d) => {
    //   return 1;
    // })
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
      tooltipData.value = `${modelNames[d.index]}`;
      showTooltipText.value = true;
      console.log("DEBUG: Tooltip ", tooltipData.value);
      document
        .getElementById("tooltipText")
        ?.style.setProperty("top", `${event.clientY}px`);
      document
        .getElementById("tooltipText")
        ?.style.setProperty("left", `${event.clientX}px`);
    });
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
      .attr("id", (d, i) => `clusterRect${i}`)
      .attr("fill", (d) => "darkgrey")
      .attr("fill-opacity", 1)
      .attr("stroke", "none")
      .attr("transform", `translate(${xScale.bandwidth() / 2}, ${0})`)
      .each((d) => (d.clicked = false))
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
              d3.select(this)?.attr("id") &&
              d3.select(this).attr("id").startsWith("clusterPath") &&
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
      .on("click", async function (event, d) {
        initiatedChange = true;
        if (d.clicked) {
          d.clicked = false;
          // d3.select(this).classed("selected-rect", false);
          // showTooltip.value = false;
          store.setFiles({ group1: [], group2: [] });
          handleTags("hide", null, null);
        } else {
          // Set all other clusterRect as not clicked
          const clickedID = d3.select(this).attr("id");
          console.log("DEBUG IN CLUSTER RECT CLICK ", clickedID);

          d3.selectAll("#timelineSVG rect")
            .filter(function () {
              return (
                d3.select(this)?.attr("id") &&
                d3.select(this).attr("id").startsWith("clusterRect") &&
                d3.select(this).attr("id") !== clickedID
              );
            })
            .each((d) => (d.clicked = false));

          // Set this clusterRect as clicked
          d.clicked = true;

          // Get the selected models
          let selectedModels = d.members.map((index) => {
            return modelNames[index];
          });

          let group1 = members.filter((member, index) => {
            return (
              member.ssp == "historical" &&
              selectedModels.includes(member.model_name)
            );
          });
          let group2 = members.filter((member, index) => {
            return (
              member.ssp == selectedType.value &&
              selectedModels.includes(member.model_name)
            );
          });

          let selected = d.members.map((member) => {
            return {
              model_name: members[member].model_name,
              ssp: members[member].ssp,
              variant: members[member].variant,
            };
          });

          console.log(event);

          store.monthsSelected = [d.month];
          store.setFiles({ group1: group1, group2: group2 });
          await nextTick();
          initiatedChange = false;

          // if (store.files[0].length > 0) {
          //   clickedLocation.value.x = event.clientX;
          //   clickedLocation.value.y = event.clientY;
          //   showPopup(event, d);
          // } else {
          //   showTooltip.value = true;
          handleTags(
            "show",
            {
              x: d.x + xScale.bandwidth() / 2 + d.width,
              y: d.y - d.height / 2,
            },
            false
          );
          //   store.setFiles({ group1: selected, group2: [] });
          //   await nextTick();
          //   initiatedChange = false;
          // }
        }
        return;
      });
  }

  // const pathLegend = [
  //   { name: "Historical", color: "steelblue", dash: "0" },
  //   { name: "SSP245", color: "forestgreen", dash: "0" },
  //   { name: "SSP370", color: "darkkhaki", dash: "0" },
  //   { name: "SSP585", color: "crimson", dash: "0" },
  // ];

  // const pathLegendGroup = svg
  //   .append("g")
  //   .attr("transform", `translate(${WIDTH - MARGIN * 2 - 200}, 50)`);
  // pathLegendGroup
  //   .append("text")
  //   .text("Path style")
  //   .attr("alignment-baseline", "before-edge")
  //   .attr("font-size", "large")
  //   .attr("font-weight", "bold");
  // const pathLegendItems = pathLegendGroup
  //   .selectAll("g")
  //   .data(pathLegend)
  //   .enter()
  //   .append("g");

  // pathLegendItems
  //   .append("line")
  //   .attr("x1", 0)
  //   .attr("x2", 50)
  //   .attr("y1", (d, i) => i * 20 + 30)
  //   .attr("y2", (d, i) => i * 20 + 30)
  //   .attr("stroke", (d) => d.color)
  //   .attr("stroke-dasharray", (d) => d.dash);

  // pathLegendItems
  //   .append("text")
  //   .attr("x", 70)
  //   .attr("y", (d, i) => i * 20 + 30)
  //   .text((d) => d.name)
  //   .attr("alignment-baseline", "central");

  // const rectLegend = arrToI(7).map((i) => {
  //   let adjustedI = i - 3;

  //   let value =
  //     adjustedI < 0
  //       ? d3.interpolate(0, clusterMeanMin)(-adjustedI / 3)
  //       : d3.interpolate(0, clusterMeanMax)(adjustedI / 3);
  //   // format number as a string in scientific notation
  //   return {
  //     name: value.toExponential(2),
  //     color: meanDivergingScale(value),
  //   };
  // });

  // const rectLegendGroup = svg
  //   .append("g")
  //   .attr("transform", `translate(${WIDTH - MARGIN * 2 - 500}, 50)`);

  // rectLegendGroup
  //   .append("text")
  //   .text("Mean Δhistorical (kg/m^2/s)")
  //   .attr("alignment-baseline", "before-edge")
  //   .attr("font-size", "large")
  //   .attr("font-weight", "bold");

  // const rectLegendItems = rectLegendGroup
  //   .selectAll("g")
  //   .data(rectLegend)
  //   .enter()
  //   .append("g");

  // rectLegendItems
  //   .append("rect")
  //   .attr("x", 0)
  //   .attr("y", (d, i) => i * 20 + 30)
  //   .attr("width", 20)
  //   .attr("height", 20)
  //   .attr("fill", (d) => d.color);

  // rectLegendItems
  //   .append("text")
  //   .attr("x", 30)
  //   .attr("y", (d, i) => i * 20 + 30 + 15)
  //   .text((d) => d.name);
  // // .attr("alignment-baseline", "before-edge");
}

watch(
  () => [store.files, store.monthsSelected],
  () => {
    if (initiatedChange) return;
    // Set all  clusterRect as not clicked
    // d3.selectAll("rect")
    //   .filter(function () {
    //     return (
    //       d3.select(this)?.attr("id") &&
    //       d3.select(this).attr("id").startsWith("clusterRect")
    //     );
    //   })
    //   .each((d) => (d.clicked = false))
    //   .classed("selected-rect", false);
    showTooltip.value = false;
    handleTags("hide", null, null);
  }
);
async function getData() {
  for (let i = 0; i < monthList.length; i += 1) {
    let month = monthList[i];
    // const { distances } = await API.fetchData("distance_matrix", true, {
    //   dataset_type: dataset_name,
    //   // time_type: (month <= 3 || month >=10) timeType.All,
    //   // time_type: month <= 5 || month >= 10 ? timeType.OctMay : timeType.AprSep,
    //   time_type: props.time_type,
    //   members: sspAllLabels,
    //   subsetType: "month",
    //   months: [month],
    //   years: [-1],
    // });
    // console.log("DEBUG: DISTANCES ", month, distances);

    const { forcing_distances, model_names_valid } = await API.fetchData(
      "distance_matrix_forcing",
      true,
      {
        dataset_type: dataset_name,
        time_type: props.time_type,
        data_type_comparison: selectedType.value,
        model_names: modelNames,
        subsetType: "month",
        resolution: 20,
        months: [month],
        years: [-1],
      }
    );
    modelNames = model_names_valid;

    console.log("DEBUG: FORCING DISTANCES ", month, forcing_distances);

    const { clustering } = await API.fetchData("run_clustering", true, {
      distance_matrix: forcing_distances,
      n_neighbors: 5, // For UMAP
      min_cluster_size: 2, // For HDBSCAN
      keep_noise: false, // For HDBSCAN
    });
    data[month] = clustering;

    console.log("DEBUG: CLUSTERING ", month, clustering);

    const { MDSClusterEmbedding } = await API.fetchData("run_MDS", true, {
      distance_matrix: forcing_distances,
      clustering: clustering,
      months: [month],
    });

    let MDSClusterEmbeddingDict = Object.fromEntries(
      Array.from(new Set(Object.values(clustering)))
        .sort()
        .map((key, index) => [key, MDSClusterEmbedding[index]])
    );
    // Force the midpoint to be 0
    monthlyMDS[month] =
      MDSClusterEmbedding == 0 ? { 0: 0 } : MDSClusterEmbeddingDict;
    console.log(
      "DEBUG: MDS ",
      Array.from(new Set(Object.values(clustering))).sort(),
      month,
      monthlyMDS[month]
    );
  }

  modelNames.forEach((model, i) => {
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
}
// const arrToI = (i, start=) => Array.from({ length: i }, (_, index) => index);
function arrToI(i, start = 0) {
  return Array.from({ length: i }, (_, index) => index + start);
}

function handleTags(action, coords, addAsCMP: boolean) {
  if (action == "hide") {
    isShowingTag1.value = false;
    return;
  }
  document.getElementById("tag1")?.style.setProperty("top", `${coords.y}px`);
  document.getElementById("tag1")?.style.setProperty("left", `${coords.x}px`);

  tag1Text.value = "Showing";
  isShowingTag1.value = true;

  // if (!addAsCMP) {
  //   document.getElementById("tag1")?.style.setProperty("top", `${coords.y}px`);
  //   document.getElementById("tag1")?.style.setProperty("left", `${coords.x}px`);

  //   tag1Text.value = "Showing";
  //   isShowingTag1.value = true;
  // } else {
  //   document.getElementById("tag2")?.style.setProperty("top", `${coords.y}px`);
  //   document.getElementById("tag2")?.style.setProperty("left", `${coords.x}px`);

  //   tag1Text.value = "Selection 1";
  //   tag2Text.value = "Selection 2";
  //   isShowingTag1.value = true;
  //   isShowingTag2.value = true;
  // }
}
</script>
