<template>
    <div>
        <h1 id="title" class="text-lg font-bold text-black">
            {{ props.scheme.title }}
        </h1>
        <p id="body" class="text-base text-black">{{ props.scheme.info }}</p>
    </div>
    <Divider />
    <div
        class="InfoPanel-text-scales"
        v-if="hasScales"
        v-for="scale in props.scheme.scales"
    >
        <InfoPanelScale :scale="scale" />
    </div>
</template>

<script setup lang="ts">
import { ref, emit, onMounted } from "vue";
import Divider from "primevue/divider";
import InfoPanelScale from "./InfoPanelScale.vue";

// Seems like we need this because the dynamic renderer listens for this even though the textpanel doesn't care to emit anything.
const emit = defineEmits(["settings-changed"]);

const props = defineProps({
    scheme: { type: Object, required: true },
});

const hasScales = props.scheme.scales !== undefined;

onMounted(() => {
    // document.getElementById("title").innerHTML = props.scheme.title;
    // document.getElementById("body").innerHTML += props.scheme.info;
});
</script>
<style scoped>
.legend {
    display: inline-block;
    height: 20px;
}
</style>
