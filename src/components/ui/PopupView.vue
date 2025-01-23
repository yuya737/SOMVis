<!-- Modal.vue -->
<template>
  <div v-if="visible">
    <div class="bg-white rounded-md p-1">
      <p>{{ message }}</p>
      <div class="flex justify-evenly items-center">
        <button @click="handleClick('yes')">Yes</button>
        <button @click="handleClick('no')">No</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// Reactive states for visibility and message
const visible = ref(false);
const message = ref("");
let resolvePromise = null;

// Show method returns a Promise
const show = (msg) => {
  message.value = msg;
  visible.value = true;

  return new Promise((resolve) => {
    resolvePromise = resolve; // Store the resolve function
  });
};

// Handle user interaction
const handleClick = (result) => {
  visible.value = false; // Hide modal
  resolvePromise(result); // Resolve the Promise with the result
};

// Expose the show method for the parent component
defineExpose({
  show,
});
</script>
