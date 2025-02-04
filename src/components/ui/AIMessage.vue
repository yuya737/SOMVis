<template>
  <!-- Chat Message AI -->
  <div class="flex flex-1 gap-3 rounded-lg px-1 py-2 text-sm text-gray-600">
    <span class="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full">
      <div class="rounded-full border bg-white p-1 shadow-sm">
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
    <div class="flex w-full flex-col justify-start leading-relaxed">
      <span class="w-fit font-bold text-gray-700">AI </span>
      <span v-if="isLoading" class="w-fit"
        >Loading<span class="dots">{{ dots }}</span></span
      >
      <span v-else-if="isError" class="w-fit">
        Error in generating query. Try again.
      </span>
      <div v-else>
        <div v-if="props.payload.typeDetail == 'forward'">
          <div class="w-fit text-left">
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
        <div v-else class="text-left">
          {{ resolvedMessage }}
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, watchEffect, onMounted, computed } from "vue";
import API from "@/API/api";
import { useStore } from "@/store/main";

const isLoading = ref(true);
const resolvedMessage = ref("");
const store = useStore();
const dots = ref("");
const isError = ref(false);

const props = defineProps<{
  payload: { message: string; typeDetail: string };
  messageIndex: number;
}>();

const promiseState = ref(props.payload.message);

watch(
  promiseState,
  async (promise) => {
    if (props.payload.typeDetail == "forward") {
      try {
        // Wait for the promise to resolve
        const res = await promise;
        // result.value = res.description; // Assuming the response has a description field
        isLoading.value = true;
        isError.value = false;

        try {
          resolvedMessage.value = res["description"];
          // llm_generated_query.then(async (res) => {
          const { result } = await API.fetchData("/run_sqlquery", true, {
            sqlquery: res["SQLQuery"],
          });
          console.log("DEBUG CHATBOT result", result);
          store.highlightedNodes = result;
          store.LLMQueries.push({
            type: "forward",
            query: res["SQLQuery"],
            description: res["description"],
            result: result,
          });
          store.LLMQueriedRegionIndex = props.messageIndex;

          // });
        } catch (error) {
          console.error("Error resolving message:", error);
          store.LLMQueries.push({
            type: "forward",
            query: res["SQLQuery"],
            description: "ERROR",
            result: [-1],
          });
          isError.value = true;
        } finally {
          isLoading.value = false;
        }
      } catch (error) {
        // Handle error if promise is rejected
        console.error("Error in LLM Payload forwards:", error);
        store.LLMQueries.push({
          type: "forward",
          query: "ERROR",
          description: "ERROR",
          result: [-1],
        });
        isError.value = true;
      } finally {
        // Set loading to false after the fetch is complete
        isLoading.value = false;
      }
    } else {
      try {
        const res = await promise;
        isLoading.value = true;
        isError.value = false;
        resolvedMessage.value = res["llm_generated_summary"];
        store.LLMQueries.push({
          type: "backward",
          idsContained: res["idsContained"],
          description: res["llm_generated_summary"],
        });
      } catch (error) {
        console.error("Error in LLM Payload backwards", error);
        store.LLMQueries.push({
          type: "backward",
          idsContained: [-1],
          description: "ERROR",
        });
      } finally {
        isLoading.value = false;
      }
    }
  },
  { immediate: true }
);
watchEffect(async () => {});

// // Watch the message prop for changes and handle the promise
// watch(
//   () => props.message,
//   async (newMessage) => {
//     isLoading.value = true;
//     isError.value = false;
//     try {
//       const res = await newMessage;
//       try {
//         resolvedMessage.value = res["description"];
//         // llm_generated_query.then(async (res) => {
//         const { result } = await API.fetchData("/run_sqlquery", true, {
//           sqlquery: res["SQLQuery"],
//         });
//         console.log("DEBUG CHATBOT result", result);
//         store.highlightedNodes = result;
//         store.LLMQueries.push({
//           query: res["SQLQuery"],
//           description: res["description"],
//           result: result,
//         });
//         store.LLMQueriedRegionIndex = props.messageIndex;

//         // });
//       } catch (error) {
//         console.error("Error resolving message:", error);
//         isError.value = true;
//       } finally {
//         isLoading.value = false;
//       }
//     } catch (error) {
//       console.log("Error in resolving message", error);
//       isError.value = true;
//     }
//   },
//   { immediate: true }
// );
onMounted(() => {
  setInterval(() => {
    if (isLoading.value) {
      dots.value = dots.value.length >= 3 ? "" : dots.value + ".";
    }
  }, 500);
});
</script>
