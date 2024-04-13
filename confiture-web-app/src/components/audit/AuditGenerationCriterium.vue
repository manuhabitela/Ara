<script setup lang="ts">
import { marked } from "marked";
import { ref, computed } from "vue";
import { debounce } from "lodash-es";
import { HTTPError } from "ky";

import {
  AuditPage,
  AuditType,
  CriterionResultUserImpact,
  CriteriumResult,
  CriteriumResultStatus,
  ExampleImage
} from "../../types";
import CriteriumCompliantAccordion from "./CriteriumCompliantAccordion.vue";
import CriteriumNotApplicableAccordion from "./CriteriumNotApplicableAccordion.vue";
import CriteriumNotCompliantAccordion from "./CriteriumNotCompliantAccordion.vue";
import { useResultsStore, useFiltersStore, useAuditStore } from "../../store";
import { useNotifications } from "../../composables/useNotifications";
import MultipleStateButton, {
  ButtonColor
} from "../ui/MultipleStateButton.vue";
import { captureWithPayloads, formatStatus } from "../../utils";
import { useIsOffline } from "../../composables/useIsOffline";

const store = useResultsStore();
const auditStore = useAuditStore();
const filtersStore = useFiltersStore();

const props = defineProps<{
  topicNumber: number;
  // FIXME: type things
  criterium: any;
  page: AuditPage;
  auditUniqueId: string;
  even?: boolean;
}>();

const statuses: Array<{
  label: string;
  value: CriteriumResultStatus;
  color?: ButtonColor;
}> = [
  {
    label: formatStatus(CriteriumResultStatus.NOT_TESTED, true),
    value: CriteriumResultStatus.NOT_TESTED,
    color: "transparent"
  },
  {
    label: formatStatus(CriteriumResultStatus.COMPLIANT, true),
    value: CriteriumResultStatus.COMPLIANT,
    color: "green"
  },
  {
    label: formatStatus(CriteriumResultStatus.NOT_COMPLIANT, true),
    value: CriteriumResultStatus.NOT_COMPLIANT,
    color: "red"
  },
  {
    label: formatStatus(CriteriumResultStatus.NOT_APPLICABLE, true),
    value: CriteriumResultStatus.NOT_APPLICABLE,
    color: "grey"
  },
  {
    label: formatStatus(CriteriumResultStatus.TODO, true),
    value: CriteriumResultStatus.TODO,
    color: "yellow"
  }
];

const result = computed(
  () =>
    store.getCriteriumResult(
      props.page.id,
      props.topicNumber,
      props.criterium.number
    )!
);

const notify = useNotifications();

const showFileSizeError = ref(false);
const showFileFormatError = ref(false);

const showComments = ref(true);

function isTestOpened(topicNumber: number, criterium: any) {
  return (
    auditStore.shownTests?.topicNumber === topicNumber &&
    auditStore.shownTests?.criterium.number === criterium.number
  );
}

function toggleTests(topicNumber: number, criterium: any) {
  if (isTestOpened(topicNumber, criterium)) {
    auditStore.hideTests();
  } else {
    auditStore.showTests(topicNumber, criterium);
  }
}

function handleUploadExample(file: File) {
  showFileSizeError.value = false;
  showFileFormatError.value = false;

  if (file.size > 2000000) {
    showFileSizeError.value = true;
    notify(
      "error",
      "Le téléchargement de l'exemple a échoué",
      "Poids du fichier trop lourd"
    );
    return;
  }

  store
    .uploadExampleImage(
      props.auditUniqueId,
      props.page.id,
      props.topicNumber,
      props.criterium.number,
      file
    )
    .then(() => {
      notify("success", "Exemple téléchargé avec succès.");
    })
    .catch(async (error) => {
      if (error instanceof HTTPError) {
        if (error.response.status === 413) {
          showFileSizeError.value = true;
          notify(
            "error",
            "Le téléchargement de l'exemple a échoué",
            "Poids du fichier trop lourd"
          );
        }

        // Unprocessable Entity
        if (error.response.status === 422) {
          const body = await error.response.json();

          if (body.message.includes("expected type")) {
            showFileFormatError.value = true;
            notify(
              "error",
              "Le téléchargement de l'exemple a échoué",
              "Format de fichier non supporté"
            );
          } else if (body.message.includes("expected size")) {
            showFileSizeError.value = true;
            notify(
              "error",
              "Le téléchargement de l'exemple a échoué",
              "Poids du fichier trop lourd"
            );
          } else {
            notify(
              "error",
              "Le téléchargement de l'exemple a échoué",
              "Une erreur inconnue est survenue"
            );
            captureWithPayloads(error);
          }
        } else {
          notify(
            "error",
            "Téléchargement échoué",
            "Une erreur inconnue est survenue"
          );
          captureWithPayloads(error);
        }
      }
    });
}

