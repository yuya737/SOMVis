<template>
  <form class="mx-auto max-w-lg rounded-lg bg-slate-100 px-3 py-2">
    <div class="mb-3 flex flex-col items-center">
      <label
        for="small-input"
        class="mb-2 block text-lg font-medium text-gray-900"
        >Annotation Editor</label
      >
      <div
        v-if="LLMGeneratedDescription || isLLMSummaryLoading"
        class="m-1 w-full rounded-md bg-slate-200 p-1"
      >
        <div
          class="relative flex w-full items-center justify-center gap-2 font-bold"
        >
          <span
            class="align-center relative inline-flex h-[2rem] w-[2rem] shrink-0 overflow-hidden rounded-full"
          >
            <div class="rounded-full border bg-white p-1">
              <svg
                stroke="none"
                fill="black"
                stroke-width="1.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
                height="20"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
                class="h-full w-full"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                ></path>
              </svg>
            </div>
          </span>
          LLM-generated Summary
        </div>
        <div v-if="!isLLMSummaryLoading" class="text-sm">
          {{ LLMGeneratedDescription }}
        </div>
        <ProgressSpinner class="h-[3rem] w-[3rem]" v-else />
      </div>
      <div
        class="flex w-3/4 flex-row items-center justify-center gap-4 font-semibold"
      >
        <span>SOM Region Name: </span>
        <input
          type="text"
          id="small-input"
          v-model="text"
          :placeholder="prevName"
          class="text-md block flex-grow rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </div>
    <div class="flex flex-row">
      <button
        type="button"
        class="mb-2 me-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100"
        @click="saveAnnotation"
      >
        Save
      </button>
      <button
        type="button"
        class="mb-2 me-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100"
        @click="deleteAnnotation"
      >
        Delete
      </button>
      <button
        type="button"
        class="mb-2 me-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100"
        @click="closeAnnotation"
      >
        Close
      </button>
      <div class="flex flex-row items-center justify-center">
        <button
          type="button"
          class="mb-2 me-2 flex flex-row items-center justify-center rounded-lg border border-gray-300 bg-slate-200 px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100"
          @click="isShowingLLMSettingEditor = true"
        >
          <i class="pi pi-cog rounded-full p-1" />
          LLM Settings
        </button>
        <button
          type="button"
          class="mb-2 me-2 flex flex-row items-center justify-center rounded-lg border border-gray-300 bg-slate-200 px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100"
          @click="summarizeRegion"
        >
          <span
            class="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full"
          >
            <div class="rounded-full border bg-white p-1">
              <svg
                stroke="none"
                fill="black"
                stroke-width="1.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
                height="20"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                ></path>
              </svg>
            </div>
          </span>
          {{
            LLMGeneratedDescription ? "Rerun Summarization" : "Summarize Region"
          }}
        </button>
      </div>
    </div>
    <LLMSettingEditor
      v-if="isShowingLLMSettingEditor"
      :time_type="props.time_type"
      @llm-setting-close="isShowingLLMSettingEditor = false"
    />
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useStore } from "@/store/main";
import API from "@/API/api";
import { constructZones, timeType } from "../utils/utils";
import ProgressSpinner from "primevue/progressspinner";
import LLMSettingEditor from "./LLMSettingEditor.vue";

const store = useStore();
const text = ref("");

const isLLMSummaryLoading = ref(false);
const isShowingLLMSettingEditor = ref(false);
const editorLeft = ref(0);
const editorTop = ref(0);

onMounted(async () => {
  if (store.LLMSummaryIntervals == null) {
    let { min, max } = await API.fetchData("get_extents", true, {
      dataset_type: store.currentDatasetType,
      time_type: props.time_type,
    });
    min /= 3;
    max /= 3;
    store.LLMSummaryIntervals = [
      (min / 3) * 2,
      min / 3,
      max / 3,
      (max / 3) * 2,
    ];
  }
});

const props = defineProps({
  annotationProps: Object,
  time_type: timeType,
});

const LLMGeneratedDescription = computed(
  () =>
    store.mapAnnotation.features[props.annotationProps.index].properties?.[
      "llmGeneratedSummary"
    ]
);

const prevName = store.mapAnnotation.features[props.annotationProps.index]
  .properties["name"]
  ? store.mapAnnotation.features[props.annotationProps.index].properties["name"]
  : "Enter Name";

function saveAnnotation() {
  store.mapAnnotation.features[props.annotationProps.index].properties["name"] =
    text.value;
  store.redrawFlag = !store.redrawFlag;
  store.showMapAnnotationPopup = false;
}

function deleteAnnotation() {
  store.mapAnnotation.features.splice(props.annotationProps.index, 1);
  store.redrawFlag = !store.redrawFlag;
  store.showMapAnnotationPopup = false;
}

function closeAnnotation() {
  store.showMapAnnotationPopup = false;
}

async function summarizeRegion() {
  isLLMSummaryLoading.value = true;
  store.chatBotHistory.push({
    text: "Summarize this region",
    zoneID: props.annotationProps.index,
    type: "User",
    typeDetail: "backward",
  });

  const zones = constructZones(store.mapAnnotation);
  const llm_generated_payload = API.fetchData("/llm_summarize", true, {
    zone: zones[props.annotationProps.index],
    dataset_type: store.currentDatasetType,
    cutoffs: store.LLMSummaryIntervals,
  });

  store.chatBotHistory.push({
    text: llm_generated_payload,
    zoneID: props.annotationProps.index,
    type: "AI",
    typeDetail: "backward",
  });

  llm_generated_payload.then(({ llm_generated_summary, idsContained }) => {
    store.mapAnnotation.features[props.annotationProps.index].properties[
      "llmGeneratedSummary"
    ] = llm_generated_summary;
    store.mapAnnotation.features[props.annotationProps.index].properties[
      "idsContained"
    ] = idsContained;
    isLLMSummaryLoading.value = false;
  });
  console.log("DEBUG LLM SUMMARY", llm_generated_payload);
}
</script>
