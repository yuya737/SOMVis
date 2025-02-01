<template>
  <div class="flex flex-col items-center text-md w-fit relative">
    <!-- <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      @click="toggleIsOpened"
      class="absolute top-0 right-0 m-2"
    /> -->
    <!-- <h1 class="text-xl font-bold text-gray-800">Step</h1> -->
    <div v-if="isOpened" class="flex flex-row items-center gap-4">
      <div class="relative z-[5]">
        <Steps class="w-fit" :activeStep="currentIndex" :model="items"> </Steps>
        <div
          class="absolute top-0 right-0 transform -translate-x-1 -translate-y-1 group z-[4]"
        >
          <i class="pi pi-question-circle text-xl cursor-pointer"></i>

          <div
            v-html="instructions[store.currentStep]"
            class="absolute top-0 left-0 min-w-[250px] hidden p-2 bg-gray-100 text-grey-800 rounded-md group-hover:block"
          />
        </div>
      </div>
      <!-- <div>
        <p v-html="instructions[store.currentStep]" class="text-center" />
      </div> -->
      <Button
        v-if="currentIndex < items.length - 1"
        class="bg-blue-500 text-white hover:bg-blue-600 px-2 py-1 rounded"
        @click="nextStep"
        label="Next Step"
        :icon="'pi pi-arrow-right'"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import Steps from "primevue/steps";
import { ref, computed } from "vue";
import { useStore } from "@/store/main";
const isOpened = ref(true);
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

const store = useStore();
const currentIndex = computed(() =>
  items.value.map((d) => d.label).indexOf(store.currentStep)
);

const nextStep = () => {
  const currentIndex = items.value
    .map((d) => d.label)
    .indexOf(store.currentStep);
  const nextIndex = currentIndex + 1;
  console.log("DEBUG STEPPER CURRENT INDEX", currentIndex);
  if (currentIndex < items.value.length - 1) {
    store.currentStep = items.value[currentIndex + 1].label as step;
  }
  if (nextIndex == items.value.length - 1) {
    store.mapMode = "Explore";
  }
};

const items = ref([
  {
    label: "Anchor",
  },
  {
    label: "Annotate",
  },
  {
    label: "Analyze",
  },
]);

const instructions = {
  Anchor:
    "Anchor specific nodes in the SOM node space to produce a smooth SOM node space. Anchored points will remain in place while the rest of the SOM node space is adjusted accordingly.",
  Annotate:
    "Annotate specific regions of the SOM node space by drawing polygon over the map and assigning a label to them. These will be the basis for the <kbd>Analyze</kbd> step to follow.",
  Analyze:
    "Analyze the ensemble! Analyze, compare between and cluster GCMs, SSP (<kbd>Historical</kbd> and <kbd>SSP</kdb>) across different months",
};
</script>

<style>
.p-menuitem-link {
  --tw-bg-opacity: 1;
  background-color: rgb(243 244 246 / var(--tw-bg-opacity, 1)) /* #f3f4f6 */;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}
.p-steps-title {
  margin: 0 3rem 0 1rem;
}
.p-steps {
  margin: 0 0 0 0;
}
</style>
