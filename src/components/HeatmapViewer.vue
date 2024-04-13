<template>
  <div id="my_dataviz" class="h-full w-full flex justify-around" />
</template>

<script setup lang="ts">
import { agnes } from "ml-hclust";

import { onMounted, watch } from "vue";
import { useStore } from "@/store/main";
import API from "@/api/api";
import * as d3 from "d3";

import {
  ssp370Labels,
  historicalLabels,
  getModelType,
  stripSOMprefix,
  getNodeOrder,
} from "./utils/utils";

const store = useStore();
const labels = ssp370Labels.map((i) => getModelType(i));
const fullLabels = ssp370Labels.map((i) => stripSOMprefix(i));
let tree;

onMounted(() => {
  window.onload = () => {
    const element = document.getElementById("my_dataviz");
    if (element) {
      draw();
    }
  };
});

watch(
  () => [store.getYearsSelected, store.getMonthsSelected],
  async () => draw()
);

async function draw() {
  const { distances, dendrogram } = await API.fetchData(
    "distance_matrix",
    true,
    {
      files: ssp370Labels,
      months: store.getMonthsSelected,
      years: store.getYearsSelected,
    }
  );
  let svgHeatmap = make_heatmap(distances);
  console.log("SDF", svgHeatmap);
  let svgDendrogram = make_dendrogram({
    width:
      document.getElementById("my_dataviz").clientWidth -
      document.getElementById("my_dataviz").clientHeight -
      150,
    height: document.getElementById("my_dataviz").clientHeight,
    yLabel: "Distance",
    strokeWidth: 5,
  });
  console.log("Files, years, or months changed. Redrawing heatmap.");
  document.getElementById("my_dataviz").innerHTML = "";
  document.getElementById("my_dataviz").appendChild(svgHeatmap);
  document.getElementById("my_dataviz").appendChild(svgDendrogram);
}

