<template>
  <div class="w-fit relative p-6 bg-gray-100 shadow-md rounded-lg">
    <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      @click="toggleIsOpened"
      class="absolute top-0 right-0 m-2"
    />
    <h1 class="text-xl font-bold text-gray-800">Member Viewer</h1>
    <div v-if="isOpened" :class="gridClass">
      <div>
        <h1 class="text-xl font-bold text-gray-800">
          {{
            props.isShowingComparison
              ? props.isComparison
                ? "Selection 2"
                : "Selection 1"
              : props.isShowingVectorField
                ? "Selection 1"
                : "Members"
          }}
        </h1>
        <!-- <h2 class="font-semibold">Precipitation reported in kg/m^2/s</h2> -->
        <TooltipView
          v-if="
            props.isComparison
              ? store.getFiles[1].length > 0
              : store.getFiles[0].length > 0
          "
          :members="props.isComparison ? store.getFiles[1] : store.getFiles[0]"
          :month="store.monthsSelected[0]"
          class="w-fit"
        />
      </div>

      <div>
        <h1
          v-if="props.isShowingVectorField"
          class="text-xl font-bold text-gray-800"
        >
          Selection 2
        </h1>
        <TooltipView
          v-if="props.isShowingVectorField"
          :members="store.getFiles[1]"
          :month="store.monthsSelected[0]"
          class="w-fit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "@/store/main";
import TooltipView from "./TooltipView.vue";

const store = useStore();

const isOpened = ref(true);
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

const props = defineProps<{
  isShowingVectorField: boolean;
  isComparison: boolean;
  isShowingComparison: boolean;
}>();

const gridClass = computed(() =>
  props.isShowingVectorField
    ? "grid grid-cols-2 gap-2 mt-4"
    : "grid grid-cols-1 mt-4"
);
</script>
