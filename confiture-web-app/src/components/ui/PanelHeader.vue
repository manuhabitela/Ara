<script setup lang="ts">
defineProps<{
  title: string;
  buttonIcon: string;
  buttonLabel: string;
}>();

const emit = defineEmits<{
  (e: "button-click"): void;
}>();
</script>

<template>
  <div class="heading-wrapper">
    <h2 class="fr-h4 fr-mb-0">{{ title }}</h2>
    <button
      ref="hideFiltersRef"
      type="button"
      :class="[
        'fr-btn fr-btn--sm fr-btn--tertiary toggle-column-button',
        buttonIcon
      ]"
      @click="emit('button-click')"
    >
      <span class="sr-only">{{ buttonLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.heading-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.toggle-column-button:focus-visible {
  outline: 2px solid var(--dsfr-outline);
  outline-offset: -2px;
}
</style>
