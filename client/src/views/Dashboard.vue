<template>
  <div class="dashboard">
    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="board">
      <!-- Hero: order revenue against the revenue goal -->
      <section class="hero" :aria-label="t('dashboard.hero.progress')">
        <div class="hero-figure">
          <div class="hero-value">{{ heroGoal.valueText }}</div>
          <div class="hero-caption">
            {{ t(selectedPeriod === 'all' ? 'dashboard.hero.captionYTD' : 'dashboard.hero.captionMTD') }}
          </div>
        </div>

        <div class="hero-goal">
          <p class="goal-line">
            <span class="goal-delta" :class="heroGoal.reached ? 'is-good' : 'is-bad'">{{ heroGoal.deltaText }}</span>
            {{ heroGoal.reached ? t('dashboard.hero.above') : t('dashboard.hero.below') }}
          </p>
          <div class="goal-track" role="img" :aria-label="heroGoal.aria">
            <div class="goal-glow" :style="heroGoal.fillStyle" aria-hidden="true"></div>
            <div class="goal-fill" :style="heroGoal.fillStyle" aria-hidden="true"></div>
            <div class="goal-marker" :style="{ left: heroGoal.goalPct + '%' }" aria-hidden="true">
              <span class="goal-marker-label">{{ t('dashboard.hero.goal') }} {{ heroGoal.goalText }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- KPIs against their goals -->
      <section class="kpis" :aria-label="t('dashboard.kpi.title')">
        <div v-for="k in kpis" :key="k.key" class="kpi">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-row">
            <span class="kpi-icon" :class="k.good ? 'is-good' : 'is-bad'" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path v-if="k.up" d="M12 19V5M6 11l6-6 6 6" />
                <path v-else d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </span>
            <span class="kpi-value">{{ k.valueText }}</span>
          </div>
          <div class="kpi-delta" :class="k.good ? 'is-good' : 'is-bad'">{{ k.deltaText }}</div>
        </div>
      </section>

      <div class="split">
        <!-- Top products -->
        <section class="panel">
          <header class="panel-head">
            <h3 class="panel-title">{{ t('dashboard.topProducts.heading') }}</h3>
            <span class="panel-sub"><strong>{{ allProducts.length }}</strong> {{ t('dashboard.topProducts.countLine') }}</span>
            <div class="segmented" role="group" :aria-label="t('dashboard.topProducts.rankBy')">
              <button type="button" :aria-pressed="rankBy === 'revenue'" @click="rankBy = 'revenue'">
                {{ t('dashboard.topProducts.byRevenue') }}
              </button>
              <button type="button" :aria-pressed="rankBy === 'units'" @click="rankBy = 'units'">
                {{ t('dashboard.topProducts.byUnits') }}
              </button>
            </div>
          </header>

          <p v-if="topProducts.length === 0" class="empty">{{ t('dashboard.inventoryShortages.noData') }}</p>
          <ul v-else class="product-list">
            <li v-for="item in topProducts" :key="item.sku" class="product-row" @click="showProductDetail(item)">
              <span class="tile" :class="'cat-' + categorySlug(item.category)" aria-hidden="true">{{ item.sku.split('-')[0] }}</span>
              <div class="row-name">
                <strong>{{ translateProductName(item.name) }}</strong>
                <span>{{ item.sku }} · {{ translateWarehouse(item.warehouse) }}</span>
              </div>
              <div class="row-meta">
                <span class="pill" :class="{ 'is-low': item.stockLevel === 'Low Stock' }">
                  <svg class="signal" viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="2" y="9" width="3" height="5" rx="1" />
                    <rect x="6.5" y="6" width="3" height="8" rx="1" :class="{ off: item.stockLevel !== 'In Stock' }" />
                    <rect x="11" y="3" width="3" height="11" rx="1" :class="{ off: item.stockLevel !== 'In Stock' }" />
                  </svg>
                  {{ translateStockLevel(item.stockLevel) }}
                </span>
                <span class="row-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" />
                  </svg>
                  {{ formatDate(item.firstOrderDate) }}
                </span>
              </div>
              <div class="row-share">
                <svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="14" class="ring-track" />
                  <circle cx="18" cy="18" r="14" class="ring-value" :stroke-dasharray="`${item.share * 0.88} 88`" />
                </svg>
                <div class="share-text">
                  <strong>{{ item.share.toFixed(1) }}%</strong>
                  <span>{{ rankBy === 'units' ? item.unitsOrdered.toLocaleString() + ' ' + t('dashboard.topProducts.units') : formatCurrencyCompact(item.revenue, selectedCurrency) }}</span>
                </div>
              </div>
              <button
                type="button"
                class="row-menu"
                :aria-label="t('dashboard.topProducts.viewDetails', { name: translateProductName(item.name) })"
                @click.stop="showProductDetail(item)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
            </li>
          </ul>
        </section>

        <!-- Order status flower: petal size follows each status's share -->
        <section class="panel panel-side">
          <header class="panel-head">
            <h3 class="panel-title">{{ t('dashboard.orderHealth.statusTitle') }}</h3>
          </header>
          <div class="flower" role="img" :aria-label="statusAria">
            <svg viewBox="0 0 300 300" aria-hidden="true">
              <defs>
                <clipPath id="flower-clip"><circle cx="150" cy="150" r="140" /></clipPath>
                <filter id="flower-blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="18" />
                </filter>
              </defs>
              <g clip-path="url(#flower-clip)">
                <rect width="300" height="300" fill="#f6f6f8" />
                <g filter="url(#flower-blur)">
                  <circle v-for="s in statusShares" :key="s.key" :cx="s.cx" :cy="s.cy" :r="s.r" :fill="s.color" />
                </g>
                <g stroke="#fff" stroke-width="5">
                  <line x1="150" y1="150" x2="0" y2="0" />
                  <line x1="150" y1="150" x2="300" y2="0" />
                  <line x1="150" y1="150" x2="300" y2="300" />
                  <line x1="150" y1="150" x2="0" y2="300" />
                </g>
              </g>
              <circle cx="150" cy="150" r="38" fill="#fff" />
            </svg>
            <div class="flower-center" aria-hidden="true">
              <strong>{{ totalOrders }}</strong>
              <span>{{ t('dashboard.orderHealth.ordersCaption') }}</span>
            </div>
            <div v-for="s in statusShares" :key="s.key" class="flower-label" :class="'pos-' + s.pos" aria-hidden="true">
              <strong>{{ s.pct }}%</strong>
              <span>{{ s.label }}</span>
            </div>
          </div>
          <dl class="side-stats">
            <div>
              <dt>{{ t('dashboard.orderHealth.avgOrderValue') }}</dt>
              <dd>{{ formatCurrencyCompact(orderHealthMetrics.avgOrderValue, selectedCurrency) }}</dd>
            </div>
            <div>
              <dt>{{ t('dashboard.orderHealth.onTimeRate') }}</dt>
              <dd :class="{ 'is-bad': orderHealthMetrics.onTimeRate < 75 }">{{ orderHealthMetrics.onTimeRate.toFixed(1) }}%</dd>
            </div>
            <div>
              <dt>{{ t('dashboard.orderHealth.avgFulfillmentDays') }}</dt>
              <dd>{{ orderHealthMetrics.avgFulfillmentDays.toFixed(1) }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div class="split">
        <!-- Inventory shortages -->
        <section class="panel">
          <header class="panel-head">
            <h3 class="panel-title">{{ t('dashboard.inventoryShortages.title') }}</h3>
            <span class="panel-sub"><strong>{{ backlogItems.length }}</strong> {{ t('dashboard.inventoryShortages.openCount') }}</span>
          </header>

          <div v-if="backlogItems.length === 0" class="empty empty-good">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" />
            </svg>
            {{ t('dashboard.inventoryShortages.noShortages') }}
          </div>
          <ul v-else class="short-list">
            <li v-for="item in backlogItems" :key="item.id" class="short-row" @click="showBacklogDetail(item)">
              <div class="row-name">
                <button
                  type="button"
                  class="row-link"
                  :aria-label="t('dashboard.inventoryShortages.viewDetails', { name: translateProductName(item.item_name) })"
                  @click.stop="showBacklogDetail(item)"
                >{{ translateProductName(item.item_name) }}</button>
                <span>{{ item.order_id }} · {{ item.item_sku }}</span>
              </div>
              <div class="short-qty">
                <span>{{ t('dashboard.inventoryShortages.availableOf', { available: item.quantity_available, needed: item.quantity_needed }) }}</span>
                <div class="mini-track" aria-hidden="true">
                  <div class="mini-bar" :style="{ width: Math.min(item.quantity_available / item.quantity_needed * 100, 100) + '%' }"></div>
                </div>
              </div>
              <div class="short-tags">
                <span class="badge danger">
                  {{ Math.abs(item.quantity_needed - item.quantity_available) }} {{ t('dashboard.inventoryShortages.unitsShort') }}
                </span>
                <span class="short-delay" :class="{ late: item.days_delayed > 7 }">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
                  </svg>
                  {{ item.days_delayed }} {{ t('dashboard.inventoryShortages.days') }}
                </span>
                <span :class="['badge', item.priority]">{{ translatePriority(item.priority) }}</span>
              </div>
              <button
                v-if="!item.purchase_order_id"
                type="button"
                class="po-button"
                @click.stop="openPOModal(item)"
              >{{ t('dashboard.inventoryShortages.createPO') }}</button>
              <button
                v-else
                type="button"
                class="po-button is-view"
                @click.stop="viewPO(item)"
              >{{ t('dashboard.inventoryShortages.viewPO') }}</button>
            </li>
          </ul>
        </section>

        <!-- Inventory value by category -->
        <section class="panel panel-side">
          <header class="panel-head">
            <h3 class="panel-title">{{ t('dashboard.inventoryValue.title') }}</h3>
          </header>
          <p v-if="categoryRows.length === 0" class="empty">{{ t('dashboard.inventoryShortages.noData') }}</p>
          <ul v-else class="cat-list">
            <li v-for="cat in categoryRows" :key="cat.category">
              <div class="cat-top">
                <span>{{ translateCategory(cat.name) }}</span>
                <strong>{{ formatCurrencyCompact(cat.value, selectedCurrency) }}</strong>
              </div>
              <div class="cat-track" aria-hidden="true">
                <div class="cat-bar" :class="'cat-' + cat.category.replace(/\s+/g, '-')" :style="{ width: (cat.value / maxCategoryValue * 100) + '%' }"></div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <ProductDetailModal
      :is-open="showProductModal"
      :product="selectedProduct"
      @close="showProductModal = false"
    />

    <BacklogDetailModal
      :is-open="showBacklogModal"
      :backlog-item="selectedBacklogItem"
      @close="showBacklogModal = false"
    />

    <PurchaseOrderModal
      :is-open="showPOModal"
      :backlog-item="selectedBacklogForPO"
      :mode="poModalMode"
      @close="showPOModal = false"
      @po-created="handlePOCreated"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'
import { formatCurrency, formatCurrencyCompact } from '../utils/currency'
import ProductDetailModal from '../components/ProductDetailModal.vue'
import BacklogDetailModal from '../components/BacklogDetailModal.vue'

export default {
  name: 'Dashboard',
  components: {
    ProductDetailModal,
    BacklogDetailModal,
  },
  setup() {
    const { t, currentCurrency, currentLocale, translateProductName, translateWarehouse } = useI18n()
    const loading = ref(true)
    const error = ref(null)
    const summary = ref({})
    const allOrders = ref([])
    const inventoryItems = ref([])

    // Modal state
    const showProductModal = ref(false)
    const selectedProduct = ref(null)
    const showBacklogModal = ref(false)
    const selectedBacklogItem = ref(null)
    const showPOModal = ref(false)
    const selectedBacklogForPO = ref(null)
    const poModalMode = ref('create')

    // Use shared filters
    const {
      selectedPeriod,
      selectedLocation,
      selectedCategory,
      selectedStatus,
      getCurrentFilters
    } = useFilters()

    const ordersData = ref({ fulfilled: 187, goal: 200 })
    const fillRate = ref(96.8)

    const revenueGoal = computed(() => {
      // $800K per month, so if looking at all months (12 months), goal is 12 * 800K = 9.6M
      const monthlyGoal = 800000
      if (selectedPeriod.value === 'all') {
        return monthlyGoal * 12 // $9,600,000 for the full year
      }
      return monthlyGoal // $800,000 for a single month
    })

    // Hero bar: the track is scaled to whichever is larger (revenue or goal) plus
    // headroom, so the goal marker stays visible even when revenue overshoots it.
    // The gradient runs red -> green up to the goal position, then stays green.
    const heroGoal = computed(() => {
      const revenue = summary.value.total_orders_value || 0
      const goal = revenueGoal.value
      const ratio = goal > 0 ? revenue / goal : 0
      const scaleMax = Math.max(revenue, goal) * 1.06 || 1
      const fillPct = Math.max((revenue / scaleMax) * 100, 2)
      const goalPct = (goal / scaleMax) * 100
      const reached = ratio >= 1
      const deltaPct = Math.round(Math.abs(ratio - 1) * 100)
      const currency = currentCurrency.value
      return {
        reached,
        goalPct,
        valueText: formatCurrencyCompact(revenue, currency),
        goalText: formatCurrencyCompact(goal, currency),
        deltaText: (reached ? '+' : '') + deltaPct + '%',
        aria: t('dashboard.hero.aria', {
          revenue: formatCurrency(revenue, currency),
          goal: formatCurrency(goal, currency)
        }),
        fillStyle: {
          width: fillPct + '%',
          // size the gradient to the whole track so colours map to absolute positions
          backgroundSize: (10000 / fillPct) + '% 100%',
          backgroundImage: `linear-gradient(90deg, #ff9f9f 0%, #ffd37f ${goalPct * 0.5}%, #a9e690 ${goalPct}%, #8ddf97 100%)`
        }
      }
    })

    // KPI targets come from the business goals; for processing time lower is better
    const kpis = computed(() => {
      const make = (key, label, valueText, delta, goalText, lowerIsBetter = false) => {
        const up = delta >= 0
        return {
          key,
          label,
          valueText,
          up,
          good: lowerIsBetter ? delta <= 0 : delta >= 0,
          deltaText: t(up ? 'dashboard.kpi.aboveGoal' : 'dashboard.kpi.belowGoal', {
            value: Math.abs(delta).toFixed(1),
            goal: goalText
          })
        }
      }
      const fulfilled = ordersData.value.fulfilled
      const fulfilledGoal = ordersData.value.goal
      return [
        make('fulfilled', t('dashboard.kpi.ordersFulfilled'), String(fulfilled), (fulfilled / fulfilledGoal - 1) * 100, String(fulfilledGoal)),
        // fill rate delta is in percentage points, as before
        make('fillRate', t('dashboard.kpi.orderFillRate'), fillRate.value + '%', fillRate.value - 95, '95%'),
        make('turnover', t('dashboard.kpi.inventoryTurnover'), '4.2', (4.2 / 4.5 - 1) * 100, '4.5'),
        make('processing', t('dashboard.kpi.avgProcessingTime'), '2.8', (2.8 / 3.0 - 1) * 100, '3.0', true)
      ]
    })

    const statusData = computed(() => {
      const counts = { delivered: 0, shipped: 0, processing: 0, backordered: 0 }
      allOrders.value.forEach(order => {
        const status = order.status.toLowerCase()
        if (counts[status] !== undefined) counts[status]++
      })
      return counts
    })

    const totalOrders = computed(() => {
      return statusData.value.delivered + statusData.value.shipped +
             statusData.value.processing + statusData.value.backordered
    })

    // Flower petals: one per status, placed top/right/bottom/left; the blurred
    // blob's radius grows with the square root of its share so area tracks count.
    const statusShares = computed(() => {
      const defs = [
        ['delivered', 'top', '#6fe3a0', 150, 66],
        ['shipped', 'right', '#d5ec7a', 234, 150],
        ['processing', 'bottom', '#fdc37b', 150, 234],
        ['backordered', 'left', '#fb9494', 66, 150]
      ]
      const total = totalOrders.value
      const max = Math.max(1, ...defs.map(([key]) => statusData.value[key]))
      return defs.map(([key, pos, color, cx, cy]) => {
        const count = statusData.value[key]
        return {
          key,
          pos,
          color,
          cx,
          cy,
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
          r: count > 0 ? 30 + 62 * Math.sqrt(count / max) : 0,
          label: t('status.' + key)
        }
      })
    })

    const statusAria = computed(() => t('dashboard.orderHealth.statusAria', {
      total: totalOrders.value,
      parts: statusShares.value.map(s => `${s.label} ${s.pct}%`).join(', ')
    }))

    const orderHealthMetrics = computed(() => {
      const totalOrders = allOrders.value.length
      const totalValue = allOrders.value.reduce((sum, order) => sum + (order.total_value || 0), 0)
      const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0

      // Calculate on-time delivery rate (delivered orders that arrived on or before expected date)
      const deliveredOrders = allOrders.value.filter(o => o.status.toLowerCase() === 'delivered')
      const onTimeDeliveries = deliveredOrders.filter(o => {
        if (o.actual_delivery && o.expected_delivery) {
          return new Date(o.actual_delivery) <= new Date(o.expected_delivery)
        }
        return false
      }).length
      const onTimeRate = deliveredOrders.length > 0 ? (onTimeDeliveries / deliveredOrders.length) * 100 : 0

      // Calculate average fulfillment speed (days from order to delivery for delivered orders)
      let totalDays = 0
      let countWithDates = 0
      deliveredOrders.forEach(o => {
        if (o.order_date && o.actual_delivery) {
          const orderDate = new Date(o.order_date)
          const deliveryDate = new Date(o.actual_delivery)
          const days = Math.round((deliveryDate - orderDate) / (1000 * 60 * 60 * 24))
          if (!isNaN(days)) {
            totalDays += days
            countWithDates++
          }
        }
      })
      const avgFulfillmentDays = countWithDates > 0 ? totalDays / countWithDates : 0

      return {
        totalOrders,
        totalValue,
        avgOrderValue,
        onTimeRate,
        avgFulfillmentDays
      }
    })

    const categoryData = computed(() => {
      // Group inventory by category and calculate values
      // Filter inventory items to only include those with orders in the selected period
      const categoryMap = {}

      // Get SKUs from orders in the filtered time period
      const orderedSkus = new Set()
      allOrders.value.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            orderedSkus.add(item.sku)
          })
        }
      })

      // Only include inventory items that have orders in the selected period
      // If no period is selected (all), include all inventory items
      const itemsToInclude = selectedPeriod.value === 'all'
        ? inventoryItems.value
        : inventoryItems.value.filter(item => orderedSkus.has(item.sku))

      itemsToInclude.forEach(item => {
        const cat = item.category.toLowerCase()
        if (!categoryMap[cat]) {
          categoryMap[cat] = {
            name: item.category,
            value: 0,
            category: cat,
            count: 0
          }
        }
        categoryMap[cat].value += item.quantity_on_hand * item.unit_cost
        categoryMap[cat].count += 1
      })

      return Object.values(categoryMap)
    })

    const categoryRows = computed(() => [...categoryData.value].sort((a, b) => b.value - a.value))

    const maxCategoryValue = computed(() => {
      if (categoryData.value.length === 0) return 1
      return Math.max(...categoryData.value.map(c => c.value))
    })

    // Every product ordered under the current filters
    const allProducts = computed(() => {
      const productMap = {}

      // allOrders is already filtered by API based on: month, warehouse, category, status
      allOrders.value.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            const sku = item.sku

            // Find matching inventory item to get full product details
            // Note: inventoryItems is also filtered by API based on: warehouse, category
            const invItem = inventoryItems.value.find(i => i.sku === sku)

            // Skip products that don't match current inventory filters
            // (e.g., if filtering by warehouse A, don't show products from warehouse B)
            if (!invItem && (selectedLocation.value !== 'all' || selectedCategory.value !== 'all')) {
              return // Skip this product as it doesn't match inventory filters
            }

            if (!productMap[sku]) {
              productMap[sku] = {
                name: item.name,
                sku: sku,
                category: invItem?.category || 'Unknown',
                warehouse: invItem?.warehouse || 'Unknown',
                unitsOrdered: 0,
                revenue: 0,
                stockLevel: invItem ? (invItem.quantity_on_hand > invItem.reorder_point ? 'In Stock' : 'Low Stock') : 'Unknown',
                firstOrderDate: order.order_date
              }
            } else if (order.order_date && (!productMap[sku].firstOrderDate || order.order_date < productMap[sku].firstOrderDate)) {
              // Keep the EARLIEST order date
              productMap[sku].firstOrderDate = order.order_date
            }
            productMap[sku].unitsOrdered += item.quantity
            productMap[sku].revenue += item.quantity * item.unit_price
          })
        }
      })

      return Object.values(productMap)
    })

    // Top list ranked by the selected measure; share is against all ordered products
    const rankBy = ref('revenue')
    const topProducts = computed(() => {
      const measure = rankBy.value === 'units' ? 'unitsOrdered' : 'revenue'
      const total = allProducts.value.reduce((sum, p) => sum + p[measure], 0)
      return [...allProducts.value]
        .sort((a, b) => b[measure] - a[measure])
        .slice(0, 8)
        .map(p => ({ ...p, share: total > 0 ? (p[measure] / total) * 100 : 0 }))
    })

    const allBacklogItems = ref([])

    // Filter backlog based on inventory filters
    const backlogItems = computed(() => {
      if (selectedLocation.value === 'all' && selectedCategory.value === 'all') {
        return allBacklogItems.value
      }

      // Get SKUs of items that match the filters
      const validSkus = new Set(inventoryItems.value.map(item => item.sku))
      return allBacklogItems.value.filter(b => validSkus.has(b.item_sku))
    })

    const loadData = async () => {
      try {
        loading.value = true
        const filters = getCurrentFilters()

        const [summaryData, ordersData, inventoryData, backlogData] = await Promise.all([
          api.getDashboardSummary(filters),
          api.getOrders(filters),
          api.getInventory(filters),
          api.getBacklog()
        ])

        summary.value = summaryData
        allOrders.value = ordersData
        inventoryItems.value = inventoryData
        allBacklogItems.value = backlogData
      } catch (err) {
        error.value = 'Failed to load dashboard data: ' + err.message
      } finally {
        loading.value = false
      }
    }

    const categorySlug = (category) => (category || '').toLowerCase().replace(/\s+/g, '-')

    const translateCategory = (category) => {
      const categoryMap = {
        'Circuit Boards': t('categories.circuitBoards'),
        'Sensors': t('categories.sensors'),
        'Actuators': t('categories.actuators'),
        'Controllers': t('categories.controllers'),
        'Power Supplies': t('categories.powerSupplies')
      }
      return categoryMap[category] || category
    }

    const translateStockLevel = (stockLevel) => {
      const stockMap = {
        'In Stock': t('status.inStock'),
        'Low Stock': t('status.lowStock')
      }
      return stockMap[stockLevel] || stockLevel
    }

    const translatePriority = (priority) => {
      const priorityMap = {
        'high': t('priority.high'),
        'medium': t('priority.medium'),
        'low': t('priority.low'),
        'High': t('priority.high'),
        'Medium': t('priority.medium'),
        'Low': t('priority.low')
      }
      return priorityMap[priority] || priority
    }

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const showProductDetail = (product) => {
      selectedProduct.value = product
      showProductModal.value = true
    }

    const showBacklogDetail = (item) => {
      selectedBacklogItem.value = item
      showBacklogModal.value = true
    }

    const openPOModal = (item) => {
      selectedBacklogForPO.value = item
      poModalMode.value = 'create'
      showPOModal.value = true
    }

    const viewPO = (item) => {
      selectedBacklogForPO.value = item
      poModalMode.value = 'view'
      showPOModal.value = true
    }

    const handlePOCreated = (poData) => {
      // Update the backlog item with the new PO ID
      const item = allBacklogItems.value.find(b => b.id === poData.backlog_item_id)
      if (item) {
        item.purchase_order_id = poData.id
        item.purchase_order = poData
      }
      showPOModal.value = false
    }

    // Watch for filter changes and reload data
    watch([selectedPeriod, selectedLocation, selectedCategory, selectedStatus], () => {
      loadData()
    })

    onMounted(loadData)

    return {
      t,
      loading,
      error,
      selectedPeriod,
      selectedCurrency: currentCurrency,
      heroGoal,
      kpis,
      totalOrders,
      statusShares,
      statusAria,
      orderHealthMetrics,
      categoryRows,
      maxCategoryValue,
      allProducts,
      rankBy,
      topProducts,
      backlogItems,
      categorySlug,
      translateCategory,
      translateStockLevel,
      translatePriority,
      translateProductName,
      translateWarehouse,
      formatDate,
      formatCurrencyCompact,
      showProductModal,
      selectedProduct,
      showProductDetail,
      showBacklogModal,
      selectedBacklogItem,
      showBacklogDetail,
      showPOModal,
      selectedBacklogForPO,
      poModalMode,
      openPOModal,
      viewPO,
      handlePOCreated
    }
  }
}
</script>

