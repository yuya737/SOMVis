<template>
  <div class="relative h-full w-full">
    <Dropdown
      v-model="selectedMonth"
      :options="months"
      optionLabel="name"
      placeholder="Select a Month"
      class="absolute left-0 top-0 w-fit z-[2] bg-gray-200 m-4 text-black text-lg"
    />
    <!-- <Button
      class="absolute left-0 top-0 z-[2] w-fit transform rounded-md bg-gray-200 p-2 m-4 text-lg text-black"
      label="Clear"
      icon="pi pi-times"
      @click="clearSelections"
    /> -->
    <SelectButton
      class="absolute right-0 top-0 z-[2] w-fit transform rounded-md text-lg font-bold text-black"
      optionLabel="label"
      :options="clusterLabels"
      v-model="clusterSelection"
      @click="clusterSelectionChanged"
    />
    <div id="my_dataviz" class="h-full w-full flex justify-around" />
  </div>
</template>

<script setup lang="ts">
import { agnes } from "ml-hclust";

import { onMounted, watch, ref, nextTick } from "vue";
import { useStore } from "@/store/main";
import API from "@/api/api";
import * as d3 from "d3";

import {
  // ssp370Labels,
  sspAllLabels,
  historicalLabels,
  scalePointsToSquare,
  getModelType,
  stripSOMprefix,
  getNodeOrder,
  getChildren,
  months,
  colorSim,
} from "./utils/utils";

// const DEFAULT_ALL_CLUSTER = { label: "All", value: "All" };
const store = useStore();
// const labels = ssp370Labels.map((i: string) => getModelType(i));
// const fullLabels = ssp370Labels.map((i) => stripSOMprefix(i));
// const clusterLabels = ref([DEFAULT_ALL_CLUSTER]);
// const clusterSelection = ref(DEFAULT_ALL_CLUSTER);
const months = ref([
  { name: "January", value: 1 },
  { name: "February", value: 2 },
  { name: "March", value: 3 },
  { name: "April", value: 4 },
  { name: "May", value: 5 },
  { name: "June", value: 6 },
  { name: "July", value: 7 },
  { name: "August", value: 8 },
  { name: "September", value: 9 },
  { name: "October", value: 10 },
  { name: "November", value: 11 },
  { name: "December", value: 12 },
]);
const selectedMonth = ref(months.value[0]);

let dbscanResult;

// console.log(labels);
const clearFlag = ref(false);
let tree;

onMounted(() => {
  // window.onload = () => {
  watch(
    () => store.clusterOrders,
    () => {
      const element = document.getElementById("my_dataviz");
      if (element) {
        console.log(document.getElementById("my_dataviz").clientWidth);
        draw(selectedMonth.value.value);
      }
    }
  );
  // };
  watch(
    () => [
      store.getYearsSelected,
      store.getMonthsSelected,
      selectedMonth.value,
    ],
    async () => draw(selectedMonth.value.value)
  );
});

function clearSelections() {
  store.setFiles({ group1: [], group2: [] });
  store.setHoveredFile(null);
  d3.selectAll('text[id^="label"]').attr("class", null);
  d3.selectAll('text[id^="node"]').attr("class", null);
  d3.selectAll('rect[id^="rect"]').attr("class", null);
  d3.selectAll('path[id^="link"]').attr("class", null);
  d3.selectAll('circle[id^="node"]').attr("class", null);
  clearFlag.value = !clearFlag.value;
}

function clusterSelectionChanged() {
  store.setFiles({ group1: [], group2: [] });
  store.setHoveredFile(null);
  if (!clusterSelection.value) return;
  if (clusterSelection.value.value == "All") {
    store.setFiles({ group1: fullLabels });
  } else {
    let filteredList = fullLabels.filter(
      (d, i) => dbscanResult[i] == clusterSelection.value.value
    );
    store.setFiles({ group1: filteredList });
  }
}

