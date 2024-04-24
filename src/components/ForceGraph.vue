<template>
  <div class="relative h-full w-full">
    <Button
      class="absolute left-0 top-0 z-[2] m-4 w-fit transform rounded-md bg-gray-200 p-4 text-lg font-bold text-black"
      label="Clear"
      icon="pi pi-times"
      @click="clearSelections"
    />
    <div id="my_dataviz" class="h-full w-full flex justify-around" />
  </div>
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
import { LineLayer } from "deck.gl/typed";

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

function clearSelections() {
  store.setFiles([[], []]);
  store.setHoveredFile(null);
  d3.selectAll('text[id^="tick"]').classed("label--not--active", true);
  d3.selectAll('text[id^="node"]').classed("label--not--active", true);
  d3.selectAll('rect[id^="rect"]').classed("rect--not--active", true);
}

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
  let labels = ssp370Labels.map((i) => getModelType(i));
  // let svgGraph = makeGraph(distances);
  let distanceLinks = distances
    .flat()
    .map((d, i) => {
      return {
        source: labels[Math.floor(i / ssp370Labels.length)],
        target: labels[i % ssp370Labels.length],
        value: d / 1000,
      };
    })
    .filter((d) => d.value > 0.15);
  let data = {
    nodes: ssp370Labels.map((d, i) => {
      return {
        id: labels[i],
        group: i,
      };
    }),
    links: distanceLinks,
  };
  console.log("Data", data);
  let svgGraph = ForceGraph(data, {
    nodeId: (d) => d.id,
    nodeGroup: (d) => d.group,
    nodeTitle: (d) => `${d.id}\n${d.group}`,
    nodeStrength: -2000,
    width: 600,
    height: 600,
  });
  let tree = agnes(distances, {
    method: "average",
  });
  let svgTree = ForceTree(
    tree,
    distances,
    ssp370Labels.map((i) => getModelType(i))
  );
  // let svgHeatmap = make_heatmap(distances);
  // console.log("SDF", svgHeatmap);
  // let svgDendrogram = make_dendrogram({
  //   width:
  //     document.getElementById("my_dataviz").clientWidth -
  //     document.getElementById("my_dataviz").clientHeight -
  //     30,
  //   height: document.getElementById("my_dataviz").clientHeight,
  //   yLabel: "Distance",
  //   strokeWidth: 5,
  // });
  // console.log("Files, years, or months changed. Redrawing heatmap.");
  document.getElementById("my_dataviz").innerHTML = "";
  // document.getElementById("my_dataviz").appendChild(svgGraph);
  document.getElementById("my_dataviz").appendChild(svgTree);
  // document.getElementById("my_dataviz").appendChild(svgDendrogram);
}

