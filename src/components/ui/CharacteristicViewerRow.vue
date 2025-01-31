<template>
  <div
    v-if="props.characteristic.transition == null"
    class="grid grid-cols-2 gap-4 place-items-center"
  >
    <div class="flex flex-row justify-between items-center gap-4 w-full">
      <span class="font-medium text-gray-600">{{
        store.mapAnnotation.features[props.characteristic.index].properties
          ?.name
      }}</span>
      <span
        v-html="
          makeAnnotationGlyph(
            store.mapAnnotation,
            store.nodeMap[props.time_type],
            props.characteristic.index,
            70
          )
        "
      />
    </div>
    <span class="text-blue-600 font-semibold">
      {{
        Math.round(
          (props.characteristic.count / props.characteristic.total) * 100
        )
      }}% out of {{ props.characteristic.total }}
    </span>
  </div>
  <div
    v-else
    class="grid grid-cols-[1fr_auto_1fr] w-full gap-4 place-items-center"
  >
    <div class="flex flex-row justify-between items-center w-full gap-4">
      <div class="flex flex-row justify-between items-center gap-4 w-full">
        <span class="font-medium text-gray-600">{{
          store.mapAnnotation.features[props.characteristic.index].properties
            ?.name
        }}</span>
        <span
          v-html="
            makeAnnotationGlyph(
              store.mapAnnotation,
              store.nodeMap[props.time_type],
              props.characteristic.index,
              70
            )
          "
        />
      </div>
      <span class="text-blue-600 font-semibold">
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

    <div class="flex flex-col gap-4 justify-between items-center w-full">
      <div
        v-for="t in props.characteristic.transition"
        :key="t.index"
        class="flex justify-between gap-2"
      >
        <!-- <span class="font-medium text-gray-600 whitespace-nowrap w-fit">{{
          store.mapAnnotation.features[t.index].properties?.name
        }}</span> -->
        <div class="flex flex-row justify-between items-center gap-4 w-full">
          <span class="font-medium text-gray-600">{{
            store.mapAnnotation.features[t.index].properties?.name
          }}</span>
          <span
            v-html="
              makeAnnotationGlyph(
                store.mapAnnotation,
                store.nodeMap[props.time_type],
                t.index,
                30
              )
            "
          />
        </div>
        <span class="text-blue-600 font-semibold w-fit">
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

// let characteristicGlyph = makeAnnotationGlyph(
//   store.mapAnnotation,
//   store.nodeMap[props.time_type],
//   props.characteristic.index,
//   70
// );
// svgContent.value = characteristicGlyph.outerHTML;
// console.log("DEBUG GET CHARACTERISTIC GLYPH", characteristicGlyph);
</script>
