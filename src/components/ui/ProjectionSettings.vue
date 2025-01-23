<template>
  <div class="p-4 bg-gray-100 shadow-md rounded-md w-full relative">
    <!-- <h2 class="text-lg font-bold text-gray-700 mb-4">Set Contour Levels</h2> -->
    <h1 class="text-xl font-bold text-gray-800 my-2">Projection Settings</h1>

    <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      @click="toggleIsOpened"
      class="absolute top-0 right-0 m-2"
    />

    <!-- Add New Level -->
    <div v-if="isOpened" class="flex flex-col items-center justify-center">
      <h2 olass="text-lg font-bold text-gray-700 mb-4">Set Contour Levels</h2>
      <div class="flex flex-row items-center space-x-2 mb-4">
        <input
          type="number"
          placeholder="Enter contour level (%)"
          v-model="newLevel"
          id="newLevel"
          class="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          id="addButton"
          class="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none"
          @click="addLevel"
        >
          Add
        </button>
      </div>
      <div class="flex flex-wrap gap-2 w-full">
        <div
          v-for="(level, index) in levels"
          :key="index"
          class="flex justify-between items-center px-1 py-1 bg-gray-100 rounded-md shadow-sm"
        >
          <span class="text-gray-700 mr-2">{{ level }}% </span>
          <button
            @click="levels.splice(index, 1)"
            class="text-red-500 font-semibold hover:text-red-700 focus:outline-none"
          >
            X
            <!-- ❌ -->
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { useStore } from "@/store/main";
const newLevel = ref();
const levels = ref([25, 50, 75]);
const isOpened = ref(true);
const store = useStore();
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

function addLevel() {
  if (newLevel.value) {
    levels.value.push(newLevel.value);
    newLevel.value = "";
  }
  levels.value = levels.value.sort((a, b) => a - b);
}

watch(
  levels,
  (newLevels) => {
    store.contourLevels = newLevels.map((d) => d / 100);
    store.redrawFlag = !store.redrawFlag;
  },
  { deep: true }
);
</script>
