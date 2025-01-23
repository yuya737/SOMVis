<template>
  <div class="flex flex-row justify-evenly items-end gap-4">
    <div class="flex flex-row justify-center items-end gap-4">
      <span
        v-if="isShowingComparison"
        class="text-lg font-bold bg-gray-100 px-4 py-2 rounded-lg"
        >Selection 1</span
      >
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
      <div class="flex flex-row justify-center items-center">
        <div class="flex flex-col justify-center items-center gap-1">
          <Button
            :label="
              isShowingComparison ? 'Remove Comparison' : 'Add Comparison'
            "
            class="bg-blue-500 text-white h-fit p-1 hover:bg-blue-600"
            @click="toggleShowingComparison"
          />

          <Button
            v-if="isShowingComparison"
            label="Switch comparison mode"
            class="bg-blue-500 text-white h-fit p-1 hover:bg-blue-600"
            @click="toggleComparisonMode"
          />
        </div>
        <Menu ref="menu" :model="comparisonModes" :popup="true" />
      </div>
    </div>

    <div
      v-if="isShowingComparison"
      class="flex flex-row justify-center items-end gap-4"
    >
      <span class="text-lg font-bold bg-gray-100 px-4 py-2 rounded-lg"
        >Selection 2</span
      >
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
import { ref, watch, computed, nextTick, toRaw } from "vue";
import { sspAllLabels, months, timeType, timeTypeMonths } from "../utils/utils";
import { useStore } from "@/store/main";
import { isEqual } from "lodash";
import Dropdown from "primevue/dropdown";
import Menu from "primevue/menu";
import TooltipView from "../TooltipView.vue";

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
const isShowingVectorField = ref(false);

// const formatMmeber = (value) => {
//   return `${value.model_name}-${value.ssp}-${value.ssp}-${value.variant}`;
// };

watch(
  () => store.files[1],
  (newVal) => {
    if (newVal.length > 0 && !isShowingComparison.value) {
      toggle("side-by-side");
    }
  }
);

const menu = ref();

const toggle = (type: string) => {
  isShowingComparison.value = !isShowingComparison.value;
  isShowingVectorField.value = type == "vector-field";
  emit("comparisonModeChanged", type);
};
const comparisonModes = ref([
  {
    label: "Comparison Options",
    items: [
      {
        label: "Side-by-side",
        icon: "pi pi-images",
        command: () => toggle("side-by-side"),
      },
      {
        label: "As vector field",
        icon: "pi pi-arrow-up-left",
        command: () => toggle("vector-field"),
      },
    ],
  },
]);

let initiatedChange = false;
let ignoreUIChange = false;

const selectedMembers = ref([]);
const selectedModel = ref([]);
const selectedType = ref([]);
const selectedMonth = ref([]);

const selectedMembersCMP = ref([]);
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

watch(selectedMembers, async (newVal) => {
  store.setFiles({ group1: toRaw(newVal), group2: store.files[1] });
  await nextTick();
});

watch(
  [selectedModel, selectedType, selectedModelCMP, selectedTypeCMP],
  async ([model, type, modelCMP, typeCMP]) => {
    if (ignoreUIChange) return;
    initiatedChange = true; // Flag that UI intiated the change
    store.setFiles({
      group1: resolveSelection(model, type),
      group2: isShowingComparison.value
        ? resolveSelection(modelCMP, typeCMP)
        : [],
    });
    await nextTick();
    initiatedChange = false;
  }
);

watch(selectedMonth, (month: number): none => {
  store.monthsSelected = [month];
});

watch(
  () => [store.files, store.monthsSelected],
  async ([files, months]) => {
    if (initiatedChange) return;
    ignoreUIChange = true; // Ignore the UI Change if the store changes but the UI did not initiate it

    let model = selectedModel.value;
    let type = selectedType.value;
    let other = resolveSelection(model, type);

    const isStoreEqualToSetting = isEqual(files[0], other);

    if (!isStoreEqualToSetting) {
      selectedModel.value = [];
      selectedType.value = [];
    }

    let modelCMP = selectedModelCMP.value;
    let typeCMP = selectedTypeCMP.value;
    let otherCMP = resolveSelection(modelCMP, typeCMP);

    const isStoreEqualToSettingCMP = isEqual(files[1], otherCMP);
    if (!isStoreEqualToSettingCMP) {
      selectedModelCMP.value = [];
      selectedTypeCMP.value = [];
    }

    selectedMonth.value = months[0];

    await nextTick();
    ignoreUIChange = false;
  }
);

function toggleShowingComparison(event) {
  if (!isShowingComparison.value) {
    menu.value.toggle(event);
  } else {
    toggle();
  }
}

function toggleComparisonMode() {
  console.log("DEBUG TOGGLE COMPARISON MODE", isShowingVectorField.value);
  const curShowingVectorField = isShowingVectorField.value;
  isShowingVectorField.value = !curShowingVectorField;
  console.log("DEBUG TOGGLE COMPARISON MODE 2", isShowingVectorField.value);
  emit(
    "comparisonModeChanged",
    curShowingVectorField ? "side-by-side" : "vector-field"
  );
}
</script>
