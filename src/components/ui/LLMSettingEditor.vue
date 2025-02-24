<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-lg bg-slate-200 p-2"
  >
    <Button
      icon="pi pi-times"
      class="absolute right-0 top-0 m-2"
      @click="emit('llmSettingClose')"
    />
    <span class="text-md relative font-bold">LLM Summarization Settings </span>
    <span class="text-xs font-light"
      >LLM-based summarization uses ranges to report the trends in the specified
      SOM Node Space region. You can specify the cutoffs that the LLM uses here
      via the sliders below. The values indicate standardized precipitation
      values. -1 indicates 1 standard deviation below the mean and 1 indicates 1
      standard deviation above the mean.</span
    >
    <div class="flex w-full justify-center rounded-lg px-4 py-2">
      <div class="w-3/4">
        <vue-slider
          ref="slider"
          v-model="store.LLMSummaryIntervals"
          class="no-drag"
          :min="minValue"
          :max="maxValue"
          :dot-size="10"
          :process="false"
          interval="0.2"
          :tooltip-formatter="
            (value) => Math.round(roundToNearest0_2(value) * 100) / 100
          "
        />
        <div id="LLMSettingBarSVG" />
      </div>
    </div>
    <span class="text-sm font-medium"
      >Computed Intervals for LLM Summarization</span
    >
    <div class="w-1/2">
      <div class="w-full text-sm">
        <div
          v-for="(item, index) in temp"
          class="flex w-full flex-row items-center justify-between"
          :key="index"
        >
          <div>
            {{ makeLabel(index) }}
          </div>
          <div class="font-bold">
            <!-- {{ Math.round(item * 100) / 100 }} -->
            {{ makeRange(index) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import API from "@/API/api";
import * as d3 from "d3";
import { useStore } from "@/store/main";

import VueSlider from "vue-slider-component";
import "vue-slider-component/theme/default.css";
import { timeType } from "../utils/utils";

const props = defineProps<{ time_type: timeType }>();
const store = useStore();

// const values = ref([0, 0, 0, 0]);
const temp = computed(() => [...store.LLMSummaryIntervals, ""]);

const maxValue = ref(null);
const minValue = ref(null);
const slider = ref();

// const toggleIsOpened = () => (isOpened.value = !isOpened.value);
const emit = defineEmits(["llmSettingClose"]);
const roundToNearest0_2 = (x: number): number => Math.round(x / 0.2) * 0.2;
const round = (item) => Math.round(item * 100) / 100;

function makeLabel(index) {
  if (index == 0) return "Low Precip";
  if (index == 1) return "Moderately Low Precip";
  if (index == 2) return "Neutral Precip";
  if (index == 3) return "Moderately High Precip";
  if (index == 4) return "High Precip";
}

function makeRange(index) {
  if (index == 0) return `< ${round(store.LLMSummaryIntervals[index])}`;
  if (index == 1)
    return `${round(store.LLMSummaryIntervals[0])} ~ ${round(store.LLMSummaryIntervals[1])}`;
  if (index == 2)
    return `${round(store.LLMSummaryIntervals[1])} ~ ${round(store.LLMSummaryIntervals[2])}`;
  if (index == 3)
    return `${round(store.LLMSummaryIntervals[2])} ~ ${round(store.LLMSummaryIntervals[3])}`;
  if (index == 4) return `> ${round(store.LLMSummaryIntervals[3])}`;
}

onMounted(async () => {
  const container = document.getElementById("LLMSettingBarSVG");
  if (!container) return;

  let { min, max } = await API.fetchData("get_extents", true, {
    dataset_type: store.currentDatasetType,
    time_type: props.time_type,
  });
  maxValue.value = roundToNearest0_2(max / 3);
  minValue.value = roundToNearest0_2(min / 3);
  // slider.value.setValue([
  //   (minValue.value / 3) * 2,
  //   minValue.value / 3,
  //   maxValue.value / 3,
  //   (maxValue.value / 3) * 2,
  // ]);

  const width = container.clientWidth;
  const svg = d3
    .select("#LLMSettingBarSVG")
    .append("svg")
    .attr("height", 40)
    .attr("width", width)
    .style("overflow", "visible");
  // Clear previous content
  svg.selectAll("*").remove();
  const colorScale = d3
    .scaleDiverging(d3.interpolateBrBG)
    .domain([minValue.value, 0, maxValue.value]); // Negative → 0 → Positive

  // Create a gradient
  const defs = svg.append("defs");
  const linearGradient = defs
    .append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  // Define gradient stops
  const numStops = 10; // Number of gradient stops
  for (let i = 0; i <= numStops; i++) {
    const t = i / numStops; // Normalized position (0 to 1)
    const value = minValue.value + t * (maxValue.value - minValue.value); // Map to range
    linearGradient
      .append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(value));
  }

  // Append gradient rectangle
  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 10)
    .attr("width", width)
    .attr("height", 10)
    .style("fill", "url(#legend-gradient)");

  // Create scale axis
  const scale = d3
    .scaleLinear()
    .domain([minValue.value, maxValue.value])
    .range([0, width]);

  const axis = d3
    .axisBottom(scale)
    .ticks(5) // Adjust number of ticks
    .tickSize(5);

  svg.append("g").attr("transform", `translate(0, 20)`).call(axis);
});
</script>
