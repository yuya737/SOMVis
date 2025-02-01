<template>
  <div class="h-full w-full flex flex-col">
    <HeaderBar />

    <Splitter
      style="height: 100%"
      layout="vertical"
      @resizeend="splitterResized"
    >
      <SplitterPanel style="height: 100%">
        <!-- <ProjectionViewer class="h-full" v-if="store.isDataReady" /> -->
        <ProjectionViewer
          v-if="store.isDataReady"
          class="h-full"
          :time_type="timeType.OctMay"
        />
        <!-- <Splitter
        class="h-full w-full"
        layout="horizontal"
        v-if="store.isDataReady"
        @resizeend="splitterResized"
      >
        <SplitterPanel class="h-full">
          <ProjectionViewer
            v-if="store.isDataReady"
            class="h-full"
            :time_type="timeType.OctMay"
          />
        </SplitterPanel>
        <SplitterPanel style="height: 100%" :size="50">
          <ProjectionViewer
            v-if="store.isDataReady"
            class="h-full"
            :time_type="timeType.OctMay"
          />
        </SplitterPanel>
      </Splitter> -->
      </SplitterPanel>

      <SplitterPanel
        v-if="store.currentStep == 'Analyze'"
        class="h-full w-full"
        :size="30"
      >
        <!-- <TimelineViewer
        v-if="store.isDataReady"
        class="h-full"
        :time_type="timeType.OctMay"
      /> -->
        <ForcingTimelineViewer
          v-if="store.isDataReady"
          class="h-full"
          :time_type="timeType.OctMay"
        />
        <!-- <Splitter
        class="h-full w-full"
        layout="horizontal"
        @resizeend="splitterResized"
      >
        <SplitterPanel class="h-full">
          <MapViewer class="h-full" />
          <TimelineViewer
            v-if="store.isDataReady"
            class="h-full"
            :time_type="timeType.OctMay"
          />
          <TimelineViewerTemporal class="h-full" />
          <ForceGraph class="h-full" />
        </SplitterPanel>
        <SplitterPanel style="height: 100%" :size="40">
          <HeatmapViewer
            v-if="store.isDataReady"
            class="h-full"
            :time_type="timeType.OctMay"
          />
        </SplitterPanel>
      </Splitter> -->
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