function ForceTree(data, distances, labels) {
  // Specify the chart’s dimensions.
  const width = 928;
  const height = 600;

  const drag = (simulation) => {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  // Compute the graph and start the force simulation.
  const root = d3.hierarchy(data);
  const depth = 7;
  let heightCutoff = root
    .descendants()
    .map((d) => d.data.height)
    .sort((a, b) => b - a)[depth - 2];
  console.log("Height cutoff", heightCutoff);

  // collapse after depth = 5
  const collapse = (node) => {
    if (node.children && node.data.height < heightCutoff) {
      node._children = node.children;
      node._children.forEach(collapse);
      node.children = null;
    } else if (node.children) {
      node.children.forEach(collapse);
    }
  };
  root.children.forEach(collapse);
  let links = root.links();
  const nodes = root.descendants();

  console.log(links);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  let simulation = d3
    .forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-500));
  draw();

  function draw() {
    // simulation.nodes(root.descendants().map((d) => Object.create(d)));
    simulation.nodes(root.descendants());
    let forces = root
      .descendants()
      .filter((d) => d.children)
      .map((d, i) => {
        return {
          children: getChildren(d, []),
          index: d.index,
        };
      });
    // iterate over every pair in forces
    let tem = [];
    forces.forEach((d, i) => {
      forces.forEach((e, j) => {
        if (i != j) {
          let temp = 0;
          d.children.forEach((child) => {
            e.children.forEach((child2) => {
              temp += distances[child.data.index][child2.data.index] / 500;
            });
          });
          tem.push({
            source: d,
            target: e,
            value: 0.01,
            // value: d.children.length * e.children.length,
            // value: temp / (d.children.length * e.children.length),
          });

          // simulation.force(
          //   "link",
          //   d3
          //     .forceLink(links)
          //     .id((d) => d.index)
          //     .distance(temp / (d.children.length + e.children.length))
          // );
        }
      });
    });
    console.log(tem);

    links = root.links();
    links.forEach((d) => {
      d.sourceIndices = getChildren(d.source, [])
        .flat()
        .filter((d) => d)
        .filter((d) => d.data.isLeaf)
        .map((d) => d.data.index);
      d.targetIndices = getChildren(d.target, [])
        .flat()
        .filter((d) => d)
        .filter((d) => d.data.isLeaf)
        .map((d) => d.data.index);
      // every pair of source and target indices
      let temp = 0;
      d.sourceIndices.forEach((sourceIndex) => {
        d.targetIndices.forEach((targetIndex) => {
          if (distances[sourceIndex][targetIndex] / 5 > temp) {
            temp += distances[sourceIndex][targetIndex] / 5;
          }
        });
      });
      d.value = temp / (d.sourceIndices.length * d.targetIndices.length);
      console.log(d.value);
      // d.value = 1;
      d.source = d.source.index;
      d.target = d.target.index;
    });
    simulation.force(
      "link",
      d3.forceLink(links).strength((d) => 1 / d.value)
    );
    simulation.restart();
    // simulation.force(
    //   "link",
    //   d3
    //     .forceLink(tem)
    //     .id((d) => d.index)
    //     .strength((d) => d.value)
    // );
    console.log(links);
    // simulation.force("link").links(links);
    const link = svg
      .selectAll("line")
      .data(links, (d) => d)
      .join(
        (enter) => enter.append("line"),
        (exit) => {
          return exit.remove();
        }
      )
      .attr("stroke", "#999")
      .attr("stroke-width", 5)
      .attr("stroke-opacity", 0.6)
      .on("mouseover", (event, d) => console.log(d.value));

    const textElements = svg
      .selectAll("text")
      .data(root.descendants(), (d) => d)
      .join(
        (enter) => enter.append("text"),
        (exit) => {
          return exit.remove();
        }
      )
      .text((node) => {
        if (node.index == 0) {
          return "Root";
        } else if (node.data.isLeaf) {
          return labels[node.data.index];
        } else if (node._children) {
          console.log(getChildren(node, []).flat());
          return getChildren(node, [])
            .flat()
            .filter((d) => d.data)
            .filter((d) => d.data.isLeaf)
            .map((d) => labels[d.data.index])
            .join(", ");
        }
      })
      .attr("font-size", 15)
      .attr("dx", 15)
      .attr("dy", 4);

    // Append nodes.
    const node = svg
      .selectAll("circle")
      .data(root.descendants(), (d) => d)
      .join(
        (enter) => enter.append("circle"),
        (exit) => {
          return exit.remove();
        }
      )
      .attr("fill", (d) =>
        d.children ? "#1b9e77" : d._children ? "#d95f02" : "#7570b3"
      )
      .attr("stroke", (d) => (d.children ? "#000" : "#fff"))
      .attr("r", (d) => (d.index == 0 ? 15 : 10))
      .attr("stroke-width", 1.5)
      .call(drag(simulation))
      .on("click", click());

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      textElements.attr("x", (node) => node.x).attr("y", (node) => node.y);
    });
  }

  function click() {
    return function (event, d) {
      if (event.defaultPrevented) return; // ignore drag
      console.log("SDFSDF", event);
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      // if (!event.active) simulation.alphaTarget(0.3).restart();
      draw();
    };
  }

  // invalidation.then(() => simulation.stop());

  return svg.node();
}
// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraph(
  {
    nodes, // an iterable of node objects (typically [{id}, …])
    links, // an iterable of link objects (typically [{source, target}, …])
  },
  {
    nodeId = (d) => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
    nodeStrength,
    linkSource = ({ source }) => source, // given d in links, returns a node identifier string
    linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    invalidation, // when this promise resolves, stop the simulation
  } = {}
) {
  // Compute values.
  const N = d3.map(nodes, nodeId).map(intern);
  const R = typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W =
    typeof linkStrokeWidth !== "function"
      ? null
      : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (_, i) => ({ id: N[i] }));
  links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id(({ index: i }) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", d3.forceCenter())
    .on("tick", ticked);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const link = svg
    .append("g")
    .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
    .attr("stroke-opacity", linkStrokeOpacity)
    .attr(
      "stroke-width",
      typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null
    )
    .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(links)
    .join("line");

  const node = svg
    .append("g")
    .attr("fill", nodeFill)
    .attr("stroke", nodeStroke)
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", nodeRadius)
    .call(drag(simulation));

  const textElements = svg
    .append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text((node) => node.id)
    .attr("font-size", 15)
    .attr("dx", 15)
    .attr("dy", 4);

  if (W) link.attr("stroke-width", ({ index: i }) => W[i]);
  if (L) link.attr("stroke", ({ index: i }) => L[i]);
  if (G) node.attr("fill", ({ index: i }) => color(G[i]));
  if (R) node.attr("r", ({ index: i }) => R[i]);
  if (T) node.append("title").text(({ index: i }) => T[i]);
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object"
      ? value.valueOf()
      : value;
  }

  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    textElements.attr("x", (node) => node.x).attr("y", (node) => node.y);
  }

  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
  return svg.node();
}

function getChildren(node, children) {
  if (node._children) {
    node._children.forEach((d) => getChildren(d, children));
  } else if (node.children) {
    node.children.forEach((d) => getChildren(d, children));
  } else {
    children.push(node);
  }
  return children;
}
// Toggle children on click.
</script>
