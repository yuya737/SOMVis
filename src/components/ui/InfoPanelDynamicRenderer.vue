<template>
    <div>
        <div v-for="(scheme, index) in schema" :key="index">
            <KeepAlive>
                <component
                    v-if="index == selectedSchema"
                    :is="scheme.type"
                    :scheme="scheme"
                    @settings-changed="settingsChanged"
                >
                </component>
            </KeepAlive>
        </div>
    </div>
</template>

<script setup lang="ts">
import InfoPanelCheckbox from "./InfoPanelCheckbox.vue";
import { ref } from "vue";

const emit = defineEmits(["settings-changed"]);

const props = defineProps({
    schema: { type: Object, required: true },
    selectedSchema: { type: Number, required: true },
});

const settingsChanged = (value) => {
    emit("settings-changed", value);
};
</script>

<style scoped></style>
