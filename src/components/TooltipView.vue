<template>
  <!-- <div
    id="memberViewerLegend"
    class="flex flex-row justify-evenly items-center my-2"
  ></div> -->
  <DataTable
    :value="membersWithMean"
    scrollable
    scrollHeight="400px"
    showGridlines
    class="w-fit"
  >
    <Column field="model_name" sortable header="Model Name"></Column>
    <!-- <Column field="variant" sortable header="Variant"></Column> -->
    <Column field="ssp" sortable header="SSP Type">
      <template #body="slotProps">
        <Tag
          :value="slotProps.data.ssp"
          :style="{
            backgroundColor: setSSPColors(slotProps.data),
            color: '#fff',
          }"
        />
      </template>
    </Column>
    <!-- <Column field="mean" sortable header="Mean(Δhistorical)" class="w-fit">
      <template #body="slotProps">
        <span class="inline-flex items-center justify-between w-full">
          {{ formatScientificNotation(slotProps.data) }}
          <svg width="20" height="20" style="margin-right: 8px">
            <rect
              width="20"
              height="20"
              :style="computeBoxColor(slotProps.data.mean)"
            />
          </svg>
        </span>
      </template>
    </Column> -->
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Column from "primevue/column";

import { computed, onMounted, ref, watch } from "vue";
import API from "@/api/api";
import { computedAsync } from "@vueuse/core";
import { dataset_name, sspAllLabels } from "./utils/utils";
import * as d3 from "d3";

// Emit the close event to the parent component

let monthlyMeanMin = Infinity;
let monthlyMeanMax = -Infinity;

const setSSPColors = (member) => {
  if (member.ssp === "historical") {
    return "forestgreen";
  } else if (member.ssp === "ssp245") {
    return "steelblue";
  } else if (member.ssp === "ssp370") {
    return "darkkhaki";
  } else if (member.ssp === "ssp585") {
    return "crimson";
  }
};

const props = defineProps<{
  members: EnsembleMember[];
  month: number;
}>();

function computeBoxColor(mean) {
  // console.log("DEBUG: ", monthlyMeanMax, monthlyMeanMin, mean);
  let color = d3
    .scaleDiverging(d3.interpolateBrBG)
    .domain([monthlyMeanMin, 0, monthlyMeanMax])(mean);
  // .replace(/[^\d,]/g, "")
  // .split(",")
  // .map((d) => Number(d));
  let ret = `fill: ${color}`;
  // console.log("DEBUG: ", ret);
  return ret;
}

// Method to format numbers in scientific notation
const formatScientificNotation = (rowData) => {
  const mean = rowData.mean;
  if (mean !== null && mean !== undefined) {
    return mean.toExponential(4); // Adjust the number of decimal places as needed
  }
  return mean;
};
const getSeverity = (ssp) => {
  if (ssp === "historical") {
    return "secondary";
  } else if (ssp === "ssp245") {
    return "info";
  } else if (ssp === "ssp370") {
    return "warn";
  } else if (ssp === "ssp585") {
    return "danger";
  }
};

const membersWithMean = computedAsync(async () => {
  let ret = [];
  let promises = props.members.map(async (member) => {
    const { means } = await API.fetchData("get_all_means", true, {
      dataset_type: dataset_name,
      members: [member],
      // members: sspAllLabels,
      months: [props.month],
      years: [-1],
    });

    ret.push({
      ...member,
      mean: means,
    });
  });

  let perMemberMeans = sspAllLabels.map(async (member) => {
    const { means } = await API.fetchData("get_all_means", true, {
      dataset_type: dataset_name,
      members: [member],
      // members: sspAllLabels,
      months: [props.month],
      years: [-1],
    });
    console.log("DEBUG MEAN", member, means);
    if (means !== null && means !== undefined) {
      monthlyMeanMin = Math.min(monthlyMeanMin, means);
      monthlyMeanMax = Math.max(monthlyMeanMax, means);
    }
  });
  await Promise.all([...promises, ...perMemberMeans]);
  console.log("Members with mean", ret);
  // drawLegend();
  return ret.sort((a, b) => a.model_name.localeCompare(b.model_name));
});

watch(
  () => membersWithMean,
  (val) => {
    console.log("Members with mean updated", val);
  }
);
// function drawLegend() {
//   const numBoxes = 7;
//   let color = d3
//     .scaleDiverging(d3.interpolateBrBG)
//     .domain([monthlyMeanMin, 0, monthlyMeanMax]);
//   const legendData = Array.from({ length: numBoxes }, (_, i) => {
//     console.log(
//       (i / numBoxes) * (monthlyMeanMax - monthlyMeanMin) + monthlyMeanMin,
//       monthlyMeanMax,
//       monthlyMeanMin
//     );
//     return color(
//       (i / numBoxes) * (monthlyMeanMax - monthlyMeanMin) + monthlyMeanMin
//     );
//   });
//   console.log("DEBUG: LGEND", legendData);

//   // Check if the legend already exists
//   if (document.getElementById("memberViewerLegend")) {
//     document.getElementById("memberViewerLegend").innerHTML = "";
//   }

//   const legendItems = d3
//     .select("#memberViewerLegend")
//     .selectAll(".legend-item")
//     .data(legendData)
//     .join("div")
//     .attr("class", "legend-item");

//   // Add colored boxes
//   legendItems
//     .append("svg")
//     .attr("width", 20)
//     .attr("height", 20)
//     .append("rect")
//     .attr("width", 20)
//     .attr("height", 20)
//     .style("fill", (d) => d);

//   // Add labels
//   legendItems
//     .append("text")
//     .style("font-size", "0.8rem")
//     .attr("text-anchor", "end") // Align text properly
//     .text((d, i) =>
//       (
//         (i / numBoxes) * (monthlyMeanMax - monthlyMeanMin) +
//         monthlyMeanMin
//       ).toExponential(1)
//     );
// }

// // Add a title to the legend
// svg.append("text")
//   .attr("x", legendWidth / 2)
//   .attr("y", 20)
//   .attr("text-anchor", "middle")
//   .text("Color Legend");
</script>

<style>
/* Remove padding from DataTable cells */
.p-datatable-tbody > tr > td {
  padding: 0.25rem 0.25rem;
}

/* Optionally, remove padding from header and footer cells */
.p-datatable-thead > tr > th,
.p-datatable-tfoot > tr > td {
  padding: 0.25rem 0.25rem;
}
</style>
