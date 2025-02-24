<template>
  <div
    class="relative flex w-fit flex-col items-center rounded-lg bg-gray-100 p-6"
  >
    <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      class="absolute right-0 top-0 m-2"
      @click="toggleIsOpened"
    />
    <h1 id="temp" class="text-xl font-bold text-gray-800">Characteristics</h1>
    <div v-if="isOpened" class="mt-4 w-fit">
      <div v-if="characteristic.length == 0" class="font-medium text-gray-600">
        Must define regions and select members
      </div>
      <div
        v-if="characteristic.length > 0 && characteristic[0].transition != null"
      >
        Estimated transition from Selection 1 to Selection 2
      </div>
      <div
        v-if="characteristic.length > 0 && characteristic[0].transition != null"
        class="flex w-full flex-row justify-evenly"
      >
        <span class="rounded-lg bg-gray-100 px-4 py-2 text-lg font-bold"
          >Selection 1</span
        >
        <span class="rounded-lg bg-gray-100 px-4 py-2 text-lg font-bold"
          >Selection 2</span
        >
      </div>
      <div v-if="isLoading" class="font-medium text-gray-600">Loading...</div>
      <transition-group name="fade" tag="div" class="w-fit">
        <div
          v-for="c in characteristic"
          :key="c.index"
          class="mb-2 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-transform duration-300"
          :class="{
            'scale-105': animateChange.includes(c.index),
            'bg-green-50': direction[c.index] === 'increase',
            'bg-red-50': direction[c.index] === 'decrease',
          }"
        >
          <CharacteristicViewerRow
            :characteristic="c"
            :time_type="props.time_type"
          />
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, Ref, onMounted } from "vue";
import { useStore } from "@/store/main";
import { timeType, constructZones, makeAnnotationGlyph } from "../utils/utils";
import API from "@/api/api";

import CharacteristicViewerRow from "./CharacteristicViewerRow.vue";

const props = defineProps<{
  time_type: timeType;
  isComparison: boolean;
  isShowingVectorField: Boolean;
}>();

const animateChange = ref([]);
const direction = ref({});
const isLoading = ref(false);

const store = useStore();

const isOpened = ref(true);
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

const characteristic: Ref<
  {
    index: number;
    // percentage: number;
    count: number;
    total: number;

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
      return !oldItem || oldItem.count !== newItem.count;
    });

    // Track direction of change (increase or decrease)
    changedItems.forEach((item) => {
      const previousCount = oldVal.find(
        (oldItem) => oldItem.index === item.index
      )?.count;
      if (previousCount != null) {
        direction.value[item.index] =
          item.count > previousCount ? "increase" : "decrease";
      }
    });

    // Collect names of changed items
    animateChange.value = changedItems.map((item) => item.index);

    // Remove animation after a short delay
    setTimeout(() => {
      animateChange.value = [];
      direction.value = {}; // Clear direction tracking
    }, 500);
  },
  { deep: true } // Ensure nested objects are tracked
);

async function getCharacteristic() {
  isLoading.value = true;
  const selectedFiles = props.isComparison
    ? store.getFiles[1]
    : store.getFiles[0];
  const selectedMonth = store.getMonthsSelected;
  const zones = constructZones(store.mapAnnotation);
  if (zones.length === 0 || selectedFiles.length == 0) {
    // No zones defined
    isLoading.value = false;
    return;
  }
  console.log("DEBUG GET CHARACTERISTIC", selectedFiles, props.isComparison);
  const { zoneCounts, total } = await API.fetchData(
    "/get_characteristic",
    true,
    {
      dataset_type: store.currentDatasetType,
      time_type: props.time_type,
      members: selectedFiles,
      months: selectedMonth,
      zones: zones,
    }
  );

  characteristic.value = [];
  console.log("DEBUG GET CHARACTERISTIC", zoneCounts, total);
  const sortedKeys = Object.keys(zoneCounts).sort(
    (a, b) => zoneCounts[b] - zoneCounts[a]
  );

  if (props.isShowingVectorField) {
    watch(
      () => store.vectorFieldData[props.time_type],
      async (vectorField) => {
        isLoading.value = true;
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

        const temp = {}; // Temporary object to store transition data { sourceZoneIndex: { destZoneIndex: percentage } }
        Object.keys(transitionData).forEach((zoneID) => {
          // const sourceZoneName =
          // store.mapAnnotation.features[zoneID].properties?.name;
          const sourceZoneIndex = zoneID;
          const counted = transitionData[zoneID].reduce((acc, item) => {
            // const destZoneName =
            //   store.mapAnnotation.features[item].properties?.name;
            const destZoneIndex = item;
            acc[destZoneIndex] = (acc[destZoneIndex] || 0) + 1;
            return acc;
          }, {});
          let transitionList = Object.entries(counted).map(([index, count]) => {
            return {
              index: index,
              percentage: count / transitionData[zoneID].length,
            };
          });
          transitionList = transitionList.sort(
            (a, b) => b.percentage - a.percentage
          );
          temp[sourceZoneIndex] = transitionList;
          console.log(
            "DEBUG UPDATEVECTOR FIELD TRANSITION: IN CHAR ",
            zoneID,
            counted
          );
        });
        // Convert to array of objects

        characteristic.value.forEach((c) => {
          c.transition = temp[c.index];
        });
        isLoading.value = false;
      },
      { once: true }
    );
  }
  sortedKeys.forEach((key) => {
    characteristic.value.push({
      index: parseInt(key),
      count: zoneCounts[key],
      total: total,
    });
  });
  characteristic.value.push({
    index: -1,
    count:
      total -
      Object.values(characteristic.value).reduce(
        (sum, item) => sum + item.count,
        0
      ),
    total: total,
  });
  isLoading.value = false;
}

onMounted(() => {
  watch(
    () => [
      store.getFiles,
      store.monthsSelected,
      props.isComparison,
      props.isShowingVectorField,
    ],
    () => {
      getCharacteristic();
    },
    { immediate: true }
  );
});
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
