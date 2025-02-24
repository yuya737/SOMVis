<template>
  <div
    v-if="props.characteristic.transition == null"
    class="grid max-w-sm grid-cols-[1fr_1fr] place-items-center gap-1"
  >
    <div class="flex flex-col items-center justify-center">
      <span class="font-medium text-gray-600">{{
        props.characteristic.index == -1
          ? "Rest"
          : store.mapAnnotation.features[props.characteristic.index].properties
              ?.name
      }}</span>
      <MapGlyph
        :index-to-highlight="props.characteristic.index"
        :width="70"
        :time_type="props.time_type"
      />
    </div>
    <span class="font-semibold text-blue-600">
      {{
        Math.round(
          (props.characteristic.count / props.characteristic.total) * 100
        )
      }}% out of {{ props.characteristic.total }} <br />
      months
    </span>
  </div>
  <div
    v-else
    class="grid max-w-lg grid-cols-[1fr_1fr_1fr] place-items-center gap-4"
  >
    <div class="flex w-full flex-row items-center justify-between gap-4">
      <!-- <div class="flex w-full flex-row items-center justify-between gap-4">
        <span class="font-medium text-gray-600">{{
          props.characteristic.index == -1
            ? "Rest"
            : store.mapAnnotation.features[props.characteristic.index]
                .properties?.name
        }}</span>
        <MapGlyph
          :index-to-highlight="props.characteristic.index"
          :width="70"
          :time_type="props.time_type"
        />
      </div> -->
      <div class="flex flex-col items-center justify-center">
        <span class="font-medium text-gray-600">{{
          props.characteristic.index == -1
            ? "Rest"
            : store.mapAnnotation.features[props.characteristic.index]
                .properties?.name
        }}</span>
        <MapGlyph
          :index-to-highlight="props.characteristic.index"
          :width="70"
          :time_type="props.time_type"
        />
      </div>
      <!-- <span class="font-semibold text-blue-600">
        {{
          Math.round(
            (props.characteristic.count / props.characteristic.total) * 100
          )
        }}%
      </span> -->
      <span class="font-semibold text-blue-600">
        {{
          Math.round(
            (props.characteristic.count / props.characteristic.total) * 100
          )
        }}% out of {{ props.characteristic.total }} <br />
        months
      </span>
    </div>
    <!-- <div class="flex items-center">
      <i class="pi pi-angle-double-right text-xl" />
    </div> -->
    <div
      class="h-full w-full"
      :id="`CharacteristicsSankey-${props.characteristic.index}`"
    />
    <div class="flex w-full flex-col items-center justify-between gap-4">
      <div
        v-for="t in props.characteristic.transition"
        :key="t.index"
        class="flex w-full items-center justify-between gap-2"
      >
        <!-- <span class="w-fit whitespace-nowrap font-medium text-gray-600">{{
          store.mapAnnotation.features[t.index].properties?.name
        }}</span> -->
        <div
          class="grid w-full grid-cols-[1fr_auto_1fr] place-items-center gap-1"
        >
          <span class="text-sm font-medium text-gray-600">{{
            store.mapAnnotation.features[t.index].properties?.name
          }}</span>
          <MapGlyph
            :index-to-highlight="t.index"
            :width="40"
            :time_type="props.time_type"
          />
          <span class="w-fit font-semibold text-blue-600">
            {{ Math.round(t.percentage * 100) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, watch, computed } from "vue";
import { useStore } from "@/store/main";
import { timeType } from "../utils/utils";
import MapGlyph from "./MapGlyph.vue";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
const props = defineProps<{
  characteristic: {
    index: number;
    count: number;
    total: number;
    transition?: { index: number; percentage: number }[];
  };
  time_type: timeType;
}>();
const store = useStore();
const hasTransition = computed(() => props.characteristic?.transition);
watch(hasTransition, () => nextTick(() => makeSankey()));

function makeSankey() {
  if (props.characteristic.transition == undefined) return;
  // Remove the svg
  const element = document.getElementById(
    `CharacteristicsSankey-${props.characteristic.index}`
  );
  // if (element) element.innerHTML = "";

  console.log("DEBUG ROW", element.clientHeight);

  let nodes = [
    {
      node: `S${props.characteristic.index}`,
      zoneIndex: props.characteristic.index,
    },
  ];
  props.characteristic.transition.forEach((d) => {
    nodes = [...nodes, { node: `T${parseInt(d.index)}`, zoneIndex: d.index }];
  });
  let links = props.characteristic.transition.map((d) => {
    return {
      source: `S${parseInt(props.characteristic.index)}`,
      target: `T${parseInt(d.index)}`,
      value: d.percentage,
    };
  });
  let width = 150;
  let height = element.clientHeight;
  const padding = 10;
  console.log(
    "DEBUG SVG SANKEY",
    d3.select(`#CharacteristicsSankey-${props.characteristic.index}`),
    props.characteristic.index
  );
  let svg = d3
    .select(`#CharacteristicsSankey-${props.characteristic.index}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);
  // Create Sankey layout

  const mySankey = sankey()
    .nodeWidth(10)
    .nodePadding(10)
    .extent([
      [0, padding],
      [width, height - padding],
    ])
    .nodeId((d) => d.node);

  const { nodes: sankeyNodes, links: sankeyLinks } = mySankey({ nodes, links });
  console.log("SANKEY", sankeyLinks, sankeyNodes);

  // Draw links
  const link = svg
    .append("g")
    .selectAll(".link")
    .data(sankeyLinks)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", sankeyLinkHorizontal())
    .style("fill", "none")
    .style("stroke", "#DCDCDC")
    .style("stroke-opacity", 0.5)
    .style("stroke-width", (d) => Math.max(1, d.width)) // Use `d.width`
    .sort((a, b) => b.width - a.width);

  // Draw nodes
  const node = svg
    .append("g")
    .selectAll(".node")
    .data(sankeyNodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  // Add node rectangles
  node
    .append("rect")
    .attr("height", (d) => d.y1 - d.y0) // Correct height calculation
    .attr("width", mySankey.nodeWidth())
    .style("fill", "lightgray")
    .style("stroke", "none");

  // Add node text labels
  node
    .append("text")
    .attr("x", (d) => (d.x0 < width / 2 ? 6 + mySankey.nodeWidth() : -6))
    .attr("y", (d) => (d.y1 - d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("font-size", "small")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
    .text((d) => store.mapAnnotation.features[d.zoneIndex].properties?.name);
}
</script>
