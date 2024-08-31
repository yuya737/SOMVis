<template>
  <div class="relative h-full w-full">
    <Button
      class="absolute left-0 top-0 z-[2] w-fit transform rounded-md bg-gray-200 p-2 m-4 text-lg text-black"
      label="Clear"
      icon="pi pi-times"
      @click="clearSelections"
    />
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
  ssp370Labels,
  historicalLabels,
  scalePointsToSquare,
  getModelType,
  stripSOMprefix,
  getNodeOrder,
  getChildren,
  months,
  colorSim,
} from "./utils/utils";

const DEFAULT_ALL_CLUSTER = { label: "All", value: "All" };
const store = useStore();
const labels = ssp370Labels.map((i: string) => getModelType(i));
const fullLabels = ssp370Labels.map((i) => stripSOMprefix(i));
const clusterLabels = ref([DEFAULT_ALL_CLUSTER]);
const clusterSelection = ref(DEFAULT_ALL_CLUSTER);

let dbscanResult;

console.log(labels);
const clearFlag = ref(false);
let tree;

onMounted(() => {
  // window.onload = () => {
  nextTick(() => {
    const element = document.getElementById("my_dataviz");
    if (element) {
      console.log(document.getElementById("my_dataviz").clientWidth);
      draw();
    }
  });
  // };
  watch(
    () => [store.getYearsSelected, store.getMonthsSelected],
    async () => draw()
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

async function draw() {
  const { distances, dendrogram } = await API.fetchData(
    "distance_matrix",
    true,
    {
      files: ssp370Labels,
      nodeMap: "CMIP6_pr_delta_historical_S5L0.02_umap_mapping.json",
      subsetType: store.getSubsetType,
      months: store.getMonthsSelected,
      years: store.getYearsSelected,
    }
  );
  // const tsneResult = await API.fetchData("run_tsne", true, {
  //   distance_matrix: distances,
  //   perplexity: 5,
  // });
  const clusteringResult = await API.fetchData("run_umap", true, {
    distance_matrix: distances,
    n_neighbors: 5,
    min_dist: 0.1,
    // perplexity: 5,
  });
  dbscanResult = await API.fetchData("run_dbscan", true, {
    embedding: clusteringResult,
    eps: 0.1,
    min_samples: 3,
  });
  console.log("DBSCAN", dbscanResult);
  let svgHeatmap = makeHeatmap(distances);
  let svgClustering = makeClusteringProjection({
    width:
      document.getElementById("my_dataviz").clientWidth -
      document.getElementById("my_dataviz").clientHeight -
      30,
    height: document.getElementById("my_dataviz").clientHeight,
    clusteringResult: clusteringResult,
    dbscanResult: dbscanResult,
    labels: labels,
  });
  // let svgDendrogram = makeDendrogram({
  //   width:
  //     document.getElementById("my_dataviz").clientWidth -
  //     document.getElementById("my_dataviz").clientHeight -
  //     30,
  //   height: document.getElementById("my_dataviz").clientHeight,
  //   yLabel: "Distance",
  //   strokeWidth: 5,
  // });
  console.log("Files, years, or months changed. Redrawing heatmap.");
  document.getElementById("my_dataviz").innerHTML = "";
  document.getElementById("my_dataviz").appendChild(svgHeatmap);
  document.getElementById("my_dataviz").appendChild(svgClustering);
  // document.getElementById("my_dataviz").appendChild(svgDendrogram);
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

function makeClusteringProjection(options) {
  const {
    width,
    height,
    clusteringResult: clusteringResult,
    dbscanResult,
    labels,
  } = options;
  let scaledPoints = scalePointsToSquare(
    clusteringResult,
    width * 0.6,
    height * 0.6
  );
  let nodes = scaledPoints.map((d, i) => {
    return { index: i, id: labels[i], x: d[0], y: d[1] };
  });
  // Count how many unique dbscan clusters there are
  let dbscanClusterNums = new Set(dbscanResult).size;
  clusterLabels.value = [DEFAULT_ALL_CLUSTER];
  for (let i = 0; i < dbscanClusterNums; i++) {
    clusterLabels.value.push({
      label: "Cluster " + (i + 1),
      value: i.toString(),
    });
  }

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height]);
  // .attr("viewBox", [0, 0, width, height]);

  svg.append("style").text(`
  .label--not--active {
    opacity: 0.2;
  }
  .label--active {
    font-size: 17px;
    font-weight: bold;
    opacity: 1;
  }
  .label--active--class0 {
    font-size: 17px;
    font-weight: bold;
    opacity: 1;
  }
  .label--active--class1{
    font-size: 17px;
    fill: #1b9e77 !important;
    opacity: 1;
  }
  .label--active--class2{
    font-size: 17px;
    fill: #d95f02 !important;
    opacity: 1;
  }
  .cmp--node--active {
    r: 10;
  }
  .circ--not--active {
    opacity: 0.2 !important;
  }
  .circ--active {
    opacity: 1 !important;
  }
  .circ--active--class0{
    stroke: #000 !important;
    stroke-opacity: 1 !important;
    stroke-width: 2px !important;
    opacity: 1 !important;
  }
  .circ--active--class1{
    stroke: #1b9e77 !important;
    stroke-opacity: 1 !important;
    stroke-width: 2px !important;
    opacity: 1 !important;
  }
  .circ--active--class2{
    stroke: #d95f02 !important;
    stroke-opacity: 1 !important;
    stroke-width: 2px !important;
    opacity: 1 !important;
  }
    .rect--not--active {
    opacity: 0.2 !important;
  }
  .rect--active {
    opacity: 1 !important;
  }
  .rect--active--class0{
    stroke: #000 !important;
    stroke-opacity: 1 !important;
    stroke-width: 2px !important;
    opacity: 1 !important;
  }
  .rect--active--class1{
    stroke: #1b9e77 !important;
    stroke-opacity: 1 !important;
    stroke-width: 2px !important;
    opacity: 1 !important;
  }
  .rect--active--class2{
    stroke: #d95f02 !important;
    stroke-opacity: 1 !important;
    stroke-width: 2px !important;
    opacity: 1 !important;
  }
  `);

  const convert = (color) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;

  // Append nodes.
  const node = svg
    .selectAll("circle")
    .data(nodes, (node) => node)
    .join(
      (enter) => enter.append("circle"),
      (exit) => {
        return exit.remove();
      }
    )
    .attr("r", (node) => 5)
    .attr("cx", (node) => node.x)
    .attr("cy", (node) => node.y)
    .attr("id", (node) => "node" + node.id)
    .attr("fill", (d) => {
      // return labels[d.id].includes("historical") ? "midnightblue" : "firebrick";
      return convert(colorSim(dbscanResult[d.index]));
      // return labels[d.id].includes("historical") ? "midnightblue" : "firebrick";
    })
    .attr("stroke-width", 1.5)
    .on("mouseover", (event, d) => {
      highlightOneOnHover(true, "class0", event, d.id);
    })
    .on("mouseout", (event, d) => {
      highlightOneOnHover(false, "class0", event, d.id);
    });

  const textElements = svg
    .selectAll("text")
    .data(nodes, (d) => d)
    .join(
      (enter) => enter.append("text"),
      (exit) => {
        return exit.remove();
      }
    )
    .attr("id", (node) => "label_node" + node.id)
    .text((node) => node.id)
    .attr("font-size", 15)
    .attr("dx", 15)
    .attr("dy", 4)
    .attr("x", (node) => node.x)
    .attr("y", (node) => node.y);

  svg
    .append("text")
    .attr("x", (-width * 0.6) / 2)
    .attr("y", (-height * 0.6) / 2 - 50)
    .attr("text-anchor", "left")
    .style("font-size", "x-large")
    .style("fill", "grey")
    .style("max-width", 400)
    .text(`DR Projections`);

  console.log(Array.from(new Set(dbscanResult)));
  // add a legend for dbscan clusters

  svg
    .selectAll("legendCircle")
    .data(Array.from(new Set(dbscanResult)))
    .enter()
    .append("circle")
    .attr("cx", -width / 2 + 50)
    .attr("cy", (d, i) => height / 2 - 100 + i * 20)
    .attr("r", 9)
    .attr("id", (d) => "legend" + d)
    .style("fill", (d) => convert(colorSim(d)));

  svg
    .selectAll("legendText")
    .data(Array.from(new Set(dbscanResult)))
    .enter()
    .append("text")
    .attr("x", -width / 2 + 70)
    .attr("y", (d, i) => height / 2 - 100 + i * 20)
    .text((d) => `Cluster ${d + 1}`)
    .style("font-size", 20)
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");

  return svg.node();
}

function makeHeatmap(distances) {
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

  // append the svg object to the body of the page
  // const svg = d3
  //   .select("#my_dataviz")
  //   .append("svg")
  //   .attr("width", width + margin.left + margin.right)
  //   .attr("height", height + margin.top + margin.bottom)
  //   .append("g")
  //   .attr("transform", `translate(${margin.left}, ${margin.top})`)
  //   .attr("id", "heatmap");

  const svg = d3
    .create("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    // .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("viewBox", [
      -margin.left,
      -margin.top,
      width + margin.right + margin.left,
      height + margin.bottom + margin.top,
    ])
    // .append("g")
    // .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .attr("id", "heatmap");

  // svg.append("style").text(`
  // .link--active {
  //   stroke: #000 !important;
  //   stroke-opacity: 1 !important;
  //   stroke-width: 5px;
  // }
  // .label--active {
  //   font-weight: bold;
  // }
  // .rect--active {
  //   opacity: 1;
  // }
  // .rect--inactive {
  //   opacity: 0.2;
  // }
  // }`);

  tree = agnes(distances, {
    method: "average",
  });
  let data = distances.flat().map((item, index) => ({
    value: item,
    row: ssp370Labels[index % ssp370Labels.length],
    col: ssp370Labels[Math.floor(index / ssp370Labels.length)],
  }));
  const dendrogramOrder = getNodeOrder(tree, []);
  const labelsReordered = dendrogramOrder.map((i) => ssp370Labels[i]);

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
    .interpolator(d3.interpolateViridis)
    .domain([Math.max(...distances.flat()), 0]);

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
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return myColor(d.value);
    })
    .style("stroke-width", 4)
    .style("stroke", "none")
    .style("opacity", 0.8)
    // .on("mouseover", mouseover)
    // .on("mousemove", mousemove)
    // .on("mouseleave", mouseleave)
    .attr("id", function (d) {
      return "rect" + getModelType(d.row) + ":" + getModelType(d.col);
    })
    .on("click", function (event, d) {
      store.setFiles([[stripSOMprefix(d.row)], [stripSOMprefix(d.col)]]);

      d3.selectAll("text#label_y" + getModelType(d.row)).classed(
        "label--active--class1",
        true
      );
      d3.selectAll("text#label_x" + getModelType(d.col)).classed(
        "label--active--class2",
        true
      );

      d3.selectAll("rect").classed("rect--not--active", true);
      d3.selectAll(`rect[id^="rect${getModelType(d.row)}:"]`).classed(
        "rect--active--class1",
        true
      );
      d3.selectAll(`rect[id$=":${getModelType(d.col)}"]`).classed(
        "rect--active--class2",
        true
      );

      watch(clearFlag, () => {
        d3.selectAll("text#label_y" + getModelType(d.row)).classed(
          "label--active--class1",
          false
        );
        d3.selectAll("text#label_x" + getModelType(d.col)).classed(
          "label--active--class2",
          false
        );
      });
    });

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
    .text(`Ensemble Model Comparison: ${store.getMonthsSelected}`);
  return svg.node();
}

