<script lang="ts">
export type ButtonColor = "red" | "green" | "yellow" | "transparent" | "grey";
</script>

<script lang="ts" setup>
import { useUniqueId } from "../../composables/useUniqueId";

const props = defineProps<{
  label: string;
  hideLabel?: boolean;
  items: {
    value: any;
    label: string;
    tooltip: string;
    color?: ButtonColor;
  }[];
  disabled?: boolean;
  defaultValue: any;

  modelValue: any;
}>();

const uniqueId = useUniqueId();

let currentStatus = props.items.find((i) => i.value === props.modelValue);
if (!currentStatus) {
  currentStatus = props.items.find((i) => i.value === props.defaultValue);
}

const emit = defineEmits<{
  (e: "update:modelValue", payload: any): void;
}>();

function handleChange() {
  const index = props.items.findIndex((i) => i.value === props.modelValue);
  let nextStatus;
  if (index !== -1) {
    nextStatus =
      index === props.items.length - 1
        ? props.items[0]
        : props.items[index + 1];
    currentStatus = nextStatus;
    emit("update:modelValue", nextStatus.value);
  }
}
</script>

<template>
  <button
    :id="`multiple-state-button-${uniqueId}`"
    :class="['fr-btn fr-btn--sm fr-btn--secondary', currentStatus?.color]"
    :aria-describedby="`multiple-state-button-tooltip-${uniqueId}`"
    :title="currentStatus?.tooltip"
    @click="handleChange()"
  >
    {{ currentStatus?.label }}
  </button>
</template>

<style scoped>
button {
  box-shadow: inset 0 0 0 1px currentColor;
  text-align: center;
  justify-content: center;
  width: 5.5ch;
}

button.grey {
  background-color: var(--background-disabled-grey);
  color: var(--text-default-grey);
}

button.green {
  background-color: var(--background-contrast-success);
  color: var(--text-default-success);
}

button.yellow {
  background-color: var(--background-alt-yellow-moutarde);
  color: var(--text-label-yellow-moutarde);
}

button.red {
  background-color: var(--background-contrast-error);
  color: var(--text-default-error);
}

button.transparent {
  background-color: transparent;
  color: var(--text-default-grey);
}
</style>
