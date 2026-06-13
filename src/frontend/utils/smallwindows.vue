<template>
  <div class="app-container">

    <!-- ── Topbar ── -->
    <header class="topbar">
      <div class="brand">
        <span class="brand-icon">📄</span>
        <span class="brand-name">Dokumentenretter</span>
      </div>

      <div class="topbar-right">
        <div class="topbar-search">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            class="search-field"
            placeholder="Search documents..."
            aria-label="Search documents"
          />
        </div>

        <div class="topbar-actions">
          <span class="user-name" :title="`Signed in as: ${currentUserName}`">{{ currentUserName }}</span>
          <button
            class="icon-btn"
            @click="toggleTheme"
            :title="isDark ? 'Light mode' : 'Dark mode'"
            :aria-label="isDark ? 'Activate light mode' : 'Activate dark mode'"
          >{{ isDark ? '☀️' : '🌙' }}</button>
          <button class="icon-btn" title="Settings" aria-label="Settings" @click="$emit('open-settings')">⚙️</button>
          <Buttons variant="logout" @click="$emit('logout')">Sign out</Buttons>
        </div>
      </div>
    </header>

    <!-- ── Body ── -->
    <div class="layout-body">

      <!-- ── Sidebar ── -->
      <aside class="sidebar" role="navigation" aria-label="Main navigation">

        <!-- New-chat button -->
        <button class="new-chat-btn" @click="$emit('start-new-chat')" aria-label="Start new chat">
          <span class="new-chat-icon">+</span>
          <span>New chat</span>
        </button>

        <!-- Nav items -->
        <nav class="sidebar-nav" aria-label="Sections">
          <button
            :class="['nav-item', { active: currentView === 'chat' }]"
            :aria-current="currentView === 'chat' ? 'page' : undefined"
            @click="$emit('update:currentView', 'chat')"
          >
            <span class="nav-icon" aria-hidden="true">💬</span>
            <span class="nav-label">AI chat</span>
          </button>
          <button
            :class="['nav-item', { active: currentView === 'files' }]"
            :aria-current="currentView === 'files' ? 'page' : undefined"
            @click="$emit('update:currentView', 'files')"
          >
            <span class="nav-icon" aria-hidden="true">📄</span>
            <span class="nav-label">My files</span>
          </button>
          <button
            :class="['nav-item', { active: currentView === 'folders' }]"
            :aria-current="currentView === 'folders' ? 'page' : undefined"
            @click="$emit('update:currentView', 'folders')"
          >
            <span class="nav-icon" aria-hidden="true">📁</span>
            <span class="nav-label">Folders</span>
          </button>
        </nav>

        <!-- Divider + chat history -->
        <div class="sidebar-divider" aria-hidden="true"></div>
        <div class="sidebar-section-label">Recent chats</div>

        <div class="conversation-list" role="list" aria-label="Chat history">
          <div v-if="conversations.length === 0" class="no-chats">
            No chats yet.
          </div>
          <div
            v-for="conv in conversations"
            :key="conv.id"
            role="listitem"
            :class="['conv-item', { active: conv.id === currentConversationId }]"
            :aria-current="conv.id === currentConversationId ? 'true' : undefined"
            @click="$emit('load-chat', conv.id)"
          >
            <span class="conv-title" :title="conv.title || 'New chat'">{{ conv.title || 'New chat' }}</span>
            <button
              class="conv-delete"
              title="Delete chat"
              aria-label="Delete chat"
              @click.stop="$emit('prompt-delete', conv.id)"
            >🗑️</button>
          </div>
        </div>
      </aside>

      <!-- ── Main slot ── -->
      <slot></slot>
    </div>

    <!-- ── Delete modal ── -->
    <div
      v-if="showDeleteModal"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      @click="$emit('cancel-delete')"
    >
      <div class="modal-content" @click.stop>
        <h3 id="delete-modal-title">Delete chat?</h3>
        <p>Do you really want to permanently delete this chat and all related messages?</p>
        
        <div class="modal-actions">
          <Buttons variant="cancel" @click="$emit('cancel-delete')">Cancel</Buttons>
          <Buttons variant="danger" @click="$emit('confirm-delete')">Yes, delete</Buttons>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Buttons from './buttons.vue'

defineProps({
  users:                { type: Array,   default: () => [] },
  currentUserId:        { type: String,  default: '' },
  currentView:          { type: String,  default: 'chat' },
  conversations:        { type: Array,   default: () => [] },
  currentConversationId:{ type: String,  default: null },
  showDeleteModal:      { type: Boolean, default: false },
  currentUserName:      { type: String,  default: '' }
})

defineEmits([
  'update:currentUserId',
  'update:currentView',
  'start-new-chat',
  'load-chat',
  'logout',
  'open-settings',
  'prompt-delete',
  'cancel-delete',
  'confirm-delete'
])

// ── Theme toggle ──────────────────────────────────────────────
const STORAGE_KEY = 'theme'
const isDark = ref(false)

function applyTheme(dark) {
  isDark.value = dark
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
}

function toggleTheme() { applyTheme(!isDark.value) }

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    applyTheme(saved === 'dark')
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }
}

onMounted(initTheme)
</script>