function handleDeleteExample(image: ExampleImage) {
  store
    .deleteExampleImage(
      props.auditUniqueId,
      props.page.id,
      props.topicNumber,
      props.criterium.number,
      image.id
    )
    .then(() => {
      notify("success", "Exemple supprimé avec succès");
    })
    .catch(() => {
      notify(
        "error",
        "Echec de la suppression de l'exemple",
        "Une erreur inconnue empêche la suppression de l'exemple."
      );
    });
}

function handleUpdateResultError(err: any) {
  console.log(err);
  notify(
    "error",
    "Une erreur est survenue",
    "Un problème empêche la sauvegarde de vos données. Contactez-nous à l'adresse contact@design.numerique.gouv.fr si le problème persiste."
  );
}

function updateResultStatus(status: CriteriumResultStatus) {
  store
    .updateResults(props.auditUniqueId, [{ ...result.value, status }])
    .then(() => {
      if (
        store.everyCriteriumAreTested &&
        !auditStore.currentAudit?.publicationDate
      ) {
        auditStore.publishAudit(props.auditUniqueId).then(() => {
          notify(
            "info",
            "Bravo ! Il semblerait que vous ayez terminé votre audit 💪",
            auditStore.currentAudit?.auditType === AuditType.FULL
              ? "Il ne vous reste qu’à compléter la déclaration d’accessibilité avant de la livrer avec votre rapport."
              : "Il ne vous reste qu’à livrer votre rapport."
          );
        });
      }
    })
    .catch(handleUpdateResultError);
}

// Wait 500ms since the last modification before sending the PATCH request
const updateResultComment = debounce(
  async (comment: string, key: keyof CriteriumResult) => {
    try {
      await store.updateResults(props.auditUniqueId, [
        { ...result.value, [key]: comment }
      ]);
    } catch (error) {
      handleUpdateResultError(error);
    }
  },
  500
);

function updateResultImpact(userImpact: CriterionResultUserImpact | null) {
  store
    .updateResults(props.auditUniqueId, [{ ...result.value, userImpact }])
    .catch(handleUpdateResultError);
}

function updateTransverseStatus(e: Event) {
  const transverse = (e.target as HTMLInputElement).checked;
  store
    .updateResults(props.auditUniqueId, [{ ...result.value, transverse }])
    .catch(handleUpdateResultError);
}

function updateQuickWin(quickWin: boolean) {
  store
    .updateResults(props.auditUniqueId, [{ ...result.value, quickWin }])
    .catch(handleUpdateResultError);
}

// Get a unique id for a criterium per page (e.g. 1-1-8)
const uniqueId = computed(() => {
  return `${props.page.id}-${props.topicNumber}-${props.criterium.number}`;
});

const isOffline = useIsOffline();
</script>

