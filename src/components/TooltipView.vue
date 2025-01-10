<template>
  <div class="card w-fit">
    <Button
      @click="$emit('closeCard')"
      class="absolute m-2 p-3 z-[2] top-0 right-0 bg-slate-200 aspect-square"
      >X</Button
    >
    <DataTable
      :value="membersWithMean"
      scrollable
      scrollHeight="400px"
      showGridlines
      class="tight-rows"
    >
      <Column field="model_name" sortable header="Model Name"></Column>
      <Column field="variant" sortable header="Variant"></Column>
      <Column field="ssp" sortable header="SSP Type">
        <template #body="slotProps">
          <Tag
            :value="slotProps.data.ssp"
            :severity="getSeverity(slotProps.data.ssp)"
          />
        </template>
      </Column>
      <Column field="mean" sortable header="Mean(Δhistorical) kg/m^2/s">
        <template #body="slotProps">
          <span style="display: inline-flex; align-items: center">
            {{ formatScientificNotation(slotProps.data) }}
            <svg width="20" height="20" style="margin-left: 8px">
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
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Column from "primevue/column";

import { computed, ref, watch } from "vue";
import API from "@/api/api";
import { computedAsync } from "@vueuse/core";
import { dataset_name, sspAllLabels } from "./utils/utils";
import * as d3 from "d3";

// Emit the close event to the parent component

let monthlyMeanMin = Infinity;
let monthlyMeanMax = -Infinity;

const props = defineProps<{
  members: EnsembleMember[];
  month: number;
}>();

function computeBoxColor(mean) {
  // console.log("DEBUG: ", monthlyMeanMax, monthlyMeanMin, mean);
  let color = d3
    .scaleDiverging(d3.interpolateRdBu)
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
      months: [props.month],
      years: [-1],
    });
    if (means !== null && means !== undefined) {
      monthlyMeanMin = Math.min(monthlyMeanMin, means);
      monthlyMeanMax = Math.max(monthlyMeanMax, means);
    }
  });
  await Promise.all([...promises, ...perMemberMeans]);
  console.log("Members with mean", ret);
  return ret;
});

watch(
  () => membersWithMean,
  (val) => {
    console.log("Members with mean updated", val);
  }
);
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
