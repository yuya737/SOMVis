<template>
  <div class="flex flex-row justify-evenly items-center gap-4">
    <div class="flex flex-row justify-center items-end gap-4">
      <form class="max-w-sm">
        <label for="models" class="block mb-2 text-sm font-medium text-gray-900"
          >Select model(s)</label
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
          >Select time period(s)</label
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
      <div class="flex justify-content-center" v-if="isShowingComparisonButton">
        <Button
          :label="isShowingComparison ? 'Remove Comparison' : 'Add Comparison'"
          class="bg-blue-500 text-white font-semibold h-fit p-2 hover:bg-blue-600"
          @click="toggleShowingComparison"
          aria-haspopup="true"
          aria-controls="overlay_menu"
        />
        <Menu
          ref="menu"
          id="overlay_menu"
          :model="comparisonModes"
          :popup="true"
        />
      </div>
    </div>

    <div v-if="isShowingComparison" class="flex flex-row justify-center gap-4">
      <form class="max-w-sm">
        <label for="models" class="block mb-2 text-sm font-medium text-gray-900"
          >Select model(s)</label
        >
        <MultiSelect
          id="models"
          v-model="selectedModelCMP"
          :options="models"
          :maxSelectedLabels="3"
          class="w-full"
          filter
          display="chip"
        />
      </form>
      <form class="max-w-sm">
        <label for="types" class="block mb-2 text-sm font-medium text-gray-900"
          >Select time period(s)</label
        >
        <MultiSelect
          id="types"
          v-model="selectedTypeCMP"
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { sspAllLabels, months, timeType, timeTypeMonths } from "../utils/utils";
import { useStore } from "@/store/main";
import { isEqual } from "lodash";
import Dropdown from "primevue/dropdown";
import Menu from "primevue/menu";

const props = defineProps<{
  time_type: timeType;
}>();

const emit = defineEmits(["comparisonModeChanged"]);

const store = useStore();
const isShowingComparisonButton = computed(
  () =>
    selectedModel.value.length > 0 ||
    selectedType.value.length > 0 ||
    selectedMonth.value.length > 0
);
const isShowingComparison = ref(false);

const menu = ref();

const toggle = () => {
  isShowingComparison.value = !isShowingComparison.value;
  emit("comparisonModeChanged", isShowingComparison.value);
};
const comparisonModes = ref([
  {
    label: "Comparison Options",
    items: [
      {
        label: "Side-by-side",
        icon: "pi pi-refresh",
        command: toggle,
      },
      {
        label: "As vector field",
        icon: "pi pi-upload",
        command: toggle,
      },
    ],
  },
]);

const selectedModel = ref([]);
const selectedType = ref([]);
const selectedMonth = ref([]);

const selectedModelCMP = ref([]);
const selectedTypeCMP = ref([]);

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

watch(
  [selectedModel, selectedType, selectedModelCMP, selectedTypeCMP],
  ([model, type, modelCMP, typeCMP]) => {
    if (!model && !type && !modelCMP && !typeCMP) {
      return;
    }

    store.setFiles({
      group1: resolveSelection(model, type),
      group2: isShowingComparison.value
        ? resolveSelection(modelCMP, typeCMP)
        : [],
      // group2: [],
    });
  }
);

watch(selectedMonth, (month: number): none => {
  store.monthsSelected = [month];
});
watch(
  () => [store.files, store.monthsSelected],
  ([files, months]) => {
    let model = selectedModel.value;
    let type = selectedType.value;
    let other = resolveSelection(model, type);

    const isStoreEqualToSetting = isEqual(files[0], other);
    if (!isStoreEqualToSetting) {
      selectedModel.value = null;
      selectedType.value = null;
    }

    let modelCMP = selectedModelCMP.value;
    let typeCMP = selectedTypeCMP.value;
    let otherCMP = resolveSelection(modelCMP, typeCMP);

    const isStoreEqualToSettingCMP = isEqual(files[1], otherCMP);
    if (!isStoreEqualToSettingCMP) {
      selectedModelCMP.value = null;
      selectedTypeCMP.value = null;
    }
  }
);

function toggleShowingComparison(event) {
  if (!isShowingComparison.value) menu.value.toggle(event);
  else toggle();
}
</script>
