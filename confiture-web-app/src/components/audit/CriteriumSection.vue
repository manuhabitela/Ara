<script lang="ts" setup>
defineProps<{
  /** Label of the accordion toggle button. */
  title?: string;
}>();
</script>

<template>
  <div
    class="criterium-section"
    style="background-color: var(--background-default-grey)"
  >
    <p
      v-if="!!title"
      class="fr-px-2w fr-py-3v fr-mb-0 fr-text--bold"
      style="background-color: var(--background-open-blue-france)"
    >
      {{ title }}
    </p>
    <div class="fr-px-2w fr-py-3v">
      <slot />
    </div>
  </div>
</template>