// function makeDendrogram(options = {}) {
//   const {
//     width: width = 420,
//     height: height = 320,
//     hideLabels: hideLabels = false,
//     paddingBottom: paddingBottom = hideLabels ? 20 : 350,
//     innerHeight = height - paddingBottom,
//     innerWidth = width - 10,
//     paddingLeft = 100,
//     h: cutHeight = undefined,
//     yLabel: yLabel = "↑ Height",
//     colors: colors = d3.schemeTableau10,
//     fontFamily: fontFamily = "sans-serif",
//     linkColor: linkColor = "grey",
//     fontSize: fontSize = 15,
//     strokeWidth: strokeWidth = 3,
//   } = options;

//   const svg = d3
//     .create("svg")
//     .attr("width", width)
//     .attr("height", height)
//     .attr("viewBox", [0, 0, width, innerHeight])
//     .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
//     .attr("id", "dendrogram");

//   svg.append("style").text(`
//   .link--active {
//     stroke: #000 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 6px;
//   }
//   .link--active--class0{
//     stroke: #000 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 6px;
//   }
//   .link--active--class1{
//     stroke: #1b9e77 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 6px;
//   }
//   .link--active--class2{
//     stroke: #d95f02 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 6px;
//   }
//   .label--not--active {
//     opacity: 0.2;
//   }
//   .label--active {
//     font-size: 17px;
//     font-weight: bold;
//     opacity: 1;
//   }
//   .label--active--class0 {
//     font-size: 17px;
//     font-weight: bold;
//     opacity: 1;
//   }
//   .label--active--class1{
//     font-size: 17px;
//     fill: #1b9e77 !important;
//     opacity: 1;
//   }
//   .label--active--class2{
//     font-size: 17px;
//     fill: #d95f02 !important;
//     opacity: 1;
//   }
//   .cmp--node--active {
//     r: 10;
//   }
//   .rect--not--active {
//     opacity: 0.2 !important;
//   }
//   .rect--active {
//     opacity: 1 !important;
//   }
//   .rect--active--class0{
//     stroke: #000 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 2px !important;
//     opacity: 1 !important;
//   }
//   .rect--active--class1{
//     stroke: #1b9e77 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 2px !important;
//     opacity: 1 !important;
//   }
//   .rect--active--class2{
//     stroke: #d95f02 !important;
//     stroke-opacity: 1 !important;
//     stroke-width: 2px !important;
//     opacity: 1 !important;
//   }
//   `);