<style scoped>
/* ── App shell ─────────────────────────────────────────────── */
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
  color: var(--text-primary);
  background: var(--bg-base);
}

/* ── Topbar ────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  height: 52px;
  width: 100%;
  background: var(--topbar-bg);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  z-index: 20;
  flex-shrink: 0;
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1.08rem;
  color: var(--accent);
  white-space: nowrap;
  flex-shrink: 0;
}

.brand-icon { font-size: 1.3rem; }

/* Right group: search + actions together, pushed to right edge */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.topbar-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface-2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 0 14px;
  height: 36px;
  width: 320px;
  flex-shrink: 1;
  transition: border-color 0.16s, box-shadow 0.16s;
}

.topbar-search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-medium);
  background: var(--bg-surface);
}

.search-icon { font-size: 0.85rem; opacity: 0.6; flex-shrink: 0; }

.search-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  color: var(--text-primary);
  font-family: inherit;
  min-width: 0;
}

.search-field::placeholder { color: var(--text-muted); }

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.icon-btn {
  background: transparent;
  border: none;
  border-radius: 8px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--accent-light);
  transform: scale(1.08);
}

/* ── Layout body ───────────────────────────────────────────── */
.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Sidebar ───────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  border-right: 1px solid rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  gap: 2px;
  overflow: hidden;
}

/* New chat button */
.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(37,99,235,0.28);
  flex-shrink: 0;
}

.new-chat-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37,99,235,0.34);
}

.new-chat-icon {
  font-size: 1.2rem;
  line-height: 1;
  font-weight: 400;
}

/* Nav items */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--sidebar-text);
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;
}

.nav-item:hover {
  background: var(--sidebar-hover);
}

.nav-item.active {
  background: var(--sidebar-active);
  color: #fff;
  font-weight: 700;
}

.nav-icon { font-size: 1.05rem; flex-shrink: 0; }
.nav-label { flex: 1; white-space: nowrap; }

/* Divider + section label */
.sidebar-divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 10px 4px;
  flex-shrink: 0;
}

.sidebar-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(203,213,225,0.5);
  padding: 0 12px 6px;
  flex-shrink: 0;
}

/* Conversation list */
.conversation-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conversation-list::-webkit-scrollbar { width: 4px; }
.conversation-list::-webkit-scrollbar-track { background: transparent; }
.conversation-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
.conversation-list::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

.no-chats {
  font-size: 0.82rem;
  color: rgba(203,213,225,0.45);
  text-align: center;
  padding: 20px 8px;
  line-height: 1.5;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.86rem;
  color: var(--sidebar-text);
  transition: background 0.14s;
  min-width: 0;
}

.conv-item:hover { background: var(--sidebar-hover); }

.conv-item.active {
  background: var(--sidebar-active);
  color: #fff;
  font-weight: 600;
}

.conv-item:hover .conv-delete { opacity: 1; }

.conv-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.conv-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
  opacity: 0;
  border-radius: 4px;
  transition: opacity 0.14s, background 0.14s;
  flex-shrink: 0;
  line-height: 1;
}

.conv-delete:hover { background: rgba(255,255,255,0.12); }

/* ── Modal ─────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(9,16,28,0.55);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-surface);
  padding: 28px 24px;
  border-radius: 18px;
  width: 90%; max-width: 420px;
  box-shadow: var(--shadow-lg);
  text-align: center;
  animation: slideUp 0.2s ease-out;
  border: 1px solid var(--border);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-content h3 { margin: 0 0 10px; color: var(--text-primary); font-size: 1.18rem; }
.modal-content p  { color: var(--text-secondary); font-size: 0.93rem; margin-bottom: 24px; line-height: 1.55; }
.modal-actions { display: flex; justify-content: center; gap: 12px; }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 768px) {
  .topbar {
    height: auto;
    padding: 10px 14px;
    padding-top: max(10px, env(safe-area-inset-top));
    flex-wrap: wrap;
    gap: 8px;
  }

  .brand { min-width: 0; }
  .topbar-right { flex: 1 1 100%; order: 3; flex-wrap: wrap; }
  .topbar-search { flex: 1 1 100%; width: auto; height: 38px; }
  .topbar-actions { gap: 6px; flex-shrink: 0; }
  .user-name { display: none; }

  .layout-body { flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch; }

  .sidebar {
    width: 100%;
    max-height: 42vh;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-direction: row;
    flex-wrap: wrap;
    padding: 10px;
    gap: 6px;
    overflow-y: auto;
  }

  .new-chat-btn { width: auto; flex: 0 0 auto; margin-bottom: 0; padding: 9px 14px; }
  .sidebar-nav { flex-direction: row; gap: 4px; flex-wrap: wrap; }
  .nav-item { width: auto; padding: 8px 12px; }
  .sidebar-divider { display: none; }
  .sidebar-section-label { display: none; }
  .conversation-list { display: none; }
}

@media (max-width: 480px) {
  .topbar { padding: 8px 12px; }
  .brand-name { display: none; }
  .nav-label { display: none; }
  .nav-item { justify-content: center; }
  .modal-content { width: 95%; padding: 20px 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .conv-item { transition: background 0.1s; }
  .modal-content { animation: none; }
}
</style>
