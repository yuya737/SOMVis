<template>
  <div class="relative h-full w-full">
    <Dropdown
      v-model="selectedMonth"
      :options="months"
      optionLabel="name"
      placeholder="Select a Month"
      class="absolute left-0 top-0 z-[2] m-4 w-fit bg-gray-200 text-lg text-black"
    />
    <!-- <Button
      class="absolute left-0 top-0 z-[2] m-4 w-fit transform rounded-md bg-gray-200 p-2 text-lg text-black"
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
    <div id="my_dataviz" class="flex h-full w-full justify-around" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from "vue";
import { useStore } from "@/store/main";
import API from "@/API/api";
import * as d3 from "d3";

import {
  sspAllLabels,
  dataset_name,
  timeType,
  timeTypeMonths,
} from "./utils/utils";

const props = defineProps({
  time_type: timeType,
});

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
  if (!timeTypeMonths[timeType.OctMay].includes(month)) {
    console.log("Invalid month");
    return;
  }
  const { distances } = await API.fetchData("distance_matrix", true, {
    members: sspAllLabels,
    dataset_type: dataset_name,
    time_type: props.time_type,
    subsetType: store.getSubsetType,
    // months: store.getMonthsSelected,
    months: [month],
    years: store.getYearsSelected,
  });
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

  const labelsReordered = store.clusterOrders[month].map((i) =>
    i < 0 ? { model_name: "DUMMY", ssp: "DUMMY" } : sspAllLabels[i]
  );

  const bracketIndices = [
    -1,
    ...labelsReordered
      .map((d, i) => (d.model_name == "DUMMY" ? i : null))
      .filter((d) => d !== null),
  ];
  console.log("DEBUG bracketIndices", bracketIndices);

  let data = distances.flat().map((item, index) => ({
    value: item,
    row: labelsReordered[
      store.clusterOrders[month].indexOf(index % sspAllLabels.length)
    ],
    col: labelsReordered[
      store.clusterOrders[month].indexOf(
        Math.floor(index / sspAllLabels.length)
      )
    ],
  }));
  console.log("DEBUG labelsReordered", labelsReordered);

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
    .text((d) => (d.model_name == "DUMMY" ? "" : `${d.model_name}:${d.ssp}`))
    .style("fill", (d) => {
      return d.ssp == "historical" ? "midnightblue" : "firebrick";
      // return stripSOMprefix(d).includes("historical")
      //   ? "midnightblue"
      //   : "firebrick";
    })
    .attr("id", (d) => "label_x" + `${d.model_name}:${d.ssp}`)
    .attr("transform", "rotate(-45)") // Rotate each text element by -45 degrees
    .style("text-anchor", "end") // Align the text to the end of the text element (right side when not rotated)
    .style("font-size", "small");

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
      return d.ssp == "historical" ? "midnightblue" : "firebrick";
      // return stripSOMprefix(d).includes("historical")
      //   ? "midnightblue"
      //   : "firebrick";
    })
    // change text
    .text((d) => (d.model_name == "DUMMY" ? "" : `${d.model_name}:${d.ssp}`))
    .attr("id", (d) => "label_y" + `${d.model_name}:${d.ssp}`)
    .style("font-size", "small")
    .on("click", (event, d) => {
      store.monthsSelected = [selectedMonth.value.value];
      store.setFiles({ group1: [d], group2: [] });
    })
    .on("mouseover", (event, d) => {
      // d.isClicked = false;
      // highlightOneOnHover(true, "class0", event, `${d.model_name}:${d.ssp}`);
    })
    .on("mouseleave", (event, d) => {
      // if (d.isClicked) return;
      // highlightOneOnHover(false, "class0", event, `${d.model_name}:${d.ssp}`);
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

  let bracketData = [];
  for (let i = 0; i < bracketIndices.length - 1; i += 1) {
    bracketData.push({
      x1: -margin.left + 50,
      y1: y(labelsReordered[bracketIndices[i] + 1]),
      x2: -margin.left + 50,
      y2: y(labelsReordered[bracketIndices[i + 1]]),
      cluster: i,
    });
  }
  svg
    .selectAll()
    .data(bracketData)
    .join("path")
    .attr("d", function (d) {
      return makeCurlyBrace(d.x1, d.y1, d.x2, d.y2, 25, 0.6);
    })
    .attr("stroke", "black")
    .attr("stroke-width", 3)
    .attr("fill", "none");

  svg
    .selectAll()
    .data(bracketData)
    .join("text")
    .attr("y", -margin.left + 20)
    .attr("x", function (d) {
      return -(
        (y(labelsReordered[bracketIndices[bracketData.indexOf(d)] + 1]) +
          y(labelsReordered[bracketIndices[bracketData.indexOf(d) + 1]])) /
        2
      );
    })
    .attr("text-anchor", "middle")
    .style("font-size", "large")
    .style("fill", "black")
    .style("transform", "rotate(-90deg)")
    .text((d) => `Cluster ${d.cluster + 1}`);

  // add the scale
  // svg
  //   .append("g")
  //   .attr("transform", `translate(${width + 10}, 0)`)
  //   .call(
  //     d3
  //       .axisRight(myColor)
  //       .tickSize(5)
  //       .tickFormat((d) => Math.round(d))
  //   );
  // svg
  // .append("g")
  // .attr("transform", `translate(0,${margin.top})`)
  // .call(colorAxisTop(myColor).range([margin.left, width - margin.right]));

  return svg.node();
}
function colorAxisTop(scale) {
  var rampSteps = 64,
    rampSize = 24,
    x = d3.scaleLinear(),
    x0 = 0,
    x1 = 1,
    xAxis = d3.axisTop(x);

  function colorAxis(selection) {
    var domain = scale.domain(),
      context = DOM.context2d(rampSteps, 1, 1);

    // Render the axis.
    x.domain([domain[0], domain[domain.length - 1]]).range([x0, x1]);
    selection.call(xAxis);

    // Render the color ramp.
    x.range([0, 1]);
    for (var i = 0; i < rampSteps; ++i) {
      context.fillStyle = scale(x.invert(i / (rampSteps - 1)));
      context.fillRect(i, 0, 1, 1);
    }

    var image = selection.selectAll("image").data([null]);

    image = image
      .enter()
      .insert("image", "*")
      .attr("preserveAspectRatio", "none")
      .merge(image);

    image
      .attr("x", x0)
      .attr("width", x1 - x0 + 1)
      .attr("height", rampSize)
      .attr("xlink:href", context.canvas.toDataURL());
  }

  colorAxis.range = function (_) {
    return arguments.length
      ? ((x0 = +_[0]), (x1 = +_[1]), colorAxis)
      : [x0, x1];
  };

  colorAxis.scale = function (_) {
    return arguments.length ? ((scale = _), colorAxis) : scale;
  };

  colorAxis.rampSteps = function (_) {
    return arguments.length ? ((rampSteps = +_), colorAxis) : rampSteps;
  };

  colorAxis.rampSize = function (_) {
    return arguments.length ? ((rampSize = +_), colorAxis) : rampSize;
  };

  function extendAxis(method) {
    colorAxis[method] = function () {
      var result = xAxis[method].apply(xAxis, arguments);
      return result === xAxis ? colorAxis : result;
    };
  }

  extendAxis("ticks");
  extendAxis("tickArguments");
  extendAxis("tickValues");
  extendAxis("tickFormat");
  extendAxis("tickSize");
  extendAxis("tickSizeInner");
  extendAxis("tickSizeOuter");
  extendAxis("tickPadding");

  return colorAxis;
}

function makeCurlyBrace(x1, y1, x2, y2, w, q) {
  //Calculate unit vector
  var dx = x1 - x2;
  var dy = y1 - y2;
  var len = Math.sqrt(dx * dx + dy * dy);
  dx = dx / len;
  dy = dy / len;

  //Calculate Control Points of path,
  var qx1 = x1 + q * w * dy;
  var qy1 = y1 - q * w * dx;
  var qx2 = x1 - 0.25 * len * dx + (1 - q) * w * dy;
  var qy2 = y1 - 0.25 * len * dy - (1 - q) * w * dx;
  var tx1 = x1 - 0.5 * len * dx + w * dy;
  var ty1 = y1 - 0.5 * len * dy - w * dx;
  var qx3 = x2 + q * w * dy;
  var qy3 = y2 - q * w * dx;
  var qx4 = x1 - 0.75 * len * dx + (1 - q) * w * dy;
  var qy4 = y1 - 0.75 * len * dy - (1 - q) * w * dx;

  return (
    "M " +
    x1 +
    " " +
    y1 +
    " Q " +
    qx1 +
    " " +
    qy1 +
    " " +
    qx2 +
    " " +
    qy2 +
    " T " +
    tx1 +
    " " +
    ty1 +
    " M " +
    x2 +
    " " +
    y2 +
    " Q " +
    qx3 +
    " " +
    qy3 +
    " " +
    qx4 +
    " " +
    qy4 +
    " T " +
    tx1 +
    " " +
    ty1
  );
}
</script>