//   var clusterLayout = d3
//     .cluster()
//     .size([width - paddingLeft * 2, innerHeight])
//     .separation(() => 2);

//   const root = d3.hierarchy(tree);
//   const maxHeight = root.data.height;
//   // debugger;

//   const yScaleLinear = d3
//     .scaleLinear()
//     .domain([0, maxHeight])
//     .range([hideLabels ? innerHeight - 35 : innerHeight, 0]);

//   const yAxisLinear = d3.axisLeft(yScaleLinear).tickSize(5);

//   function transformY(data) {
//     const height = hideLabels ? innerHeight - 15 : innerHeight;
//     return height - (data.data.height / maxHeight) * height;
//   }

//   // traverse through first order children and assign colors
//   if (cutHeight) {
//     let curIndex = -1;
//     root.each((child) => {
//       if (
//         child.data.height <= cutHeight &&
//         child.data.height > 0 &&
//         child.parent &&
//         !child.parent.color
//       ) {
//         curIndex++;
//         child.color = colors[curIndex];
//       } else if (child.parent && child.parent.color) {
//         child.color = child.parent.color;
//       }
//     });
//   }

//   clusterLayout(root);

//   // y-axis
//   svg
//     .append("g")
//     .attr("transform", `translate(0, ${hideLabels ? 20 : 0})`)
//     // .append("g")
//     // .attr("class", "axis")
//     .attr("transform", `translate(${paddingLeft},${hideLabels ? 20 : 0})`)
//     .call(yAxisLinear)
//     .call((g) => g.select(".domain").remove())
//     .call((g) =>
//       g
//         .append("text")
//         .attr("x", -paddingLeft)
//         .attr("y", -20)
//         .attr("fill", "currentColor")
//         .attr("text-anchor", "start")
//         .style("font-family", fontFamily)
//         .style("font-size", fontSize)
//         .text(yLabel)
//     )
//     .selectAll(".tick")
//     .classed("baseline", (d) => d == 0)
//     .style("font-size", fontSize)
//     .style("font-family", fontFamily);