function make_dendrogram(options = {}) {
  const {
    width: width = 420,
    height: height = 320,
    hideLabels: hideLabels = false,
    paddingBottom: paddingBottom = hideLabels ? 20 : 250,
    innerHeight = height - paddingBottom,
    innerWidth = width - 10,
    paddingLeft = 70,
    h: cutHeight = undefined,
    yLabel: yLabel = "↑ Height",
    colors: colors = d3.schemeTableau10,
    fontFamily: fontFamily = "sans-serif",
    linkColor: linkColor = "grey",
    fontSize: fontSize = 15,
    strokeWidth: strokeWidth = 3,
  } = options;

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, innerHeight])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("id", "dendrogram");

  svg.append("style").text(`
  .link--active {
    stroke: #000 !important;
    stroke-opacity: 1 !important;
    stroke-width: 6px;
  }
  .label--active {
    font-weight: bold;
  }
  .cmp--node--active {
    r: 10;
  }
  .rect--active {
    opacity: 1;
  }
  .rect--inactive {
    opacity: 0.2;
  }
  }`);

  var clusterLayout = d3
    .cluster()
    .size([width - paddingLeft * 2, innerHeight])
    .separation(() => 2);

  const root = d3.hierarchy(tree);
  const maxHeight = root.data.height;
  // debugger;

  const yScaleLinear = d3
    .scaleLinear()
    .domain([0, maxHeight])
    .range([hideLabels ? innerHeight - 35 : innerHeight, 0]);

  const yAxisLinear = d3.axisLeft(yScaleLinear).tickSize(5);

  function transformY(data) {
    const height = hideLabels ? innerHeight - 15 : innerHeight;
    return height - (data.data.height / maxHeight) * height;
  }

  // traverse through first order children and assign colors
  if (cutHeight) {
    let curIndex = -1;
    root.each((child) => {
      if (
        child.data.height <= cutHeight &&
        child.data.height > 0 &&
        child.parent &&
        !child.parent.color
      ) {
        curIndex++;
        child.color = colors[curIndex];
      } else if (child.parent && child.parent.color) {
        child.color = child.parent.color;
      }
    });
  }

  clusterLayout(root);

  // y-axis
  svg
    .append("g")
    .attr("transform", `translate(0, ${hideLabels ? 20 : 0})`)
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${paddingLeft},${hideLabels ? 20 : 0})`)
    .call(yAxisLinear)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .append("text")
        .attr("x", -paddingLeft)
        .attr("y", -20)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .style("font-family", fontFamily)
        .style("font-size", fontSize)
        .text(yLabel)
    )
    .selectAll(".tick")
    .classed("baseline", (d) => d == 0)
    .style("font-size", fontSize)
    .style("font-family", fontFamily);

  // Links
  const link = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.25)
    .attr("stroke-width", `${strokeWidth}px`)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .each(function (d) {
      d.target.linkNode = this;
    })
    .attr("d", elbow)
    .attr("transform", `translate(${paddingLeft}, ${hideLabels ? 20 : 0})`);

  debugger;
  svg
    .append("g")
    .selectAll("circle")
    .data(root.links())
    .join("circle")
    .attr("r", 6)
    .attr("cx", (d) => d.source.x)
    .attr("cy", (d) => transformY(d.source))
    .attr("transform", `translate(${paddingLeft}, ${hideLabels ? 20 : 0})`)
    .attr("fill", "black")
    .each(
      (d) =>
        (d.children = [
          getChildren(d.source.children[0]).map((d) => fullLabels[d]),
          getChildren(d.source.children[1]).map((d) => fullLabels[d]),
        ])
    )
    .on("mouseover", function (event, d) {
      d3.select(d.target.linkNode).classed("link--active", true);
      d3.select(this).classed("cmp--node--active", true);
    })
    .on("mouseout", function (event, d) {
      console.log(d.target);
      d3.select(d.target.linkNode).classed("link--active", false);
      d3.select(this).classed("cmp--node--active", false);
    });

  console.log(root.links());

  function getChildren(node, listSoFar = []) {
    if (node.children) {
      getChildren(node.children[0], listSoFar);
      getChildren(node.children[1], listSoFar);
    } else {
      listSoFar.push(node.data.index);
    }
    return listSoFar;
  }
  // root.links().map((d) => console.log(getNodeOrder(d.source)));

  // Nodes
  svg
    .append("g")
    .selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("dx", -4)
    .attr("dy", 20)
    .attr("text-anchor", "end")
    .style("font-size", fontSize)
    .style("font-family", fontFamily)
    .text((d) => labels[d.data.index])
    .each(function (d) {
      d.data.text = labels[d.data.index];
      d.data.fullText = fullLabels[d.data.index];
    })
    .attr(
      "transform",
      (d) => `translate(${d.x + paddingLeft},${transformY(d)}) rotate(315)`
    )
    .attr("id", (d) => "node" + d.data.text)
    .on("mouseover", highlight(true))
    .on("mouseout", highlight(false));

  svg
    .append("text")
    .attr("x", 0)
    .attr("y", -70)
    .attr("text-anchor", "left")
    .style("font-size", "x-large")
    .style("fill", "grey")
    .style("max-width", 400)
    .text(`Dendrogram: ${store.getMonthsSelected}`);

  // Custom path generator
  function elbow(d) {
    return (
      "M" +
      d.source.x +
      "," +
      transformY(d.source) +
      "H" +
      d.target.x +
      "V" +
      transformY(d.target)
    );
  }

  return svg.node();
}
function highlight(active) {
  return function (event, d) {
    if (d?.data?.text) {
      d = d.data.text;
    }
    store.setHoveredFile(active ? fullLabels[labels.indexOf(d)] : null);
    d3.selectAll("text#node" + d).classed("label--active", active);
    d3.selectAll("text#tick" + d).classed("label--active", active);

    if (active) {
      d3.selectAll("rect").style("opacity", "0.2");
      d3.selectAll("rect#rect" + d).style("opacity", "1");
    } else {
      d3.selectAll("rect").style("opacity", "0.8");
    }

    let dendrogramLeaf = d3.select("text#node" + d).data()[0];
    d3.select(dendrogramLeaf.linkNode).classed("link--active", active).raise();
    do
      d3.select(dendrogramLeaf.linkNode)
        .classed("link--active", active)
        .raise();
    while ((d = d.parent));
  };
}

function make_heatmap(distances) {
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

  svg.append("style").text(`
  .link--active {
    stroke: #000 !important;
    stroke-opacity: 1 !important;
    stroke-width: 5px;
  }
  .label--active {
    font-weight: bold;
  }
  .rect--active {
    opacity: 1;
  }
  .rect--inactive {
    opacity: 0.2;
  }
  }`);

  tree = agnes(distances, {
    method: "average",
  });
  let data = distances.flat().map((item, index) => ({
    value: item,
    row: getModelType(ssp370Labels[index % ssp370Labels.length]),
    col: getModelType(ssp370Labels[Math.floor(index / ssp370Labels.length)]),
  }));
  const dendrogramOrder = getNodeOrder(tree, []);
  const labelsReordered = dendrogramOrder.map((i) => ssp370Labels[i]);

  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(labelsReordered.map((i) => getModelType(i)))
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
    .domain(labelsReordered.map((i) => getModelType(i)))
    .padding(0.05);
  const yAxis = svg
    .append("g")
    .style("font-size", 15)
    .call(d3.axisLeft(y).tickSize(0));

  yAxis
    .selectAll(".tick text") // Select all tick elements
    .attr("id", (d) => "tick" + d)
    .on("mouseover", highlight(true))
    .on("mouseleave", highlight(false));
  yAxis.select(".domain").remove();

  // Build color scale
  const myColor = d3
    .scaleSequential()
    .interpolator(d3.interpolateReds)
    .domain([0, Math.max(...distances.flat())]);

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

  // // Three function that change the tooltip when user hover / move / leave a cell
  // const mouseover = function (event, d) {
  //   tooltip.style("opacity", 1).style("z-index", 1);
  //   d3.select(this).style("stroke", "black").style("opacity", 1);
  // };
  // const mousemove = function (event, d) {
  //   tooltip
  //     .html("Cell is: " + d.value)
  //     .style("left", event.clientX + "px")
  //     .style("top", event.clientY + "px");
  // };
  // const mouseleave = function (event, d) {
  //   tooltip.style("opacity", 0).style("z-index", -1);
  //   d3.select(this).style("stroke", "none").style("opacity", 0.8);
  // };

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
      return "rect" + d.row;
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
</script>
