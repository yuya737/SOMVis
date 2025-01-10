<template>
  <div class="flex flex-row justify-center items-center gap-4">
    <form class="max-w-sm">
      <label for="models" class="block mb-2 text-sm font-medium text-gray-900"
        >Select a Model</label
      >
      <MultiSelect
        id="models"
        v-model="selectedModel"
        :options="models"
        :maxSelectedLabels="3"
        class="w-full"
        filter
        display="chip"
      />
    </form>
    <form class="max-w-sm">
      <label for="types" class="block mb-2 text-sm font-medium text-gray-900"
        >Select a Time Period</label
      >
      <MultiSelect
        id="types"
        v-model="selectedType"
        :options="types"
        :maxSelectedLabels="3"
        class="w-full"
        filter
        display="chip"
      />
    </form>
    <form class="max-w-sm">
      <label for="months" class="block mb-2 text-sm font-medium text-gray-900"
        >Select Month</label
      >
      <Dropdown
        id="months"
        v-model="selectedMonth"
        :options="timeTypeMonths[props.time_type]"
        class="w-full"
        display="chip"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { sspAllLabels, months, timeType, timeTypeMonths } from "../utils/utils";
import { useStore } from "@/store/main";
import { isEqual } from "lodash";
import Dropdown from "primevue/dropdown";

const props = defineProps<{
  time_type: timeType;
}>();

const store = useStore();

const selectedModel = ref([]);
const selectedType = ref([]);
const selectedMonth = ref([]);

const members = sspAllLabels;
const models = ref(
  Array.from(new Set(members.map((member) => member.model_name))).map((d) => d)
);
const types = ref(
  Array.from(new Set(members.map((member) => member.ssp))).map((d) => d)
);

const resolveSelection = (model, type) => {
  return members.filter(
    (member) =>
      (model && model.length > 0 ? model.includes(member.model_name) : true) &&
      (type && type.length > 0 ? type.includes(member.ssp) : true)
  );
};

watch([selectedModel, selectedType], ([model, type]) => {
  if (!model && !type) {
    return;
  }

  store.setFiles({
    group1: resolveSelection(model, type),
    group2: [],
  });
});

watch(selectedMonth, (month: number): none => {
  store.monthsSelected = [month];
});
watch(
  () => [store.files, store.monthsSelected],
  ([files, months]) => {
    console.log("Files: ", files[0]);
    let model = selectedModel.value;
    let type = selectedType.value;
    let other = resolveSelection(model, type);

    const isStoreEqualToSetting = isEqual(files[0], other);
    if (!isStoreEqualToSetting) {
      selectedModel.value = null;
      selectedType.value = null;
    }
  }
);
</script>