//   // Links
//   console.log(root.links());
//   const temp = [
//     {
//       // source: { x: root.links()[0].target.x, y: root.links()[0].target.y - 20 },
//       source: { ...root.links()[0].source },
//       target: root.links()[0].source,
//     },
//     ...root.links(),
//   ];
//   temp[0].source.data = {
//     children: [temp[0].target.data],
//     height: temp[0].target.data.height * 1.1,
//   };
//   const link = svg
//     .append("g")
//     .attr("fill", "none")
//     .attr("stroke", "#000")
//     .attr("stroke-opacity", 0.25)
//     .attr("stroke-width", `${strokeWidth}px`)
//     .selectAll("path")
//     .data(temp)
//     .join("path")
//     .each(function (d, i) {
//       d.source.linkNodeFrom = this;
//       d.target.linkNodeTo = this;
//       d.source.index = i;
//     })
//     .on("mouseover", function (event, d) {
//       d3.selectAll('text[id^="tick"]').classed("label--not--active", true);
//       d3.selectAll('rect[id^="rect"]').classed("rect--not--active", true);
//       classGroup(d.target, "class0", true);
//     })
//     .on("mouseout", function (event, d) {
//       d3.selectAll('text[id^="tick"]').classed("label--not--active", false);
//       d3.selectAll('rect[id^="rect"]').classed("rect--not--active", false);
//       classGroup(d.target, "class0", false);
//     })
//     .on("click", function (event, d) {
//       classGroup(d.target, "class0", true);
//       store.setFiles([
//         getChildren(d.target).map((d) => stripSOMprefix(ssp370Labels[d])),
//         [],
//       ]);
//     })
//     .attr("d", elbow)
//     .attr("transform", `translate(${paddingLeft}, ${hideLabels ? 20 : 0})`)
//     .attr("id", (d) => "link" + d.source.index);

