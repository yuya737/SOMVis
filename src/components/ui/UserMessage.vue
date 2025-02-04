<template>
  <!--  User Chat Message -->
  <hr class="border-t border-gray-300" />
  <div :class="tailwindClass" @click="toggleMessageActive">
    <span class="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full">
      <div class="rounded-full border bg-white p-1">
        <svg
          stroke="none"
          fill="black"
          stroke-width="0"
          viewBox="0 0 16 16"
          height="20"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"
          ></path>
        </svg>
      </div>
    </span>
    <div class="flex w-full flex-row items-start justify-between">
      <div class="flex flex-col justify-start leading-relaxed">
        <span class="w-fit font-bold text-gray-700">You </span>
        <span class="text-left"> {{ props.payload.message }} </span>
      </div>
      <MapGlyph
        v-if="props.payload?.['typeDetail'] == 'backward'"
        :index-to-highlight="props.payload?.zoneID"
        :time_type="props.time_type"
        :width="100"
        justIndex
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useStore } from "@/store/main";
import { computed } from "vue";
import MapGlyph from "./MapGlyph.vue";
import { timeType } from "../utils/utils";

const store = useStore();
const props = defineProps<{
  payload: { message: string; typeDetail?: string; zoneID?: number };
  messageIndex: number;
  time_type: timeType;
}>();
const tailwindClass = computed(() =>
  store.LLMQueriedRegionIndex == props.messageIndex
    ? "flex gap-3 px-1 py-2 text-gray-600 text-sm flex-1 hover:bg-slate-200 rounded-lg bg-slate-300"
    : "flex gap-3 px-1 py-2 text-gray-600 text-sm flex-1 hover:bg-slate-200 rounded-lg"
);

function toggleMessageActive() {
  if (props.payload.typeDetail == "backward") return;
  if (store.LLMQueriedRegionIndex == props.messageIndex) {
    store.LLMQueriedRegionIndex = -1;
  } else {
    store.LLMQueriedRegionIndex = props.messageIndex;
  }
}
</script>
