<template>
  <div id="my_dataviz" class="h-full w-full" />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useStore } from "@/store/main";
import API from "@/api/api";
import * as d3 from "d3";

import { ssp370Labels, historicalLabels, getModelType } from "./utils/utils";

const store = useStore();

onMounted(() => {
  window.onload = () => {
    const element = document.getElementById("my_dataviz");
    if (element) {
      setup();
    }
  };
});

async function setup() {
  // set the dimensions and margins of the graph
  const margin = { top: 80, right: 25, bottom: 100, left: 150 };
  // print this elements' width and height
  const fullHW = Math.min(
    document.getElementById("my_dataviz").clientWidth,
    document.getElementById("my_dataviz").clientHeight
  );
  console.log(
    document.getElementById("my_dataviz").clientWidth,
    document.getElementById("my_dataviz").clientHeight
  );

  console.log(fullHW);

  const width = fullHW - margin.left - margin.right;
  const height = fullHW - margin.top - margin.bottom;

  // append the svg object to the body of the page
  const svg = d3
    .select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  let distance_matrix = await API.fetchData("distance_matrix", true, {
    files: ssp370Labels,
    months: [7],
    years: [-1],
  });
  let data = distance_matrix.flat().map((item, index) => ({
    value: item,
    row: getModelType(ssp370Labels[index % ssp370Labels.length]),
    col: getModelType(ssp370Labels[Math.floor(index / ssp370Labels.length)]),
  }));
  console.log("SDFD", distance_matrix, historicalLabels);

  // //Read the data
  // d3.csv(
  //   "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/heatmap_data.csv"
  // ).then(function (data) {
  //   // Labels of row and columns -> unique identifier of the column called 'group' and 'variable'
  //   const myGroups = Array.from(new Set(data.map((d) => d.group)));
  //   const myVars = Array.from(new Set(data.map((d) => d.variable)));

  // Build X scales and axis:
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(ssp370Labels.map((i) => getModelType(i)))
    .padding(0.05);
  svg
    .append("g")
    .style("font-size", 15)
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .select(".domain")
    .remove();
  svg
    .selectAll(".tick text") // Select all text elements under elements with class 'tick'
    .attr("transform", "rotate(-45)") // Rotate each text element by -45 degrees
    .style("text-anchor", "end"); // Align the text to the end of the text element (right side when not rotated)

  // Build Y scales and axis:
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(ssp370Labels.map((i) => getModelType(i)))
    .padding(0.05);
  svg
    .append("g")
    .style("font-size", 15)
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  // Build color scale
  const myColor = d3
    .scaleSequential()
    .interpolator(d3.interpolateViridis)
    .domain([0, 150]);

  // create a tooltip
  const tooltip = d3
    .select("#my_dataviz")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("position", "absolute")
    .style("width", "fit-content");

  // Three function that change the tooltip when user hover / move / leave a cell
  const mouseover = function (event, d) {
    tooltip.style("opacity", 1).style("z-index", 1);
    d3.select(this).style("stroke", "black").style("opacity", 1);
  };
  const mousemove = function (event, d) {
    tooltip
      .html("Cell is: " + d.value)
      .style("left", event.clientX + "px")
      .style("top", event.clientY + "px");
  };
  const mouseleave = function (event, d) {
    tooltip.style("opacity", 0).style("z-index", -1);
    d3.select(this).style("stroke", "none").style("opacity", 0.8);
  };

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
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
  // });

  // Add title to graph
  svg
    .append("text")
    .attr("x", 0)
    .attr("y", -50)
    .attr("text-anchor", "left")
    .style("font-size", "xx-large")
    .text("California Precipitation");

  // Add subtitle to graph
  svg
    .append("text")
    .attr("x", 0)
    .attr("y", -20)
    .attr("text-anchor", "left")
    .style("font-size", "large")
    .style("fill", "grey")
    .style("max-width", 400)
    .text("Very fun ");
}
</script>
