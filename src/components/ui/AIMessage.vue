<template>
  <!-- Chat Message AI -->
  <div class="flex gap-3 px-1 py-2 text-gray-600 text-sm flex-1 rounded-lg">
    <span class="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
      <div class="rounded-full bg-gray-100 border p-1">
        <svg
          stroke="none"
          fill="black"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
          height="20"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          ></path>
        </svg>
      </div>
    </span>
    <div class="leading-relaxed flex flex-col justify-start w-full">
      <span class="font-bold text-gray-700 w-fit">AI </span>
      <span v-if="isLoading" class="w-fit"
        >Loading<span class="dots">{{ dots }}</span></span
      >
      <div v-else>
        <!-- <span class="text-left">{{ resolvedMessage }}</span> -->
        <div class="w-fit">
          Given the query, we resolved regions to the below known counties and
          queried the SOM node space.
        </div>
        <table class="w-full">
          <thead>
            <tr>
              <th>Region</th>
              <th>Resolved Counties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, key) in resolvedMessage" :key="key">
              <td>{{ key }}</td>
              <td>{{ value.join(", ") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useStore } from "@/store/main";

const isLoading = ref(true);
const resolvedMessage = ref("");
const store = useStore();
const dots = ref("");

const props = defineProps<{
  message: Promise<string>;
  messageIndex: number;
}>();

// Watch the message prop for changes and handle the promise
watch(
  () => props.message,
  async (newMessage) => {
    isLoading.value = true;
    try {
      const res = await newMessage;
      resolvedMessage.value = res["description"];
    } catch (error) {
      console.error("Error resolving message:", error);
      resolvedMessage.value = "Error loading message";
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true }
);
onMounted(() => {
  setInterval(() => {
    if (isLoading.value) {
      dots.value = dots.value.length >= 3 ? "" : dots.value + ".";
    }
  }, 500);
});
</script>
