<template>
  <div
    v-if="props.characteristic.transition == null"
    class="grid grid-cols-2 place-items-center gap-4"
  >
    <div class="flex w-full flex-row items-center justify-between gap-4">
      <span class="font-medium text-gray-600">{{
        props.characteristic.index == -1
          ? "Rest"
          : store.mapAnnotation.features[props.characteristic.index].properties
              ?.name
      }}</span>
      <MapGlyph
        :index-to-highlight="props.characteristic.index"
        :width="70"
        :time_type="props.time_type"
      />
    </div>
    <span class="font-semibold text-blue-600">
      {{
        Math.round(
          (props.characteristic.count / props.characteristic.total) * 100
        )
      }}% out of {{ props.characteristic.total }}
    </span>
  </div>
  <div
    v-else
    class="grid w-full grid-cols-[1fr_auto_1fr] place-items-center gap-4"
  >
    <div class="flex w-full flex-row items-center justify-between gap-4">
      <div class="flex w-full flex-row items-center justify-between gap-4">
        <span class="font-medium text-gray-600">{{
          props.characteristic.index == -1
            ? "Rest"
            : store.mapAnnotation.features[props.characteristic.index]
                .properties?.name
        }}</span>
        <MapGlyph
          :index-to-highlight="props.characteristic.index"
          :width="70"
          :time_type="props.time_type"
        />
      </div>
      <span class="font-semibold text-blue-600">
        {{
          Math.round(
            (props.characteristic.count / props.characteristic.total) * 100
          )
        }}%
      </span>
    </div>
    <div class="flex items-center">
      <i class="pi pi-angle-double-right text-xl" />
    </div>

    <div class="flex w-full flex-col items-center justify-between gap-4">
      <div
        v-for="t in props.characteristic.transition"
        :key="t.index"
        class="flex justify-between gap-2"
      >
        <!-- <span class="w-fit whitespace-nowrap font-medium text-gray-600">{{
          store.mapAnnotation.features[t.index].properties?.name
        }}</span> -->
        <div class="flex w-full flex-row items-center justify-between gap-4">
          <span class="font-medium text-gray-600">{{
            store.mapAnnotation.features[t.index].properties?.name
          }}</span>
          <MapGlyph
            :index-to-highlight="t.index"
            :width="40"
            :time_type="props.time_type"
          />
        </div>
        <span class="w-fit font-semibold text-blue-600">
          {{ Math.round(t.percentage * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useStore } from "@/store/main";
import { makeAnnotationGlyph, timeType } from "../utils/utils";
import MapGlyph from "./MapGlyph.vue";
const props = defineProps<{
  characteristic: {
    index: number;
    count: number;
    total: number;
    transition?: { index: number; percentage: number }[];
  };
  time_type: timeType;
}>();
const store = useStore();
</script>
