<template>
  <div class="flex flex-col items-center p-6 bg-gray-100 rounded-lg shadow-md">
    <h1 class="text-xl font-bold mb-4 text-gray-800">Characteristics</h1>
    <div v-if="characteristic.length == 0" class="font-medium text-gray-600">
      Must define regions to see their Characteristics
    </div>
    <transition-group name="fade" tag="div" class="w-full max-w-sm">
      <div
        v-for="c in characteristic"
        :key="c.name"
        class="flex justify-between bg-white p-3 mb-2 rounded-lg shadow-sm border border-gray-200 transition-transform duration-300"
        :class="{
          'scale-105': animateChange.includes(c.name),
          'bg-green-50': direction[c.name] === 'increase',
          'bg-red-50': direction[c.name] === 'decrease',
        }"
      >
        <span class="font-medium text-gray-600">{{ c.name }}</span>
        <span class="text-blue-600 font-semibold">
          {{ Math.round(c.percentage * 100) }}%
        </span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, Ref } from "vue";
import { useStore } from "@/store/main";
import { timeType, dataset_name } from "../utils/utils";
import API from "@/api/api";

import distance from "@turf/distance";
import bearing from "@turf/bearing";

const props = defineProps<{
  time_type: timeType;
  isComparison: boolean;
}>();

const animateChange = ref([]);
const direction = ref({});

const store = useStore();
const msg = ref("");

const characteristic: Ref<{ name: string; percentage: number }[]> = ref([]);
// Watch the characteristic array for changes
watch(
  characteristic,
  (newVal, oldVal) => {
    // Identify which items have changed
    const changedItems = newVal.filter((newItem, index) => {
      const oldItem = oldVal[index];
      return !oldItem || oldItem.percentage !== newItem.percentage;
    });

    // Track direction of change (increase or decrease)
    changedItems.forEach((item) => {
      const previousPercentage = oldVal.find(
        (oldItem) => oldItem.name === item.name
      )?.percentage;
      if (previousPercentage != null) {
        direction.value[item.name] =
          item.percentage > previousPercentage ? "increase" : "decrease";
      }
    });

    // Collect names of changed items
    animateChange.value = changedItems.map((item) => item.name);

    // Remove animation after a short delay
    setTimeout(() => {
      animateChange.value = [];
      direction.value = {}; // Clear direction tracking
    }, 500);
  },
  { deep: true } // Ensure nested objects are tracked
);

async function getCharacteristic() {
  const selectedFiles = props.isComparison
    ? store.getFiles[1]
    : store.getFiles[0];
  const selectedMonth = store.getMonthsSelected;
  const zones = store.mapAnnotation.features.map((d, i) => {
    let offsetGeometry = JSON.parse(JSON.stringify(d.geometry));

    offsetGeometry.coordinates = [
      offsetGeometry.coordinates[0].map((lngLat) => {
        const d = distance([0, 0], lngLat, {
          units: "meters",
        });
        const a = bearing([0, 0], lngLat);
        const x = d * Math.sin((a * Math.PI) / 180);
        const y = d * Math.cos((a * Math.PI) / 180);
        return [x / 10, y / 10];
      }),
    ];
    console.log("DEBUG getCharacteristic lngLat", offsetGeometry.coordinates);
    return {
      name: d.properties.name,
      geometry: offsetGeometry,
      id: i,
    };
  });
  if (zones.length === 0) {
    // No zones defined
    return;
  }
  const ret = await API.fetchData("/get_characteristic", true, {
    dataset_type: dataset_name,
    time_type: props.time_type,
    members: selectedFiles,
    months: selectedMonth,
    zones: zones,
  });
  characteristic.value = [];
  const sortedKeys = Object.keys(ret).sort((a, b) => ret[b] - ret[a]);
  sortedKeys.forEach((key) => {
    characteristic.value.push({
      name: store.mapAnnotation.features[key].properties?.name,
      percentage: ret[key],
    });
  });
}

watch(
  () => [store.getFiles, store.monthsSelected],
  () => {
    getCharacteristic();
  }
);
</script>
<style>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.scale-105 {
  transform: scale(1.05);
}
.scale-95 {
  transform: scale(0.95);
}
</style>
