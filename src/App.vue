<script setup>
// import HelloWorld from './components/HelloWorld.vue'
// import EOFVis from "./components/EOFVis.vue";
import ProjectionViewer from "./components/ProjectionViewer.vue";
import SOMVis from "./components/SOMVis.vue";
</script>

<template>
    <!-- <EOFVis /> -->
    <!-- <ProjectionViewer /> -->
    <SOMVis />
</template>

<style scoped>
.logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
}
.logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
    filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
./components/SOMVis.vue
