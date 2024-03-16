<template>
    <div class="InfoPanelContainer">
        <div id="InfoPanelContainer-dropdownarray">
            <Dropdown
                class="InfoPanelDropdown"
                v-model="selectedLayer"
                :options="layers"
                optionLabel="name"
                placeholder="Select a Layer"
                @change="changed"
            />
            <Button
                :icon="infoPanelTogglerIcon"
                :style="{ height: 'fit-content' }"
                @click="toggleInfoPanel"
            />
        </div>
        <div v-show="showInfoPanel">
            <InfoPanelDynamicRenderer
                :schema="schema"
                :selectedSchema="selectedSchema"
                @settings-changed="settingsChanged"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, computed, nextTick } from "vue";
import InfoPanelDynamicRenderer from "./InfoPanelDynamicRenderer.vue";
import InfoPanelCheckboxDropdown from "./InfoPanelCheckboxDropdown.vue";
import InfoPanelText from "./InfoPanelText.vue";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";

const infoPanelTogglerIcon = ref("pi pi-minus");
const showInfoPanel = ref(true);
const toggleInfoPanel = () => {
    showInfoPanel.value = !showInfoPanel.value;
    infoPanelTogglerIcon.value = showInfoPanel.value
        ? "pi pi-minus"
        : "pi pi-plus";
};

const emit = defineEmits(["settings-changed"]);

const props = defineProps({
    settings: { type: Object, required: true },
});

const layers = ref(
    props.settings.map((element) => {
        return { name: element.title, id: element.id };
    }),
);
const selectedLayer = ref(layers.value[0]);

const resolveInfoPanelObject = (id) => {
    // if (id === "checkbox") return InfoPanelCheckbox;
    if (id === "text") return InfoPanelText;
    if (id === "checkbox-dropdown") return InfoPanelCheckboxDropdown;
};

const schema = props.settings.map((element) => {
    return {
        ...element,
        type: resolveInfoPanelObject(element.type),
    };
});

const selectedSchema = computed(() => {
    return schema.findIndex((d) => d.id === selectedLayer.value.id);
});

const changed = () => {
    nextTick(() => {
        console.log(selectedLayer.value);
    });
};

const settingsChanged = (value) => {
    emit("settings-changed", value);
};
</script>

<style scoped>
.InfoPanelContainer {
    box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
    font-size: 18px;
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    margin: 24px;
    background: #fff;
    padding: 10px 24px;
    max-height: 96%;
    overflow-x: hidden;
    overflow-y: auto;
    overflow-y: overlay;
    outline: none;
}

.InfoPanelDropdown {
    margin: 10px;
    text-align: center;
    width: 70%;
}
#InfoPanelContainer-dropdownarray {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
}
</style>
./InfoPanelCheckboxDropdown.vue