async function draw(month) {
  const { distances, dendrogram } = await API.fetchData(
    "distance_matrix",
    true,
    {
      files: sspAllLabels,
      subsetType: store.getSubsetType,
      // months: store.getMonthsSelected,
      months: [month],
      years: store.getYearsSelected,
    }
  );
  console.log("DEBUG distances", distances);
  let svgHeatmap = makeHeatmap({ distances: distances, month: month });
  console.log("Files, years, or months changed. Redrawing heatmap.");
  document.getElementById("my_dataviz").innerHTML = "";
  document.getElementById("my_dataviz").appendChild(svgHeatmap);
}

function highlightOneOnHover(active, className, event, d) {
  if (d?.data?.text) {
    d = d.data.text;
  }
  if (store.getFiles[0].length > 0 || store.getFiles[1].length > 0) {
    // When files are selected, do not trigger any hover actions
    return;
  }
  // Reset hoveredFile in store
  store.setHoveredFile(active ? fullLabels[labels.indexOf(d)] : null);

  // highligt all project nodes but the one hovered
  d3.selectAll(`text[id^="label_node"]`).classed("label--not--active", active);
  d3.selectAll("text#label_node" + d).classed(
    "label--active--" + className,
    active
  );
  d3.selectAll(`circle[id^="node"]`).classed("circ--not--active", active);
  d3.selectAll("circle#node" + d).classed("circ--active--" + className, active);

  // activate heatmap label
  d3.selectAll("text#label_y" + d).classed(
    "label--active--" + className,
    active
  );

  // highlight all heatmap rect but the one hovered
  d3.selectAll("rect").classed("rect--not--active", active);
  d3.selectAll(`rect[id^="rect${d}:"]`).classed("rect--active", active);

  // Activate dendrogram label
  //   d3.selectAll("text#node" + d).classed("label--active--" + className, active);
  //   // Active heatmap label
  //   d3.selectAll("text#label_y" + d).classed(
  //     "label--active--" + className,
  //     active
  //   );

  //   let dendrogramLeaf = d3.select("text#node" + d).data()[0];
  //   d3.select(dendrogramLeaf.linkNodeTo).classed(
  //     "link--active--" + className,
  //     active
  //   );
  //   do
  //     d3.select(dendrogramLeaf.linkNodeTo).classed(
  //       "link--active--" + className,
  //       active
  //     );
  //   while ((dendrogramLeaf = dendrogramLeaf.parent));
}

