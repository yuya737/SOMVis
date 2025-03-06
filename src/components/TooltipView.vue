<!-- class="group absolute right-0 top-0 z-[4] hidden -translate-y-3 translate-x-3 transform" -->
<template>
  <div class="relative">
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
              color: setSSPTextColors(slotProps.data),
            }"
          />
        </template>
      </Column>
      <Column field="mean" sortable header="Mean anomaly" class="w-fit">
        <template #body="slotProps">
          <span class="inline-flex w-full items-center justify-between">
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
      </Column>
    </DataTable>
  </div>
  <div
    class="group absolute right-0 top-0 z-[4] w-fit -translate-x-2 translate-y-2 transform"
  >
    <i class="pi pi-question-circle cursor-pointer text-xl"></i>
    <div class="help-text hidden w-fit group-hover:block">
      <span class="">
        Color mapping for Mean(Δhistorical) in kg/m^2/s <br />
        - the mean anomaly temporally and spatially</span
      >
      <div
        :id="memberViewerLegend"
        class="my-2 flex min-w-[400px] flex-row items-center justify-evenly"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import Column from "primevue/column";
import { useStore } from "@/store/main";

import { computed, onMounted, ref, watch } from "vue";
import API from "@/API/api";
import { computedAsync } from "@vueuse/core";
import { sspAllLabels } from "./utils/utils";
import * as d3 from "d3";

const store = useStore();
const memberViewerLegend = `memberViewer-${Math.round(Math.random() * 1000)}`;

let monthlyMeanMin = Infinity;
let monthlyMeanMax = -Infinity;

const setSSPColors = (member) => {
  if (member.ssp === "historical") {
    // return d3.interpolateMagma(1);
    return d3.interpolatePlasma(0.8);
  } else if (member.ssp === "ssp245") {
    // return d3.interpolateMagma(0.87);
    return d3.interpolatePlasma(0.6);
  } else if (member.ssp === "ssp370") {
    // return d3.interpolateMagma(0.74);
    return d3.interpolatePlasma(0.4);
  } else if (member.ssp === "ssp585") {
    // return d3.interpolateMagma(0.6);
    return d3.interpolatePlasma(0.2);
  }
};

const setSSPTextColors = (member) => {
  if (member.ssp === "historical") {
    return "black";
  } else if (member.ssp === "ssp245") {
    return "white";
  } else if (member.ssp === "ssp370") {
    return "white";
  } else if (member.ssp === "ssp585") {
    return "white";
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
      dataset_type: store.currentDatasetType,
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

  await Promise.all([...promises]);
  console.log("Members with mean", ret);
  return ret.sort((a, b) => a.model_name.localeCompare(b.model_name));
});

watch(
  () => membersWithMean,
  (val) => {
    console.log("Members with mean updated", val);
  }
);
onMounted(async () => {
  watch(
    () => props.month,
    () => {
      console.log("DEBUG: MONTH CHANGED");
      drawLegend();
    },
    { immediate: true }
  );
});

async function drawLegend() {
  monthlyMeanMin = Infinity;
  monthlyMeanMax = -Infinity;
  // Check if the legend already exists
  if (document.getElementById(memberViewerLegend)) {
    document.getElementById(memberViewerLegend).innerHTML = "";
  }
  let perMemberMeans = sspAllLabels.map(async (member) => {
    const { means } = await API.fetchData("get_all_means", true, {
      dataset_type: store.currentDatasetType,
      members: [member],
      // members: sspAllLabels,
      months: [props.month],
      years: [-1],
    });
    if (means !== null && means !== undefined) {
      monthlyMeanMin = Math.min(monthlyMeanMin, means);
      monthlyMeanMax = Math.max(monthlyMeanMax, means);
    }
  });
  await Promise.all([...perMemberMeans]);
  const numBoxes = 7;
  let color = d3
    .scaleDiverging(d3.interpolateBrBG)
    .domain([monthlyMeanMin, 0, monthlyMeanMax]);
  const legendData = Array.from({ length: numBoxes }, (_, i) => {
    return color(
      (i / (numBoxes - 1)) * (monthlyMeanMax - monthlyMeanMin) + monthlyMeanMin
    );
  });

  const legendItems = d3
    .select(`#${memberViewerLegend}`)
    .selectAll(".legend-item")
    .data(legendData)
    .join("div")
    .attr("class", "legend-item");

  // Add colored boxes
  legendItems
    .append("svg")
    .attr("width", 20)
    .attr("height", 20)
    .append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .style("fill", (d) => d);

  // Add labels
  legendItems
    .append("text")
    .style("font-size", "0.8rem")
    .attr("text-anchor", "end") // Align text properly
    .text((d, i) =>
      (
        (i / (numBoxes - 1)) * (monthlyMeanMax - monthlyMeanMin) +
        monthlyMeanMin
      ).toExponential(1)
    );
}

// Add a title to the legend
// svg
//   .append("text")
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
.legend-item {
  display: flex;
  width: fit-content;
  flex-direction: column;
}

/* Optionally, remove padding from header and footer cells */
.p-datatable-thead > tr > th,
.p-datatable-tfoot > tr > td {
  padding: 0.25rem 0.25rem;
}
</style>
