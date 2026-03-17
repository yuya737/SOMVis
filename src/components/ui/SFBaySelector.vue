<template>
  <div class="p-2">
    <h3 class="mb-2 text-sm font-medium">
      SF Bay Exploration Configuration Settings
    </h3>

    <div class="flex w-full items-end justify-center gap-2">
      <!-- Model Selection -->
      <div class="flex-shrink-0">
        <label for="model" class="mb-1 block text-xs">Model</label>
        <Dropdown
          id="model"
          v-model="selectedModel"
          :options="models"
          placeholder="Model"
          class="w-36"
        />
      </div>
      <div class="flex-shrink-0">
        <label for="model" class="mb-1 block text-xs">SSP</label>
        <Dropdown
          id="model"
          v-model="selectedSSP"
          :options="ssps"
          placeholder="SSP"
          class="w-36"
        />
      </div>

      <!-- Percentile Input -->
      <div class="flex-shrink-0">
        <label for="percentile" class="mb-1 block max-w-[100px] text-xs"
          >Percentile (considering the WY Sum in the Delta)</label
        >
        <InputNumber
          id="percentile"
          v-model="selectedPercentile"
          :min="0"
          :max="100"
          suffix="%"
          class="w-24"
        />
      </div>

      <!-- Within SSP Toggle -->
      <div class="flex-shrink-0">
        <label for="ssp" class="mb-1 block text-xs">Greater than?</label>
        <ToggleButton
          id="ssp"
          v-model="isGreaterThan"
          on-label="Yes"
          off-label="No"
          class="w-20"
        />
      </div>

      <!-- Month Selection -->
      <div class="flex-shrink-0">
        <label for="month" class="mb-1 block text-xs">Month</label>
        <Dropdown
          id="month"
          v-model="selectedMonth"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          placeholder="Month"
          class="w-28"
        />
      </div>

      <!-- Clear Button -->
      <div class="flex-shrink-0">
        <label class="invisible mb-1 block text-xs">Clear</label>
        <Button
          icon="pi pi-times"
          severity="secondary"
          size="small"
          @click="clearAll"
          class="h-10 w-10"
        />
      </div>

      <!-- Clear Button -->
      <div class="flex-shrink-0">
        <label class="invisible mb-1 block text-xs"
          >Run Overall Tabulation</label
        >
        <Button
          icon="pi pi-plus"
          severity="secondary"
          size="small"
          @click="runOverallTabulationWithPValues"
          class="h-10 w-10"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sspAllLabels, months, timeType } from "../utils/utils";
import { ref, watch } from "vue";
import Dropdown from "primevue/dropdown";
import InputNumber from "primevue/inputnumber";
import ToggleButton from "primevue/togglebutton";
import Button from "primevue/button";

// STORE IMPORT
import { useStore } from "@/store/main";

import API from "@/API/api";

const props = defineProps<{
  isComparison?: boolean;
  time_type: timeType;
}>();

const selectedModel = ref<string | null>(null);
const selectedMonth = ref<number | null>(null);
const selectedSSP = ref<string | null>(null);
const isGreaterThan = ref<boolean>(false);
const selectedPercentile = ref<number>(50); // Default to 50th percentile
const store = useStore();

let models = Array.from(
  new Set(sspAllLabels.map((member) => member.model_name))
).map((d) => d);
models = ["All", ...models];
const ssps = Array.from(new Set(sspAllLabels.map((member) => member.ssp))).map(
  (d) => d
);

const monthOptions = [0, 1, 2, 3, 4, 9, 10, 11].map((monthIndex) => ({
  label: months[monthIndex],
  value: monthIndex,
}));

const clearAll = () => {
  selectedModel.value = null;
  selectedMonth.value = null;
  selectedSSP.value = null;
  isGreaterThan.value = false;
  selectedPercentile.value = 50;

  if (props.isComparison) {
    store.sfBaySetting[1].model = null;
    store.sfBaySetting[1].ssp = null;
    store.sfBaySetting[1].month = -1;
    store.sfBaySetting[1].percentile = 0;
    store.sfBaySetting[1].isGreaterThan = true;
    store.sfBaySetting[1].ignore = true;
  } else {
    store.sfBaySetting[0].model = null;
    store.sfBaySetting[0].ssp = null;
    store.sfBaySetting[0].month = -1;
    store.sfBaySetting[0].percentile = 0;
    store.sfBaySetting[0].isGreaterThan = true;
    store.sfBaySetting[0].ignore = true;
  }
};

const runOverallTabulationWithPValues = () => {
  const p_values = API.fetchData("/make_overall_sf_monthly_tabulation", true, {
    percentile: selectedPercentile.value,
    isGreaterThan: isGreaterThan.value,
    dataset_type: store.currentDatasetType,
    time_type: props.time_type,
  });
};

watch(
  [
    selectedModel,
    selectedSSP,
    selectedMonth,
    isGreaterThan,
    selectedPercentile,
  ],
  () => {
    if (props.isComparison) {
      store.sfBaySetting[1].model = selectedModel.value;
      store.sfBaySetting[1].ssp = selectedSSP.value;
      store.sfBaySetting[1].month = selectedMonth.value;
      store.sfBaySetting[1].percentile = selectedPercentile.value;
      store.sfBaySetting[1].isGreaterThan = isGreaterThan.value;

      // If the comparison is changed, can't ignore either
      store.sfBaySetting[1].ignore = false;
      store.sfBaySetting[0].ignore = false;
    } else {
      store.sfBaySetting[0].model = selectedModel.value;
      store.sfBaySetting[0].ssp = selectedSSP.value;
      store.sfBaySetting[0].month = selectedMonth.value;
      store.sfBaySetting[0].percentile = selectedPercentile.value;
      store.sfBaySetting[0].isGreaterThan = isGreaterThan.value;
      store.sfBaySetting[0].ignore = false;
    }
    store.redrawFlag = !store.redrawFlag;
  }
);
</script>
