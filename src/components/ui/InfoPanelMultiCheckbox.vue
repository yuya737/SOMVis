<template>
    <div>
        <h1 :id="titleID" class="text-lg font-bold text-black" />
        <p :id="bodyID" class="text-base text-black" />
    </div>
    <Divider />
    <div v-if="hasScales">
        <div
            v-for="scale in props.scheme.scales"
            :key="scale.variable"
            class="InfoPanel-checkboxdropdown-scales"
        >
            <InfoPanelScale :scale="scale" />
        </div>
    </div>
    <!-- <Divider /> -->
    <div
        v-for="option in checkboxOptions.values"
        :key="option"
        class="InfoPanel-checkboxdropdown-checkbox"
    >
        <Checkbox
            v-model="selectedOptionsCheckbox"
            :value="option"
            @change="optionsChanged"
        />
        <label class="text-black">{{ option }}</label>
    </div>
</template>

<script setup lang="ts">
import InfoPanelScale from "./InfoPanelScale.vue";
import { watch, inject, computed, ref, onMounted } from "vue";
import { InfoPanelProps } from "@/types/mapTypes";
import Checkbox from "primevue/checkbox";
import Divider from "primevue/divider";
import Dropdown from "primevue/dropdown";

const titleID = `title-${Math.random()}`;
const bodyID = `title-${Math.random()}`;

onMounted(() => {
    document.getElementById(titleID).innerHTML = props.scheme.title;
    document.getElementById(bodyID).innerHTML += props.scheme.info;
});

const emit = defineEmits(["settings-changed"]);
const props = defineProps<{
    scheme: InfoPanelProps.Settings;
}>();
console.log(props.scheme);

const hasScales = props.scheme.scales !== undefined;

const checkboxOptions = props.scheme.options.filter(
    (option) => option.type === "checkbox",
)[0];

const selectedOptionsCheckbox = ref([]);

const optionsChanged = (value) => {
    // Need to check for checkbox and dropdown
    let updatedSettings = {};
    // console.log(selectedOptionsCheckbox.value);
    console.log(selectedOptionsCheckbox.value);

    updatedSettings[checkboxOptions.emitVal] = selectedOptionsCheckbox.value;
    // checkboxOptions.forEach(
    //     (option) =>
    //         (updatedSettings[option.emitVal] =
    //             selectedOptionsCheckbox.value.includes(option.name)),
    // );
    // updatedSettings[dropdownOptions.emitVal] =
    //     selectedDropdownOptions.value.name;
    emit("settings-changed", updatedSettings);
};
</script>

<style scoped>
.InfoPanel-checkboxdropdown-checkbox {
    text-align: left;
    padding: 5px;
}
.InfoPanel-checkboxdropdown-checkbox label {
    padding-left: 10%;
}
.InfoPanel-checkboxdropdown-dropdown {
    text-align: center;
}
</style>
