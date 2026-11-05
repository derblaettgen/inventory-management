<template>
  <div class="filters-bar">
    <div class="filters-container">
      <div class="filters-grid">
        <div class="filter-group">
          <label>{{ t('filters.timePeriod') }}</label>
          <select v-model="selectedPeriod" class="filter-select">
            <option value="all">{{ t('filters.allMonths') }}</option>
            <option value="2025-01">{{ t('months.january') }}</option>
            <option value="2025-02">{{ t('months.february') }}</option>
            <option value="2025-03">{{ t('months.march') }}</option>
            <option value="2025-04">{{ t('months.april') }}</option>
            <option value="2025-05">{{ t('months.may') }}</option>
            <option value="2025-06">{{ t('months.june') }}</option>
            <option value="2025-07">{{ t('months.july') }}</option>
            <option value="2025-08">{{ t('months.august') }}</option>
            <option value="2025-09">{{ t('months.september') }}</option>
            <option value="2025-10">{{ t('months.october') }}</option>
            <option value="2025-11">{{ t('months.november') }}</option>
            <option value="2025-12">{{ t('months.december') }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>{{ t('filters.location') }}</label>
          <select v-model="selectedLocation" class="filter-select">
            <option value="all">{{ t('filters.all') }}</option>
            <option value="San Francisco">{{ t('warehouses.sanFrancisco') }}</option>
            <option value="London">{{ t('warehouses.london') }}</option>
            <option value="Tokyo">{{ t('warehouses.tokyo') }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>{{ t('filters.category') }}</label>
          <select v-model="selectedCategory" class="filter-select">
            <option value="all">{{ t('filters.all') }}</option>
            <option value="circuit boards">{{ t('categories.circuitBoards') }}</option>
            <option value="sensors">{{ t('categories.sensors') }}</option>
            <option value="actuators">{{ t('categories.actuators') }}</option>
            <option value="controllers">{{ t('categories.controllers') }}</option>
            <option value="power supplies">{{ t('categories.powerSupplies') }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>{{ t('filters.orderStatus') }}</label>
          <select v-model="selectedStatus" class="filter-select">
            <option value="all">{{ t('filters.all') }}</option>
            <option value="delivered">{{ t('status.delivered') }}</option>
            <option value="shipped">{{ t('status.shipped') }}</option>
            <option value="processing">{{ t('status.processing') }}</option>
            <option value="backordered">{{ t('status.backordered') }}</option>
          </select>
        </div>
      </div>

      <button
        class="reset-filters-btn"
        @click="resetFilters"
        :disabled="!hasActiveFilters"
        :title="t('filters.reset')"
        :aria-label="t('filters.reset')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'FilterBar',
  setup() {
    const {
      selectedPeriod,
      selectedLocation,
      selectedCategory,
      selectedStatus,
      hasActiveFilters,
      resetFilters
    } = useFilters()

    const { t } = useI18n()

    return {
      t,
      selectedPeriod,
      selectedLocation,
      selectedCategory,
      selectedStatus,
      hasActiveFilters,
      resetFilters
    }
  }
}
</script>

<style scoped>
.filters-bar {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line, #ececef);
  padding: 0.75rem 0;
  position: sticky;
  top: var(--topbar-h, 84px);
  z-index: 90;
}

.filters-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 2.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filters-grid {
  display: flex;
  flex-wrap: wrap; /* wrap filters onto a second row instead of overflowing on narrow screens */
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 0.75rem 1.5rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted, #71717a);
  white-space: nowrap;
}

.filter-select {
  appearance: none;
  height: 38px;
  padding: 0 2.25rem 0 1rem;
  border: 1px solid var(--line, #ececef);
  border-radius: 999px;
  font-size: 0.938rem;
  font-weight: 500;
  color: var(--ink, #18181b);
  /* chevron drawn inline so the pill keeps one consistent arrow across browsers */
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 0.875rem center / 14px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  min-width: 150px;
}

.filter-select:hover {
  border-color: #d4d4d8;
}

.filter-select:focus-visible {
  outline: 2px solid var(--ink, #18181b);
  outline-offset: 2px;
}

.reset-filters-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: #fff;
  border: 1px solid var(--line, #ececef);
  border-radius: 999px;
  color: var(--ink, #18181b);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.reset-filters-btn:hover:not(:disabled) {
  background: var(--fill, #f4f4f5);
}

.reset-filters-btn:focus-visible {
  outline: 2px solid var(--ink, #18181b);
  outline-offset: 2px;
}

.reset-filters-btn:disabled {
  color: var(--muted-2, #a1a1aa);
  cursor: not-allowed;
}

.reset-filters-btn svg {
  width: 16px;
  height: 16px;
}

/* Phones: 2x2 grid with labels above, and not sticky -- four filters would
   otherwise pin a large share of a small screen under the topbar */
@media (max-width: 767px) {
  .filters-bar {
    position: static;
  }

  .filters-container {
    padding: 0 1rem;
    align-items: flex-end;
    gap: 0.625rem;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.625rem 0.75rem;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    min-width: 0;
  }

  .filter-group label {
    font-size: 0.813rem;
  }

  .filter-select {
    min-width: 0;
    width: 100%;
    height: 42px;
    font-size: 1rem; /* 16px stops iOS Safari zooming into the select */
  }

  .reset-filters-btn {
    width: 42px;
    height: 42px;
  }
}
</style>