//   let nodeToLinksMap = {};
//   root.links().forEach((d) => {
//     let id = d.source.index;
//     if (id in nodeToLinksMap) {
//       nodeToLinksMap[id].push(d.target);
//     } else {
//       nodeToLinksMap[id] = [d.target];
//     }
//   });

//   svg
//     .append("g")
//     .selectAll("circle")
//     .data(root.links())
//     .join("circle")
//     .attr("r", 6)
//     .attr("cx", (d) => d.source.x)
//     .attr("cy", (d) => transformY(d.source))
//     .attr("id", (d) => "node" + d.source.index + "_" + d.target.index)
//     .attr("transform", `translate(${paddingLeft}, ${hideLabels ? 20 : 0})`)
//     .attr("fill", "black")
//     .each(
//       (d) =>
//         (d.children = [
//           getChildren(d.source.children[0]).map((d) => fullLabels[d]),
//           getChildren(d.source.children[1]).map((d) => fullLabels[d]),
//         ])
//     )
//     .each((d) => (d.isClicked = false))
//     .on("mouseover", function (event, d) {
//       d.isClicked = false;
//       classGroup(nodeToLinksMap[d.source.index][0], "class1", true);
//       classGroup(nodeToLinksMap[d.source.index][1], "class2", true);
//       d3.select(this).classed("cmp--node--active", true);
//     })
//     .on("mouseout", function (event, d) {
//       if (d.isClicked) return;
//       // Set all heatmap ticks to inactive
//       // d3.selectAll('text[id^="tick"]').classed("label--not--active", false);
//       // d3.selectAll('rect[id^="rect"]').classed("rect--not--active", false);
//       classGroup(nodeToLinksMap[d.source.index][0], "class1", false);
//       classGroup(nodeToLinksMap[d.source.index][1], "class2", false);
//       d3.select(this).classed("cmp--node--active", false);
//     })
//     .on("click", function (event, d) {
//       d.isClicked = true;
//       console.log(d.isClicked);
//       classGroup(nodeToLinksMap[d.source.index][0], "class1", true);
//       classGroup(nodeToLinksMap[d.source.index][1], "class2", true);
//       nextTick(() => store.setFiles(d.children));

