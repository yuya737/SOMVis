<template>
  <Splitter style="height: 100%" layout="horizontal">
    <SplitterPanel style="height: 100%" :size="50">
      <ProjectionViewer class="h-full" isHistorical />
    </SplitterPanel>

    <SplitterPanel style="height: 100%">
      <ProjectionViewer class="h-full" />
    </SplitterPanel>
  </Splitter>
</template>

<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import ProjectionViewer from "./ProjectionViewer.vue";
</script>
