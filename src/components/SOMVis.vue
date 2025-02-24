<template>
  <div class="flex h-full w-full flex-col">
    <HeaderBar />

    <Splitter
      style="height: 100%"
      layout="vertical"
      @resizeend="splitterResized"
    >
      <SplitterPanel style="height: 100%">
        <ProjectionViewer
          v-if="store.isDataReady"
          class="h-full"
          :time_type="timeType.OctMay"
        />
      </SplitterPanel>

      <SplitterPanel
        v-show="store.currentStep == 'Analyze'"
        class="h-full w-full"
        :size="30"
      >
        <ForcingTimelineViewer
          v-if="store.isDataReady && store.isShowingForcingClustering"
          class="h-full"
          :time_type="timeType.OctMay"
        />
        <TimelineViewer
          v-if="store.isDataReady && !store.isShowingForcingClustering"
          class="h-full"
          :time_type="timeType.OctMay"
        />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { useStore } from "@/store/main";
import ProjectionViewer from "./ProjectionViewer.vue";
import MapViewer from "./MapViewer.vue";
import HeatmapViewer from "./HeatmapViewer.vue";
import TimelineViewer from "./TimelineViewer.vue";
import ForcingTimelineViewer from "./ForcingTimelineViewer.vue";
import HeaderBar from "./HeaderBar.vue";
import { provide, ref, watch } from "vue";
import { timeType } from "./utils/utils";

const store = useStore();
watch(
  () => store.isDataReady,
  () => {
    console.log("Data ready");
  }
);

let resizeFlag = ref(false);
provide("splitterResized", resizeFlag);

const splitterResized = () => {
  console.log("Splitter resized");
  resizeFlag.value = !resizeFlag.value;
};
</script>
