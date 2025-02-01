<template>
  <header
    class="bg-gray-100 text-gray-800 flex justify-center items-center px-6 py-4 shadow-lg"
  >
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <span class="text-lg font-semibold">&lt;TENTATIVE&gt; ClimateSOM</span>
    </div>
    <StepProgress class="w-fit flex-grow" />

    <div class="flex flex-col justify-start items-center gap-2 max-w-xs">
      <label class="text-sm text-gray-600">Toggle LLM queried region</label>
      <ToggleButton
        v-model="store.isShowingLLMQueriedRegion"
        :disabled="store.LLMQueriedRegionIndex == -1"
        on-label="Hide"
        off-label="Show"
      />
    </div>

    <div
      v-if="store.currentStep == 'Anchor'"
      class="flex flex-col justify-end items-center gap-2 max-w-xs"
    >
      <label class="text-sm text-gray-600"
        >Reflect Anchors in the SOM Node space and recalculate mapping</label
      >
      <Button
        class="bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded"
        label="Reflect Anchors"
        @click="store.recalculateMDEFlag = !store.recalculateMDEFlag"
      />
    </div>

    <div
      v-if="store.currentStep == 'Analyze'"
      class="flex flex-col justify-center items-center gap-2 max-w-xs"
    >
      <label class="text-sm text-gray-600">Toggle Distribution</label>
      <ToggleButton
        v-model="store.isHidingDistribution"
        on-label="Show Distribution"
        off-label="Hide Distribution"
      />
    </div>

    <div
      v-if="store.currentStep == 'Annotate'"
      class="flex flex-col justify-center items-center gap-2 max-w-xs"
    >
      <label class="text-sm text-gray-600">Map Mode</label>
      <SelectButton v-model="store.mapMode" :options="modeOptions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import StepProgress from "./ui/StepProgress.vue";
import ToggleButton from "primevue/togglebutton";

import { useStore } from "@/store/main";
const store = useStore();

const modeOptions = ["Explore", "Annotate"];
</script>
