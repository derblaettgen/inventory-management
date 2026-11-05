<template>
  <div class="app" :class="{ 'sidebar-collapsed': collapsed, 'drawer-open': drawerOpen }">
    <aside id="app-sidebar" class="sidebar" :aria-hidden="isMobile && !drawerOpen ? 'true' : null">
      <div class="sidebar-brand">
        <div class="brand-mark" aria-hidden="true">CC</div>
        <div class="brand-text">
          <span class="brand-name">{{ t('nav.companyName') }}</span>
          <span class="brand-sub">{{ t('nav.subtitle') }}</span>
        </div>
        <button
          ref="drawerCloseBtn"
          class="drawer-close"
          type="button"
          :aria-label="t('nav.closeMenu')"
          @click="closeDrawer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <nav class="sidebar-nav" :aria-label="t('nav.mainNavigation')">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: $route.path === item.to }"
          :title="collapsed ? t(item.label) : null"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path v-for="d in item.icon" :key="d" :d="d" />
          </svg>
          <span class="nav-label">{{ t(item.label) }}</span>
        </router-link>
      </nav>
      <button
        class="collapse-btn"
        type="button"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')"
        :title="collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')"
        @click="toggleSidebar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span class="nav-label">{{ t('nav.collapseSidebar') }}</span>
      </button>
    </aside>

    <div v-if="isMobile && drawerOpen" class="scrim" aria-hidden="true" @click="closeDrawer"></div>

    <div class="shell">
      <header class="topbar">
        <button
          ref="menuBtn"
          class="menu-btn"
          type="button"
          aria-controls="app-sidebar"
          :aria-expanded="drawerOpen"
          :aria-label="t('nav.openMenu')"
          @click="openDrawer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <h1 class="topbar-title">{{ currentTitle }}</h1>
        <div class="topbar-actions">
          <LanguageSwitcher />
          <ProfileMenu
            @show-profile-details="showProfileDetails = true"
            @show-tasks="showTasks = true"
          />
        </div>
      </header>
      <FilterBar />
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

export default {
  name: 'App',
  components: {
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])
    const route = useRoute()

    // Sidebar navigation: icon paths are 24x24 stroke icons (no emojis per design system)
    const navItems = [
      { to: '/', label: 'nav.overview', icon: ['M3 13h8V3H3z', 'M13 21h8V11h-8z', 'M3 21h8v-6H3z', 'M13 9h8V3h-8z'] },
      { to: '/inventory', label: 'nav.inventory', icon: ['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8'] },
      { to: '/orders', label: 'nav.orders', icon: ['M6 2h12l2 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z', 'M4 6h16', 'M9 11h6', 'M9 15h6'] },
      { to: '/spending', label: 'nav.finance', icon: ['M12 2v20', 'M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'] },
      { to: '/demand', label: 'nav.demandForecast', icon: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'] },
      { to: '/reports', label: 'nav.reports', icon: ['M4 20V10', 'M10 20V4', 'M16 20v-6', 'M22 20H2'] }
    ]

    const currentTitle = computed(() => {
      const item = navItems.find(n => n.to === route.path)
      return item ? t(item.label) : ''
    })

    // Collapsible sidebar: user preference is remembered; below 1024px it is
    // forced into icon-only mode so content keeps enough width.
    const STORAGE_KEY = 'sidebarCollapsed'
    // Default is the slim icon rail; an explicit stored choice wins
    const readPref = () => {
      try {
        const v = localStorage.getItem(STORAGE_KEY)
        return v === null ? true : v === 'true'
      } catch { return true }
    }
    const userCollapsed = ref(readPref())
    const isNarrow = ref(false)
    // Phones (<768px) get an off-canvas drawer instead of the rail; the drawer
    // always shows labels, so it is never "collapsed".
    const isMobile = ref(false)
    const drawerOpen = ref(false)
    const menuBtn = ref(null)
    const drawerCloseBtn = ref(null)
    const collapsed = computed(() => !isMobile.value && (userCollapsed.value || isNarrow.value))

    const onKeydown = (e) => { if (e.key === 'Escape') closeDrawer() }
    const openDrawer = async () => {
      drawerOpen.value = true
      document.body.style.overflow = 'hidden' // stop the page scrolling behind the drawer
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      drawerCloseBtn.value?.focus()
    }
    const closeDrawer = () => {
      if (!drawerOpen.value) return
      drawerOpen.value = false
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeydown)
      menuBtn.value?.focus()
    }
    // Navigating from the drawer closes it
    watch(() => route.path, () => { if (drawerOpen.value) closeDrawer() })
    const toggleSidebar = () => {
      // On narrow screens the toggle temporarily expands instead of flipping the stored pref
      if (isNarrow.value) { isNarrow.value = false; userCollapsed.value = false; return }
      userCollapsed.value = !userCollapsed.value
      try { localStorage.setItem(STORAGE_KEY, String(userCollapsed.value)) } catch { /* storage unavailable */ }
    }
    let mq = null
    let mqMobile = null
    const onMq = (e) => { isNarrow.value = e.matches }
    const onMqMobile = (e) => {
      isMobile.value = e.matches
      if (!e.matches) closeDrawer() // growing past phone width drops the drawer state
    }

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(() => {
      loadTasks()
      mq = window.matchMedia('(max-width: 1023px)')
      isNarrow.value = mq.matches
      mq.addEventListener('change', onMq)
      mqMobile = window.matchMedia('(max-width: 767px)')
      isMobile.value = mqMobile.matches
      mqMobile.addEventListener('change', onMqMobile)
    })
    onBeforeUnmount(() => {
      mq && mq.removeEventListener('change', onMq)
      mqMobile && mqMobile.removeEventListener('change', onMqMobile)
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    })

    return {
      t,
      navItems,
      currentTitle,
      collapsed,
      toggleSidebar,
      isMobile,
      drawerOpen,
      openDrawer,
      closeDrawer,
      menuBtn,
      drawerCloseBtn,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Layout */
  --sidebar-w: 240px;
  --sidebar-w-collapsed: 88px;
  --topbar-h: 84px;

  /* Type */
  --font: 'Urbanist Variable', 'Urbanist', system-ui, -apple-system, 'Segoe UI', sans-serif;

  /* Ink and surfaces: white canvas, hairlines instead of shadows */
  --ink: #18181b;
  --ink-2: #3f3f46;
  --muted: #71717a;
  --muted-2: #a1a1aa;
  --line: #ececef;
  --fill: #f4f4f5;
  --surface: #ffffff;
  --canvas: #ffffff;

  /* Meaning: above/below target */
  --good: #15803d;
  --good-solid: #22a04b;
  --good-soft: #e8f7ec;
  --bad: #c2410c;
  --bad-solid: #e0524f;
  --bad-soft: #fdecea;
  --warn: #b45309;
  --warn-soft: #fef3e2;
  --info: #4338ca;
  --info-soft: #eef0ff;

  /* Progress rings */
  --ring: #a78bfa;
  --ring-track: #efeafe;

  --accent: #18181b;
  --radius: 16px;
  --radius-sm: 10px;

  /* Kept for components that still reference the old names */
  --border: var(--line);
  --shadow-sm: none;
  --shadow-md: 0 8px 24px rgba(24, 24, 27, 0.06);
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font);
  font-size: 15px;
  background: var(--canvas);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'tnum' 0;
}