//       watch(
//         clearFlag,
//         () => {
//           unclickCmpElement(this, nodeToLinksMap[d.source.index][0], "class1");
//           unclickCmpElement(this, nodeToLinksMap[d.source.index][1], "class2");
//         },
//         { once: true }
//       );
//     });

//   function classGroup(node, className, active) {
//     if (store.getFiles[0].length > 0 || store.getFiles[1].length > 0) {
//       // When files are selected, do not trigger any hover actions
//       return;
//     }
//     d3.select(node.linkNodeTo).classed("link--active--" + className, active);
//     if (node.children) {
//       classGroup(node.children[0], className, active);
//       classGroup(node.children[1], className, active);
//     } else {
//       d3.selectAll('text[id^="tick"]').classed("label--not--active", active);
//       d3.selectAll('rect[id^="rect"]').classed("rect--not--active", active);
//       d3.selectAll(
//         (className == "class2" ? "text#label_x" : "text#label_y") +
//           node.data.text
//       ).classed("label--active--" + className, active);

//       d3.selectAll(
//         className == "class2"
//           ? `rect[id$=":${node.data.text}"]`
//           : `rect[id^="rect${node.data.text}:"]`
//       ).classed("rect--active--" + className, active);
//       d3.select(node.svg).classed("label--active--" + className, active);
//       // d3.select(node.svg).style("fill", "red");
//     }
//   }
//   function unclickCmpElement(cmpNode, element, className) {
//     d3.select(cmpNode).classed("cmp--node--active", true);
//     d3.selectAll('text[id^="tick"]').classed("label--not--active", false);
//     d3.selectAll('rect[id^="rect"]').classed("rect--not--active", false);
//     classGroup(element, className, false);
//   }

//   // Nodes
//   svg
//     .append("g")
//     .selectAll("text")
//     .data(root.leaves())
//     .join("text")
//     .attr("dx", -4)
//     .attr("dy", 20)
//     .attr("text-anchor", "end")
//     .style("font-size", fontSize)
//     .style("font-family", fontFamily)
//     .text((d) => labels[d.data.index])
//     .each(function (d) {
//       d.data.text = labels[d.data.index];
//       d.data.fullText = fullLabels[d.data.index];
//       d.svg = this;
//       d.isClicked = false;
//     })
//     .style("fill", (d) => {
//       return d.data.text.includes("historical") ? "midnightblue" : "firebrick";
//     })
//     .attr(
//       "transform",
//       (d) => `translate(${d.x + paddingLeft},${transformY(d)}) rotate(315)`
//     )
//     .attr("id", (d) => "node" + d.data.text)
//     .on("mouseover", (event, d) => {
//       d.isClicked = false;
//       highlightOneOnHover(true, "class0", event, d);
//     })
//     .on("mouseout", (event, d) => {
//       if (d.isClicked) return;
//       highlightOneOnHover(false, "class0", event, d);
//     })
//     .on("click", (event, d) => {
//       d.isClicked = true;
//       highlightOneOnHover(true, "class0", event, d);
//       nextTick(() => store.setFiles([[d.data.fullText], []]));
//       watch(
//         clearFlag,
//         () => {
//           highlightOneOnHover(false, "class0", event, d);
//         },
//         { once: true }
//       );
//     });

//   svg
//     .append("text")
//     .attr("x", 0)
//     .attr("y", -70)
//     .attr("text-anchor", "left")
//     .style("font-size", "x-large")
//     .style("fill", "grey")
//     .style("max-width", 400)
//     .text(`Clustering Dendrogram: ${months[store.getMonthsSelected - 1]}`);

//   // Custom path generator
//   function elbow(d) {
//     return (
//       "M" +
//       d.source.x +
//       "," +
//       transformY(d.source) +
//       "H" +
//       d.target.x +
//       "V" +
//       transformY(d.target)
//     );
//   }

//   return svg.node();
// }
</script>