function makeHeatmap({ distances, month }) {
  // set the dimensions and margins of the graph
  const margin = { top: 80, right: 25, bottom: 170, left: 250 };
  // print this elements' width and height
  const fullHW = Math.min(
    document.getElementById("my_dataviz").clientWidth,
    document.getElementById("my_dataviz").clientHeight
  );
  console.log(
    document.getElementById("my_dataviz").clientWidth,
    document.getElementById("my_dataviz").clientHeight
  );

  const width = fullHW - margin.left - margin.right;
  const height = fullHW - margin.top - margin.bottom;

  const svg = d3
    .create("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", [
      -margin.left,
      -margin.top,
      width + margin.right + margin.left,
      height + margin.bottom + margin.top,
    ])
    .attr("id", "heatmap");

  const labelsReordered = store.clusterOrders[month - 1].map(
    (i) => sspAllLabels[i]
  );
  let data = distances.flat().map((item, index) => ({
    value: item,
    row: labelsReordered[
      store.clusterOrders[month - 1].indexOf(index % sspAllLabels.length)
    ],
    col: labelsReordered[
      store.clusterOrders[month - 1].indexOf(
        Math.floor(index / sspAllLabels.length)
      )
    ],
  }));

  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(labelsReordered)
    .padding(0.05);
  const xAxis = svg
    .append("g")
    .style("font-size", 15)
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0));
  xAxis
    .selectAll(".tick text") // Select all text elements under elements with class 'tick'
    .text((d) => getModelType(d))
    .style("fill", (d) => {
      return stripSOMprefix(d).includes("historical")
        ? "midnightblue"
        : "firebrick";
    })
    .attr("id", (d) => "label_x" + getModelType(d))
    .attr("transform", "rotate(-45)") // Rotate each text element by -45 degrees
    .style("text-anchor", "end"); // Align the text to the end of the text element (right side when not rotated)

  xAxis.select(".domain").remove();

  // Build Y scales and axis:
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(labelsReordered)
    .padding(0.05);
  const yAxis = svg
    .append("g")
    .style("font-size", 15)
    .call(d3.axisLeft(y).tickSize(0));

  yAxis
    .selectAll(".tick text") // Select all tick elements
    .style("fill", (d) => {
      return stripSOMprefix(d).includes("historical")
        ? "midnightblue"
        : "firebrick";
    })
    // change text
    .text((d) => getModelType(d))
    .attr("id", (d) => "label_y" + getModelType(d))
    .on("mouseover", (event, d) => {
      // d.isClicked = false;
      highlightOneOnHover(true, "class0", event, getModelType(d));
    })
    .on("mouseleave", (event, d) => {
      // if (d.isClicked) return;
      highlightOneOnHover(false, "class0", event, getModelType(d));
    });
  yAxis.select(".domain").remove();

  // Build color scale
  const myColor = d3
    .scaleSequential()
    .interpolator(d3.interpolateInferno)
    .domain([0, Math.max(...distances.flat())]);

  // add the squares
  svg
    .selectAll()
    .data(data, function (d) {
      return d.group + ":" + d.variable;
    })
    .join("rect")
    .attr("x", function (d) {
      return x(d.col);
    })
    .attr("y", function (d) {
      return y(d.row);
    })
    // .attr("rx", 4)
    // .attr("ry", 4)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return myColor(d.value);
    })
    .style("stroke-width", 4)
    .style("stroke", "none")
    .style("opacity", 0.8);
  //   // .on("mouseover", mouseover)
  //   // .on("mousemove", mousemove)
  //   // .on("mouseleave", mouseleave)
  //   .attr("id", function (d) {
  //     return "rect" + getModelType(d.row) + ":" + getModelType(d.col);
  //   })
  //   .on("click", function (event, d) {
  //     store.setFiles([[stripSOMprefix(d.row)], [stripSOMprefix(d.col)]]);

  //     d3.selectAll("text#label_y" + getModelType(d.row)).classed(
  //       "label--active--class1",
  //       true
  //     );
  //     d3.selectAll("text#label_x" + getModelType(d.col)).classed(
  //       "label--active--class2",
  //       true
  //     );

  //     d3.selectAll("rect").classed("rect--not--active", true);
  //     d3.selectAll(`rect[id^="rect${getModelType(d.row)}:"]`).classed(
  //       "rect--active--class1",
  //       true
  //     );
  //     d3.selectAll(`rect[id$=":${getModelType(d.col)}"]`).classed(
  //       "rect--active--class2",
  //       true
  //     );

  //     watch(clearFlag, () => {
  //       d3.selectAll("text#label_y" + getModelType(d.row)).classed(
  //         "label--active--class1",
  //         false
  //       );
  //       d3.selectAll("text#label_x" + getModelType(d.col)).classed(
  //         "label--active--class2",
  //         false
  //       );
  //     });
  //   });

  // Add title to graph
  // svg
  //   .append("text")
  //   .attr("x", 0)
  //   .attr("y", -30)
  //   .attr("text-anchor", "left")
  //   .style("font-size", "xx-large")
  //   .text("Ensemble Model Comparison");

  // Add subtitle to graph
  svg
    .append("text")
    .attr("x", 0)
    .attr("y", -20)
    .attr("text-anchor", "left")
    .style("font-size", "x-large")
    .style("fill", "grey")
    .style("max-width", 400)
    .text(`Ensemble Model Comparison: ${months.value[month - 1].name}`);
  return svg.node();
}
</script>