button,
input,
select,
textarea {
  font-family: inherit;
}

::selection {
  background: #e4e4e7;
  color: var(--ink);
}

.app {
  min-height: 100vh;
}

/* ---------- Sidebar: slim white rail ---------- */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--line);
  color: var(--muted);
  display: flex;
  flex-direction: column;
  z-index: 110;
  transition: width 0.2s ease;
  overflow: hidden;
}

.sidebar-collapsed .sidebar {
  width: var(--sidebar-w-collapsed);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: var(--topbar-h);
  padding: 0 1.25rem;
  flex-shrink: 0;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--ink);
  color: #b9f0c6;
  font-weight: 700;
  font-size: 0.938rem;
  letter-spacing: -0.02em;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.brand-name,
.brand-sub {
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 0.75rem;
  color: var(--muted);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 2.5rem 1.25rem 1rem;
}

.nav-item,
.collapse-btn {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  height: 48px;
  padding: 0 0.875rem;
  border-radius: 999px;
  color: var(--muted); /* 4.8:1 on white; the lighter grey failed contrast */
  text-decoration: none;
  font-weight: 500;
  font-size: 0.938rem;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-item:hover,
.collapse-btn:hover {
  background: var(--fill);
  color: var(--ink);
}

.nav-item.active {
  background: var(--fill);
  color: var(--ink);
  font-weight: 600;
}

.nav-item:focus-visible,
.collapse-btn:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.nav-icon,
.collapse-btn svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.collapse-btn {
  margin: 0 1.25rem 1.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
}

/* short hairline above the bottom control, as a quiet divider */
.collapse-btn::before {
  content: '';
  position: absolute;
  top: -0.875rem;
  left: 50%;
  width: 32px;
  height: 1px;
  margin-left: -16px;
  background: var(--line);
}

.collapse-btn svg {
  transition: transform 0.2s ease;
}

.sidebar-collapsed .collapse-btn svg {
  transform: rotate(180deg);
}

.sidebar-collapsed .nav-label,
.sidebar-collapsed .brand-text {
  display: none;
}

.sidebar-collapsed .sidebar-brand {
  justify-content: center;
  padding: 0;
}

.sidebar-collapsed .sidebar-nav {
  align-items: center;
}

.sidebar-collapsed .nav-item,
.sidebar-collapsed .collapse-btn {
  justify-content: center;
  width: 48px;
  padding: 0;
}

.sidebar-collapsed .collapse-btn {
  align-self: center;
}

/* ---------- Shell / topbar ---------- */
.shell {
  margin-left: var(--sidebar-w);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.2s ease;
}

.sidebar-collapsed .shell {
  margin-left: var(--sidebar-w-collapsed);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 2.5rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(12px); /* content scrolls under the sticky bar */
}

.topbar-title {
  font-size: 2rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.03em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

/* Drawer controls only exist on phones */
.menu-btn,
.drawer-close {
  display: none;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.menu-btn {
  margin-left: -0.5rem;
  color: var(--ink);
}

.drawer-close {
  margin-left: auto;
  color: var(--muted);
}

.menu-btn:hover,
.drawer-close:hover {
  background: var(--fill);
  color: var(--ink);
}

.menu-btn:focus-visible,
.drawer-close:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.menu-btn svg,
.drawer-close svg {
  width: 22px;
  height: 22px;
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: 105;
  background: rgba(24, 24, 27, 0.35);
  animation: scrim-in 0.2s ease-out;
}

@keyframes scrim-in {
  from { opacity: 0; }
}

.main-content {
  flex: 1;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 2.5rem 3rem;
}

/* ---------- Shared page vocabulary ---------- */
.page-header {
  margin-bottom: 1.75rem;
}

.page-header h2 {
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 0.25rem;
  letter-spacing: -0.03em;
}

.page-header p {
  color: var(--muted);
  font-size: 0.938rem;
}

.stats-grid {
  /* min(100%, …) lets the grid drop to one column instead of overflowing on phones */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  display: grid;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.stat-card {
  background: var(--surface);
  padding: 1.25rem 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  transition: border-color 0.2s ease;
}

.stat-card:hover {
  border-color: #d4d4d8;
}

.stat-label {
  color: var(--ink-2);
  font-size: 0.938rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.stat-card.warning .stat-value { color: var(--warn); }
.stat-card.success .stat-value { color: var(--good); }
.stat-card.danger .stat-value { color: var(--bad); }
.stat-card.info .stat-value { color: var(--info); }

.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.5rem;
  border: 1px solid var(--line);
  margin-bottom: 1.25rem;
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  border-bottom: 1px solid var(--line);
}

th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-weight: 500;
  color: var(--muted);
  font-size: 0.813rem;
}

td {
  padding: 0.75rem;
  border-top: 1px solid var(--line);
  color: var(--ink-2);
  font-size: 0.938rem;
  font-variant-numeric: tabular-nums;
}

tbody tr {
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: #fafafa;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.813rem;
  font-weight: 500;
  white-space: nowrap;
  background: var(--fill);
  color: var(--ink-2);
}

.badge.success,
.badge.increasing { background: var(--good-soft); color: var(--good); }
.badge.warning,
.badge.medium { background: var(--warn-soft); color: var(--warn); }
.badge.danger,
.badge.decreasing,
.badge.high { background: var(--bad-soft); color: var(--bad); }
.badge.info,
.badge.low { background: var(--info-soft); color: var(--info); }
.badge.stable { background: var(--fill); color: var(--ink-2); }

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
  font-size: 0.938rem;
}

.error {
  background: var(--bad-soft);
  color: var(--bad);
  padding: 1rem 1.25rem;
  border-radius: var(--radius-sm);
  margin: 1rem 0;
  font-size: 0.938rem;
}

/* ---------- Phones: sidebar becomes an off-canvas drawer ---------- */
@media (max-width: 767px) {
  :root {
    --topbar-h: 60px;
  }

  .sidebar {
    width: min(var(--sidebar-w), 84vw);
    transform: translateX(-100%);
    visibility: hidden; /* keeps the closed drawer's links out of the tab order */
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.28s;
  }

  .drawer-open .sidebar {
    transform: none;
    visibility: visible;
    box-shadow: 0 12px 40px rgba(24, 24, 27, 0.18);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .shell,
  .sidebar-collapsed .shell {
    margin-left: 0;
  }

  .menu-btn,
  .drawer-close {
    display: grid;
  }

  .collapse-btn {
    display: none;
  }

  .sidebar-brand {
    height: var(--topbar-h);
    padding: 0 0.5rem 0 1rem;
    gap: 0.625rem;
  }

  .sidebar-nav {
    padding-top: 1rem;
  }

  .brand-mark {
    width: 38px;
    height: 38px;
  }

  .topbar {
    gap: 0.5rem;
    padding: 0 0.75rem 0 1rem;
  }

  .topbar-title {
    font-size: 1.375rem;
  }

  .topbar-actions {
    gap: 0.5rem;
  }

  .main-content {
    padding: 1.25rem 1rem 2rem;
  }

  .page-header {
    margin-bottom: 1.25rem;
  }

  .page-header h2 {
    font-size: 1.5rem;
  }

  .stats-grid {
    gap: 0.75rem;
  }

  .stat-card,
  .card {
    padding: 1rem;
  }

  .stat-value {
    font-size: 1.875rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .shell,
  .drawer-open .sidebar {
    transition: none;
  }

  .scrim {
    animation: none;
  }
}
</style>
