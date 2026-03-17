<template>
  <div class="flex flex-row items-end justify-evenly gap-4">
    <div class="flex flex-col items-end justify-center gap-4">
      <SFBaySelector
        v-if="store.currentStep == 'Analyze'"
        :time_type="props.time_type"
      />
      <div class="flex flex-row items-center justify-evenly gap-4 text-center">
        <span
          v-if="isShowingComparison"
          class="rounded-lg bg-gray-100 px-4 py-2 text-lg font-bold"
          >Selection 1</span
        >
        <form class="max-w-sm">
          <label
            for="models"
            class="mb-2 block text-sm font-medium text-gray-900"
            >Select Model(s)</label
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
          <label
            for="types"
            class="mb-2 block text-sm font-medium text-gray-900"
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
          <label
            for="months"
            class="mb-2 block text-sm font-medium text-gray-900"
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
        <div class="flex flex-row items-center justify-center">
          <div class="flex flex-col items-center justify-center gap-1">
            <Button
              :label="
                isShowingComparison ? 'Remove Comparison' : 'Add Comparison'
              "
              class="h-fit bg-blue-500 p-1 text-white hover:bg-blue-600"
              @click="toggleShowingComparison"
            />

            <Button
              v-if="isShowingComparison"
              :label="
                isShowingVectorField
                  ? 'Switch to Diff Field'
                  : isShowingDiffField
                    ? 'Switch to Side-by-Side'
                    : 'Switch to Vector Field'
              "
              class="h-fit bg-blue-500 p-1 text-white hover:bg-blue-600"
              @click="toggleComparisonMode"
            />
          </div>
          <Menu ref="menu" :model="comparisonModes" :popup="true" />
        </div>
      </div>
    </div>

    <div
      v-if="isShowingComparison"
      class="flex flex-col items-end justify-center gap-4"
    >
      <SFBaySelector
        v-if="store.currentStep == 'Analyze'"
        :time_type="props.time_type"
        isComparison
      />
      <div class="flex flex-row items-center justify-evenly gap-4 text-center">
        <span class="rounded-lg bg-gray-100 px-4 py-2 text-lg font-bold"
          >Selection 2</span
        >
        <form class="max-w-sm">
          <label
            for="models"
            class="mb-2 block text-sm font-medium text-gray-900"
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
          <label
            for="types"
            class="mb-2 block text-sm font-medium text-gray-900"
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
          <label
            for="months"
            class="mb-2 block text-sm font-medium text-gray-900"
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
import SFBaySelector from "./SFBaySelector.vue";

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
const isShowingDiffField = ref(false);

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
  isShowingDiffField.value = type == "diff-field";
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
      {
        label: "As diff field",
        icon: "pi pi-minus",
        command: () => toggle("diff-field"),
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
  if (isShowingVectorField.value) {
    // Switch from vector field to diff field
    isShowingVectorField.value = false;
    isShowingDiffField.value = true;
    emit("comparisonModeChanged", "diff-field");
  } else if (isShowingDiffField.value) {
    // Switch from diff field to side-by-side
    isShowingDiffField.value = false;
    emit("comparisonModeChanged", "side-by-side");
  } else {
    // Switch from side-by-side to vector field
    isShowingVectorField.value = true;
    emit("comparisonModeChanged", "vector-field");
  }
}
</script>