<template>
  <li
    :class="['fr-px-2w fr-py-0 criterium-container', { 'is-even': props.even }]"
  >
    <div class="criterium-row">
      <div class="fr-my-2v criterium-main-section">
        <button
          type="button"
          :class="[
            'criterium-number fr-btn fr-btn--sm',
            { 'fr-btn--primary ': isTestOpened(topicNumber, criterium) },
            { 'fr-btn--tertiary ': !isTestOpened(topicNumber, criterium) }
          ]"
          title="Afficher la méthodologie de tests"
          :aria-label="`Critère {{ topicNumber }}.{{ criterium.number }} - Afficher la méthodologie de tests`"
          @click="toggleTests(topicNumber, criterium)"
        >
          {{ topicNumber }}.{{ criterium.number }}
        </button>
        <div
          class="criterium-title"
          v-html="marked.parseInline(criterium.title)"
        />
      </div>

      <!-- STATUS -->
      <div :class="['fr-pl-4w fr-my-2v criterium-status-container']">
        <MultipleStateButton
          :disabled="isOffline"
          :model-value="result.status"
          :label="`Statut du critère ${topicNumber}.${criterium.number}`"
          hide-label
          :default-value="CriteriumResultStatus.NOT_TESTED"
          :items="statuses"
          @update:model-value="updateResultStatus"
        />

        <div class="fr-checkbox-group">
          <input
            :id="`applicable-all-pages-${uniqueId}`"
            :checked="result.transverse"
            type="checkbox"
            :disabled="
              result.status === CriteriumResultStatus.NOT_TESTED || isOffline
            "
            @input="updateTransverseStatus"
          />
          <label class="fr-label" :for="`applicable-all-pages-${uniqueId}`">
            <span class="sr-only">
              Appliquer le statut {{ formatStatus(result.status) }} pour le
              critère {{ topicNumber }}.{{ criterium.number }}
            </span>
            Partout
          </label>
        </div>

        <div class="criterium-comments-toggler">
          <button
            :class="[
              'fr-btn fr-icon-discuss-line',
              { 'fr-btn--tertiary ': !showComments }
            ]"
            :disabled="
              result.status === CriteriumResultStatus.NOT_TESTED || isOffline
            "
            title="Afficher les commentaires"
            @click="() => (showComments = !showComments)"
          >
            Afficher les commentaires
          </button>
        </div>
      </div>

      <div
        v-if="!!showComments"
        :class="['criterium-comments-container fr-pl-4w']"
      >
        <!-- FIXME: left/right arrow bug -->
        <!-- COMMENT / DESCRIPTION -->
        <CriteriumCompliantAccordion
          v-if="result.status === CriteriumResultStatus.COMPLIANT"
          :id="`compliant-accordion-${uniqueId}`"
          :comment="result.compliantComment"
          @update:comment="updateResultComment($event, 'compliantComment')"
        />

        <CriteriumNotApplicableAccordion
          v-else-if="result.status === CriteriumResultStatus.NOT_APPLICABLE"
          :id="`not-applicable-accordion-${uniqueId}`"
          :comment="result.notApplicableComment"
          @update:comment="updateResultComment($event, 'notApplicableComment')"
        />

        <CriteriumNotApplicableAccordion
          v-else-if="result.status === CriteriumResultStatus.TODO"
          :id="`todo-accordion-${uniqueId}`"
          :comment="result.todoComment"
          @update:comment="updateResultComment($event, 'todoComment')"
        />

        <CriteriumNotCompliantAccordion
          v-else-if="result.status === CriteriumResultStatus.NOT_COMPLIANT"
          :id="`not-compliant-accordion-${uniqueId}`"
          :comment="result.errorDescription"
          :user-impact="result.userImpact"
          :example-images="result.exampleImages"
          :recommandation="result.recommandation"
          :quick-win="result.quickWin"
          :show-file-format-error="showFileFormatError"
          :show-file-size-error="showFileSizeError"
          @update:comment="updateResultComment($event, 'errorDescription')"
          @update:user-impact="updateResultImpact($event)"
          @upload-example="handleUploadExample"
          @delete-example="handleDeleteExample"
          @update:recommandation="updateResultComment($event, 'recommandation')"
          @update:quick-win="updateQuickWin"
        />
      </div>
    </div>
  </li>
</template>

<style scoped>
.criterium-container {
  background: var(--background-alt-blue-france);
  border-bottom: 1px solid var(--blue-france-850-200);
  border-radius: 0.25rem;
  list-style: none;
  margin-left: -2rem;
  margin-right: -2rem;
}

.criterium-container.is-even {
  /* background: var(--background-alt-blue-france); */
  /* background: var(--background-alt-grey); */
}

.criterium-container::marker {
  content: none;
}

.criterium-row {
  align-items: baseline;
  display: flex;
}

.criterium-main-section {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0.5rem;
}

.criterium-title {
  color: var(--text-action-high-grey);
  width: 70ch;
}

.audit-page-wrapper.is-with-left-panel .criterium-title {
  width: 60ch;
}

.criterium-status-container {
  max-width: 32rem;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0 1rem;
  flex-shrink: 0;
}

.criterium-comments-toggler,
.criterium-tests-toggler {
  position: relative;
  top: 4px;
}

.criterium-comments-container {
  flex-grow: 1;
}
</style>