<style scoped>
.board {
  --gap-x: 2.5rem;
}

.empty {
  color: var(--muted);
  padding: 2rem 0;
}

.empty-good {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--good);
}

.empty-good svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.is-good { color: var(--good); }
.is-bad { color: var(--bad); }

/* ---------- Hero ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  align-items: center;
  gap: 2rem 4rem;
  padding: 0.5rem 0 3rem;
  border-bottom: 1px solid var(--line);
}

.hero-value {
  font-size: clamp(3.75rem, 7.5vw, 7.5rem);
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.hero-caption {
  margin-top: 0.875rem;
  font-size: 1.125rem;
  color: var(--muted);
}

.goal-line {
  font-size: 1.125rem;
  color: var(--muted);
  margin-bottom: 2.25rem; /* room for the goal label above the marker */
}

.goal-delta {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-right: 0.375rem;
}

.goal-track {
  position: relative;
  height: 64px;
  border-radius: 10px;
  background: var(--fill);
}

.goal-fill,
.goal-glow {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 10px;
  background-repeat: no-repeat;
  transform-origin: left center;
  animation: goal-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* soft coloured light under the bar, as in the reference */
.goal-glow {
  top: 18px;
  bottom: -18px;
  filter: blur(22px);
  opacity: 0.55;
}

.goal-marker {
  position: absolute;
  top: -10px;
  bottom: -10px;
  width: 3px;
  margin-left: -1.5px;
  border-radius: 3px;
  background: var(--ink);
  animation: fade-in 0.4s 0.7s ease-out both;
}

.goal-marker-label {
  position: absolute;
  bottom: calc(100% + 0.375rem);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}

@keyframes goal-grow {
  from { transform: scaleX(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
}

/* ---------- KPI row ---------- */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.kpi {
  padding: 2rem 2rem 2rem 0;
}

.kpi + .kpi {
  padding-left: 2rem;
  border-left: 1px solid var(--line);
}

.kpi-label {
  font-size: 1rem;
  font-weight: 500;
  color: var(--ink-2);
  margin-bottom: 0.875rem;
}

.kpi-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.kpi-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: #fff;
  flex-shrink: 0;
}

.kpi-icon.is-good { background: var(--good-solid); color: #fff; }
.kpi-icon.is-bad { background: var(--bad-solid); color: #fff; }

.kpi-icon svg {
  width: 16px;
  height: 16px;
}

.kpi-value {
  font-size: 2.5rem;
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.kpi-delta {
  margin-top: 0.5rem;
  font-size: 0.938rem;
}

/* ---------- Split panels ---------- */
.split {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
  border-bottom: 1px solid var(--line);
}

.split:last-child {
  border-bottom: none;
}

.panel {
  padding: 2.25rem var(--gap-x) 2.25rem 0;
  min-width: 0;
}

.panel-side {
  padding: 2.25rem 0 2.25rem var(--gap-x);
  border-left: 1px solid var(--line);
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.panel-sub {
  padding-left: 1rem;
  border-left: 1px solid var(--line);
  color: var(--muted);
  font-size: 1rem;
}

.panel-sub strong {
  color: var(--ink);
  font-weight: 600;
}

.segmented {
  margin-left: auto;
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
}

.segmented button {
  height: 36px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 0.938rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.segmented button:hover {
  color: var(--ink);
}

.segmented button[aria-pressed='true'] {
  background: var(--ink);
  color: #fff;
}

.segmented button:focus-visible,
.row-menu:focus-visible,
.row-link:focus-visible,
.po-button:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

/* ---------- Product list ---------- */
.product-list,
.short-list,
.cat-list {
  list-style: none;
}

.product-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1.05fr) minmax(0, 1.1fr) 40px;
  align-items: center;
  gap: 1.25rem;
  padding: 0.875rem 0;
  cursor: pointer;
}

.product-row + .product-row {
  border-top: 1px solid var(--line);
}

.product-row:hover .row-name strong {
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--muted-2);
}

.tile {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: var(--fill);
  color: var(--ink-2);
}

/* one quiet tint per category, shared with the category bars */
.cat-circuit-boards { background: #eef0ff; color: #4338ca; }
.cat-sensors { background: #e8f7ec; color: #15803d; }
.cat-actuators { background: #fef3e2; color: #b45309; }
.cat-controllers { background: #f5ecff; color: #7e22ce; }
.cat-power-supplies { background: #fdecea; color: #c2410c; }

.row-name {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.row-name strong,
.row-link {
  font-size: 1.063rem;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-name span {
  font-size: 0.875rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  display: contents; /* pill and date are their own grid columns on wide screens */
}

.pill {
  justify-self: start;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 34px;
  padding: 0 0.875rem;
  border-radius: 999px;
  background: var(--fill);
  font-size: 0.938rem;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
}

.pill.is-low {
  background: var(--warn-soft);
  color: var(--warn);
}

.signal {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.signal .off {
  opacity: 0.25;
}

.row-date {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink-2);
  font-size: 0.938rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.row-date svg {
  width: 17px;
  height: 17px;
  color: var(--muted-2);
}

.row-share {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ring {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke-width: 4.5;
}

.ring-track { stroke: var(--ring-track); }

.ring-value {
  stroke: var(--ring);
  stroke-linecap: round;
}

.share-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.share-text strong {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.share-text span {
  font-size: 0.813rem;
  color: var(--muted);
  white-space: nowrap;
}

.row-menu {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
}

.row-menu:hover {
  background: var(--fill);
}

.row-menu svg {
  width: 20px;
  height: 20px;
}

/* ---------- Order status flower ---------- */
.flower {
  position: relative;
  width: 100%;
  max-width: 340px;
  margin: 0.5rem auto 0;
  aspect-ratio: 1;
}

.flower svg {
  width: 100%;
  height: 100%;
  display: block;
}

.flower-center,
.flower-label {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  line-height: 1.15;
}

.flower-center {
  left: 50%;
  top: 50%;
}

.flower-center strong {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
}

.flower-center span {
  font-size: 0.688rem;
  color: var(--muted);
}

.flower-label strong {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.flower-label span {
  font-size: 0.875rem;
  color: var(--ink-2);
}

.pos-top { left: 50%; top: 22%; }
.pos-right { left: 78%; top: 50%; }
.pos-bottom { left: 50%; top: 78%; }
.pos-left { left: 22%; top: 50%; }

.side-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 2rem;
  border-top: 1px solid var(--line);
}

.side-stats div {
  padding: 1.125rem 0.75rem 0 0;
}

.side-stats div + div {
  padding-left: 0.875rem;
  border-left: 1px solid var(--line);
}

.side-stats dt {
  font-size: 0.813rem;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.side-stats dd {
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

/* ---------- Shortages ---------- */
.short-row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.3fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 0;
  cursor: pointer;
}

.short-row + .short-row {
  border-top: 1px solid var(--line);
}

.row-link {
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.row-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--muted-2);
}

.short-qty {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}

.mini-track {
  height: 6px;
  border-radius: 999px;
  background: var(--bad-soft);
  overflow: hidden;
}

.mini-bar {
  height: 100%;
  border-radius: 999px;
  background: var(--ink);
}

.short-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.875rem;
}

.short-delay {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--warn);
  white-space: nowrap;
}

.short-delay.late {
  color: var(--bad);
}

.short-delay svg {
  width: 16px;
  height: 16px;
}

.po-button {
  height: 38px;
  padding: 0 1.125rem;
  border-radius: 999px;
  border: none;
  background: var(--ink);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease;
}

.po-button:hover {
  background: #3f3f46;
}

.po-button.is-view {
  background: #fff;
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--line);
}

.po-button.is-view:hover {
  background: var(--fill);
}

/* ---------- Category value ---------- */
.cat-list li + li {
  margin-top: 1.25rem;
}

.cat-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.938rem;
  color: var(--ink-2);
}

.cat-top strong {
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.cat-track {
  height: 10px;
  border-radius: 999px;
  background: var(--fill);
  overflow: hidden;
}

.cat-bar {
  height: 100%;
  border-radius: 999px;
  transform-origin: left center;
  animation: goal-grow 0.9s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* bars use the category tint's ink colour so the list and tiles match */
.cat-bar.cat-circuit-boards { background: #818cf8; }
.cat-bar.cat-sensors { background: #4ade80; }
.cat-bar.cat-actuators { background: #fbbf24; }
.cat-bar.cat-controllers { background: #c084fc; }
.cat-bar.cat-power-supplies { background: #fb923c; }

/* ---------- Responsive ---------- */
@media (max-width: 1279px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
  }

  .panel {
    padding-right: 0;
  }

  .panel-side {
    padding: 2.25rem 0;
    border-left: none;
    border-top: 1px solid var(--line);
  }

  .flower {
    max-width: 360px;
  }
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kpi:nth-child(3) {
    padding-left: 0;
    border-left: none;
  }

  .kpi:nth-child(n + 3) {
    border-top: 1px solid var(--line);
  }
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 2.5rem;
  }

  .product-row {
    grid-template-columns: 48px minmax(0, 1fr) auto 40px;
    grid-template-areas:
      'tile name share menu'
      'tile meta meta meta';
    row-gap: 0.625rem;
  }

  .tile { grid-area: tile; align-self: start; }
  .product-row .row-name { grid-area: name; }

  .row-meta {
    grid-area: meta;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
  }

  .row-share { grid-area: share; }
  .row-menu { grid-area: menu; }

  .short-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'name po'
      'qty qty'
      'tags tags';
    row-gap: 0.75rem;
  }

  .short-row .row-name { grid-area: name; }
  .short-qty { grid-area: qty; }
  .short-tags { grid-area: tags; }
  .po-button { grid-area: po; }
}

@media (max-width: 767px) {
  .hero {
    gap: 1.75rem;
    padding: 0 0 2rem;
  }

  .hero-caption {
    font-size: 1rem;
    margin-top: 0.5rem;
  }

  .goal-delta {
    font-size: 1.375rem;
  }

  .goal-line {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .goal-track {
    height: 48px;
  }

  .kpi,
  .kpi + .kpi {
    padding: 1.25rem 1rem 1.25rem 0;
  }

  .kpi:nth-child(even) {
    padding-left: 1rem;
    padding-right: 0;
  }

  .kpi-label {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .kpi-value {
    font-size: 1.75rem;
  }

  .kpi-icon {
    width: 22px;
    height: 22px;
  }

  .kpi-delta {
    font-size: 0.813rem;
  }

  .panel,
  .panel-side {
    padding-top: 1.75rem;
    padding-bottom: 1.75rem;
  }

  .panel-title {
    font-size: 1.25rem;
  }

  .segmented {
    margin-left: 0;
  }

  .product-row {
    grid-template-columns: 40px minmax(0, 1fr) auto;
    grid-template-areas:
      'tile name menu'
      'meta meta meta'
      'share share share';
    column-gap: 0.875rem;
  }

  .tile {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    font-size: 0.688rem;
  }

  .row-meta {
    gap: 0.5rem 1rem;
  }

  .side-stats dd {
    font-size: 1.125rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .goal-fill,
  .goal-glow,
  .goal-marker,
  .cat-bar {
    animation: none;
  }
}
</style>
