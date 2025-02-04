<template>
  <div class="text-md relative flex w-fit flex-col items-center">
    <!-- <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      @click="toggleIsOpened"
      class="absolute right-0 top-0 m-2"
    /> -->
    <!-- <h1 class="text-xl font-bold text-gray-800">Step</h1> -->
    <div v-if="isOpened" class="flex flex-row items-center gap-4">
      <div class="relative z-[5]">
        <Steps
          class="w-fit rounded-lg border-2 border-gray-300 bg-white p-3 shadow-sm"
          :activeStep="currentIndex"
          :model="items"
        >
        </Steps>
        <div
          class="group absolute right-0 top-0 z-[4] -translate-x-1 -translate-y-1 transform"
        >
          <i class="pi pi-question-circle cursor-pointer text-xl"></i>

          <div
            v-html="helpText"
            class="text-grey-800 absolute left-0 top-0 hidden min-w-[250px] rounded-md bg-gray-100 p-2 font-thin group-hover:block"
          />
        </div>
      </div>
      <!-- <div>
        <p v-html="instructions[store.currentStep]" class="text-center" />
      </div> -->
      <Button
        v-if="currentIndex < items.length - 1"
        class="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
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
const helpText = computed(
  () =>
    `<strong>Step ${store.currentStep}:</strong> <br> ${instructions[store.currentStep]}`
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
    "Analyze the ensemble! Analyze, compare between and cluster GCMs, SSP (<kbd>Historical</kbd> and <kbd>SSP</kbd>) across different months",
};
</script>

<style>
.p-menuitem-link {
  --tw-bg-opacity: 1;
  background-color: white;
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
