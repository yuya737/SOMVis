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
        <CharacteristicViewerRow :characteristic="c" />
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, Ref } from "vue";
import { useStore } from "@/store/main";
import { timeType, dataset_name, constructZones } from "../utils/utils";
import API from "@/api/api";

import CharacteristicViewerRow from "./CharacteristicViewerRow.vue";

const props = defineProps<{
  time_type: timeType;
  isComparison: boolean;
  isShowingVectorField: Boolean;
}>();

const animateChange = ref([]);
const direction = ref({});

const store = useStore();
const msg = ref("");

const characteristic: Ref<
  {
    name: string;
    percentage: number;
    transition?: { name: string; percentage: number }[];
  }[]
> = ref([]);
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
  const zones = constructZones(store.mapAnnotation);
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

  let transition = null;

  characteristic.value = [];
  const sortedKeys = Object.keys(ret).sort((a, b) => ret[b] - ret[a]);

  if (props.isShowingVectorField) {
    watch(
      () => store.vectorFieldData[props.time_type],
      async (vectorField) => {
        const transitionData = await API.fetchData(
          "/get_forcing_transition",
          true,
          {
            zones: zones,
            u: vectorField["u"],
            v: vectorField["v"],
            x: vectorField["x"],
            y: vectorField["y"],
          }
        );
        // Object.keys(transitionData).forEach((zoneID) => {
        //   const counted = transition[zoneID].reduce((acc, item) => {
        //     acc[item] = (acc[item] || 0) + 1;
        //     return acc;
        //   }, {});
        //   console.log("DEBUG UPDATEVECTOR FIELD TRANSITION: ", zoneID, counted);
        // });

        const temp = {};
        transition = Object.keys(transitionData).forEach((zoneID) => {
          const sourceZoneName =
            store.mapAnnotation.features[zoneID].properties?.name;
          const counted = transitionData[zoneID].reduce((acc, item) => {
            const destZoneName =
              store.mapAnnotation.features[item].properties?.name;
            acc[destZoneName] = (acc[destZoneName] || 0) + 1;
            return acc;
          }, {});
          const transitionList = Object.entries(counted).map(
            ([name, count]) => {
              return {
                name: name,
                percentage: count / transitionData[zoneID].length,
              };
            }
          );
          temp[sourceZoneName] = transitionList;
          console.log(
            "DEBUG UPDATEVECTOR FIELD TRANSITION: IN CHAR ",
            zoneID,
            counted
          );
        });
        // Convert to array of objects

        characteristic.value.forEach((c) => {
          c.transition = temp[c.name];
        });
      },
      { once: true }
    );
  }
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
