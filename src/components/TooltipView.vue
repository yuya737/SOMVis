<template>
  <div class="card w-fit">
    <Button
      @click="$emit('closeCard')"
      class="absolute m-2 p-3 z-[2] top-0 right-0 bg-slate-200 aspect-square"
      >X</Button
    >
    <DataTable
      :value="members"
      scrollable
      scrollHeight="400px"
      showGridlines
      class="tight-rows"
    >
      <Column field="model_name" sortable header="Model Name"></Column>
      <Column field="variant" sortable header="Variant"></Column>
      <Column field="ssp" sortable header="SSP Type"></Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable";
import Button from "primevue/button";
import Column from "primevue/column";

import { onMounted, ref } from "vue";

// Emit the close event to the parent component

const props = defineProps<{
  members: EnsembleMember[];
}>();

const products = ref();
</script>

<style>
/* Remove padding from DataTable cells */
.p-datatable-tbody > tr > td {
  padding: 0.25rem 0.25rem;
}

/* Optionally, remove padding from header and footer cells */
.p-datatable-thead > tr > th,
.p-datatable-tfoot > tr > td {
  padding: 0.25rem 0.25rem;
}
</style>
