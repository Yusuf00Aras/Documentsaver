<template>
  <main 
    class="file-view"
    role="main"
    aria-label="File manager"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div v-if="isDragging" class="drop-overlay" aria-live="polite">
      <div class="drop-message">📄 Drop PDF here to upload</div>
    </div>

    <div class="file-header">
      <h2>My Documents</h2>
      <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="🔍 Search documents..."
          aria-label="Search documents"
        />
      <div class="sort-wrapper">
        <Buttons variant="upload" @click="toggleSort($event)" :title="`Sorting: ${sortLabel}`">
          {{ sortLabel }}
        </Buttons>
        <div v-if="sortOpen" class="dropdown-menu" @click.stop role="listbox" aria-label="Sort options">
          <div class="dropdown-item" role="option" @click="setSort('name-asc')">🔤 Name A→Z </div>
          <div class="dropdown-item" role="option" @click="setSort('name-desc')">🔤 Name Z→A </div>
          <div class="dropdown-item" role="option" @click="setSort('date-asc')">📅 Newest first </div>
          <div class="dropdown-item" role="option" @click="setSort('date-desc')">📅 Oldest first </div>
        </div>
      </div>
      <div class="sort-wrapper">
        <Buttons variant="upload" @click="toggleView($event)" :title="`View: ${viewLabel}`">
          {{ viewLabel }}
        </Buttons>
        <div v-if="viewOpen" class="dropdown-menu" @click.stop role="listbox" aria-label="View options">
          <div class="dropdown-item" role="option" @click="setView('grid')">⊞ Cards</div>
          <div class="dropdown-item" role="option" @click="setView('detail')">☰ Details</div>
        </div>
      </div>
      <Buttons
        variant="primary"
        @click="triggerFileInput"
        :disabled="isUploading"
        :loading="isUploading"
        :title="isUploading ? 'File is uploading...' : 'Select a new PDF file'"
      >
        {{ isUploading ? 'Uploading...' : '📁 Upload new PDF' }}
      </Buttons>
      <input
        type="file"
        ref="fileInputRef"
        accept="application/pdf"
        aria-label="Select PDF file"
        class="hidden-input"
        @change="onFileSelected"
      />
    </div>

    <!-- ── Card / Grid view ── -->
    <div v-if="viewMode === 'grid'" class="file-grid" role="grid" :aria-label="`${filteredFiles.length} Document${filteredFiles.length !== 1 ? 's' : ''}`">
      <div v-if="filteredFiles.length === 0" class="empty-state">
        <p>No documents uploaded yet.</p>
        <small>Drag a PDF here or click upload.</small>
      </div>

      <div v-for="file in filteredFiles" :key="file.id" class="file-card" role="gridcell">
        <div class="file-icon" aria-hidden="true">📄</div>
        <div class="file-info">
          <input
            v-if="renamingId === file.id"
            class="rename-input"
            v-model="renameValue"
            @keyup.enter="commitRename(file.id)"
            @keyup.escape="cancelRename"
            @blur="commitRename(file.id)"
            @click.stop
            autofocus
          />
          <span v-else class="file-name" :title="file.name">{{ file.name }}</span>
          <span class="file-date">{{ formatDate(file.created_at) }}</span>
          <span v-if="file.category" class="file-category-label">🗃️ {{ file.category }}</span>
        </div>
        <div class="file-actions">
          <div class="file-category">
            <select
              :aria-label="`Category for ${file.name}`"
              value=""
              @change="onCategoryChange(file.id, $event)"
              :title="file.category || 'Choose category'"
            >
              <option value="">🗃️</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="dropdown-wrapper">
            <Buttons
              variant="icon-visible"
              title="Options"
              :aria-label="`Options for ${file.name}`"
              @click="toggleDropdown(file.id, $event)"
            >⋯</Buttons>
            <div v-if="openDropdown === file.id" class="dropdown-menu" @click.stop role="listbox">
              <div class="dropdown-item" role="option" @click="$emit('open-file', file); openDropdown = null">👁️ View PDF</div>
              <div class="dropdown-item" role="option" @click="startRename(file)">✏️ Rename</div>
              <div class="dropdown-item" role="option" @click="openInfo(file); openDropdown = null">📋 Properties</div>
              <div class="dropdown-item" role="option" @click="$emit('delete-file', file.id); openDropdown = null">🗑️ Delete</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Detail / Table view ── -->
    <div v-else class="file-table-wrapper">
      <div v-if="filteredFiles.length === 0" class="empty-state">
        <p>No documents uploaded yet.</p>
        <small>Drag a PDF here or click upload.</small>
      </div>
      <table v-else class="file-table" role="grid" :aria-label="`${filteredFiles.length} Document${filteredFiles.length !== 1 ? 's' : ''}`">
        <thead>
          <tr>
            <th class="col-name">Name</th>
            <th class="col-category">Category</th>
            <th class="col-size">Size</th>
            <th class="col-date">Date</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in filteredFiles" :key="file.id" class="file-row" role="row">
            <td class="col-name">
              <span class="row-icon" aria-hidden="true">📄</span>
              <input
                v-if="renamingId === file.id"
                class="rename-input"
                v-model="renameValue"
                @keyup.enter="commitRename(file.id)"
                @keyup.escape="cancelRename"
                @blur="commitRename(file.id)"
                @click.stop
                autofocus
              />
              <span v-else class="row-name" :title="file.name">{{ file.name }}</span>
            </td>
            <td class="col-category">
              <span class="row-category">{{ file.category || '—' }}</span>
            </td>
            <td class="col-size">{{ formatSize(file.size) }}</td>
            <td class="col-date">{{ formatDate(file.created_at) }}</td>
            <td class="col-actions">
              <div class="row-actions">
                <div class="file-category">
                  <select
                    :aria-label="`Category for ${file.name}`"
                    value=""
                    @change="onCategoryChange(file.id, $event)"
                    :title="file.category || 'Choose category'"
                  >
                    <option value="">🗃️</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
                <div class="dropdown-wrapper">
                  <Buttons
                    variant="icon-visible"
                    title="Options"
                    :aria-label="`Options for ${file.name}`"
                    @click="toggleDropdown(file.id, $event)"
                  >⋯</Buttons>
                  <div v-if="openDropdown === file.id" class="dropdown-menu" @click.stop role="listbox">
                    <div class="dropdown-item" role="option" @click="$emit('open-file', file); openDropdown = null">👁️ View PDF</div>
                    <div class="dropdown-item" role="option" @click="startRename(file)">✏️ Rename</div>
                    <div class="dropdown-item" role="option" @click="openInfo(file); openDropdown = null">📋 Properties</div>
                    <div class="dropdown-item" role="option" @click="$emit('delete-file', file.id); openDropdown = null">🗑️ Delete</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="infoFile" class="modal-overlay" @click="infoFile = null" role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 id="info-modal-title">📄 File information</h3>
          <Buttons variant="icon-visible" @click="infoFile = null" aria-label="Close">✕</Buttons>
        </div>
        <div class="modal-body">
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-value">{{ infoFile.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Category</span>
            <span class="info-value">{{ infoFile.category || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Uploaded</span>
            <span class="info-value">{{ formatDate(infoFile.created_at) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Size</span>
            <span class="info-value">{{ formatSize(infoFile.size) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value info-path">{{ infoFile.url || '—' }}</span>
          </div>
          <div class="info-row" v-if="infoFile.tags?.length">
            <span class="info-label">Tags</span>
            <div class="info-tags">
              <span v-for="tag in infoFile.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>

import { ref, computed, onMounted, onUnmounted } from 'vue'
import Buttons from './utils/buttons.vue'
import Fuse from 'fuse.js' // for searching 



const props = defineProps({
  files: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  isUploading: { type: Boolean, default: false }
})

const emit = defineEmits(['upload-file', 'open-file', 'delete-file', 'update-category', 'rename-file'])

const isDragging = ref(false)
const fileInputRef = ref(null)
const infoFile = ref(null)
const openDropdown = ref(null)
const renamingId = ref(null)
const renameValue = ref('')

// For Sort
const sortMode = ref('date-desc')
const sortOpen = ref(false)

const sortLabel = computed(() => {
  switch (sortMode.value) {
    case 'name-asc': return '🔤 Name A→Z'
    case 'name-desc': return '🔤 Name Z→A'
    case 'date-asc': return '📅 Newest first'
    case 'date-desc': return '📅 Oldest first'
    default: return 'Sort'
  }
})

function toggleSort(event) {
  event.stopPropagation()
  sortOpen.value = !sortOpen.value
  viewOpen.value = false
}

function setSort(mode) {
  sortMode.value = mode
  sortOpen.value = false
}

// For View mode
const viewMode = ref(localStorage.getItem('fileViewMode') || 'grid')
const viewOpen = ref(false)

const viewLabel = computed(() => viewMode.value === 'grid' ? '⊞ Cards' : '☰ Details')

function toggleView(event) {
  event.stopPropagation()
  viewOpen.value = !viewOpen.value
  sortOpen.value = false
}

function setView(mode) {
  viewMode.value = mode
  viewOpen.value = false
  localStorage.setItem('fileViewMode', mode)
}


// Filter & search logic

const searchQuery = ref('')

const filteredFiles = computed(() => {
  let result = props.files

  if (searchQuery.value.trim()) {
    const fuse = new Fuse(props.files, {
      keys: ['name', 'category', 'tags'],
      threshold: 0.4,
    })
    result = fuse.search(searchQuery.value).map(r => r.item)
  }

  return [...result].sort((a, b) => {
    if (sortMode.value === 'name-asc') return a.name.localeCompare(b.name)
    if (sortMode.value === 'name-desc') return b.name.localeCompare(a.name)
    if (sortMode.value === 'date-asc') return new Date(a.created_at) - new Date(b.created_at)
    if (sortMode.value === 'date-desc') return new Date(b.created_at) - new Date(a.created_at)
  })
})

function toggleDropdown(fileId, event) {
  event.stopPropagation() // prevents onClickOutside from firing immediately
  openDropdown.value = openDropdown.value === fileId ? null : fileId
}

// Close when clicking outside
function onClickOutside() {
  openDropdown.value = null
  sortOpen.value = false
  viewOpen.value = false
}


function onDragOver() { isDragging.value = true }
function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) isDragging.value = false
}

function onDrop(event) {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files.length > 0) emit('upload-file', files[0])
}

function triggerFileInput() { fileInputRef.value.click() }

function onFileSelected(event) {
  const files = event.target.files
  if (files.length > 0) {
    emit('upload-file', files[0])
    event.target.value = ''
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString('de-DE')
}
// Category
function onCategoryChange(fileId, event) {
  emit('update-category', fileId, event.target.value)
  event.target.value = ''
}

// For Infos 
function openInfo(file) {
  infoFile.value = file
}
function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}


function startRename(file) {
  renamingId.value = file.id
  renameValue.value = file.name
  openDropdown.value = null
}

function commitRename(fileId) {
  if (renameValue.value.trim() && renameValue.value.trim() !== '') {
    emit('rename-file', fileId, renameValue.value.trim())
  }
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

</script>

<style scoped>
.file-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 22px;
  position: relative;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

.drop-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--accent);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  margin: 10px;
  border: 3px dashed rgba(255,255,255,0.7);
}

.drop-message { color: #fff; font-size: 1.3rem; font-weight: 700; pointer-events: none; }

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  flex-wrap: wrap;
}

.file-header h2 { margin: 0; color: var(--text-primary); font-size: 1.4rem; font-weight: 700; }
.hidden-input { display: none; }

.search-input {
  flex: 1;
  min-width: 180px;
  max-width: 280px;
  padding: 9px 13px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface-2);
  color: var(--text-primary);
  font-size: 0.93rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.16s, box-shadow 0.16s;
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-medium);
  background: var(--bg-surface);
}

.sort-wrapper,
.dropdown-wrapper,
.file-category {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 170px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 100;
}

.dropdown-item {
  padding: 10px 14px;
  font-size: 0.9rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.14s;
}

.dropdown-item:hover { background: var(--accent-light); color: var(--accent); }

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-muted);
  padding: 40px;
  background: var(--bg-surface-2);
  border-radius: 14px;
  border: 1.5px dashed var(--border);
}

.empty-state small { display: block; margin-top: 8px; }

.file-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: box-shadow 0.18s, border-color 0.18s, transform 0.18s;
}

.file-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.file-icon { font-size: 1.8rem; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.file-name { font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.92rem; }
.file-date { font-size: 0.78rem; color: var(--text-muted); }
.file-category-label { font-size: 0.72rem; color: var(--accent); font-weight: 600; }

.file-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }

.rename-input {
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-surface-2);
  border: 1.5px solid var(--accent);
  border-radius: 6px;
  padding: 2px 7px;
  outline: none;
  width: 100%;
  box-shadow: 0 0 0 3px var(--accent-medium);
}

.file-category select {
  font-size: 0.85rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  width: 28px;
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(9,16,28,0.5);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-surface);
  border-radius: 18px;
  width: 90%; max-width: 480px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease-out;
  border: 1px solid var(--border);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-header h3 { margin: 0; font-size: 1.05rem; color: var(--text-primary); }
.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; gap: 12px; align-items: flex-start; }
.info-label { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); width: 90px; flex-shrink: 0; padding-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
.info-value { font-size: 0.9rem; color: var(--text-primary); flex: 1; word-break: break-all; }
.info-path { font-size: 0.74rem; color: var(--text-muted); font-family: monospace; }
.info-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: var(--accent-light); color: var(--accent); font-size: 0.74rem; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--accent-medium); }

.sort-wrapper { position: relative; }

/* ── Detail / Table view ── */
.file-table-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.file-table thead th {
  text-align: left;
  padding: 8px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1.5px solid var(--border);
  white-space: nowrap;
  background: var(--bg-surface);
  position: sticky;
  top: 0;
  z-index: 1;
}

.file-row {
  transition: background 0.14s;
  border-bottom: 1px solid var(--border);
}

.file-row:last-child { border-bottom: none; }

.file-row:hover { background: var(--accent-light); }

.file-table td {
  padding: 10px 12px;
  vertical-align: middle;
  color: var(--text-primary);
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

/* thead th.col-name needs display:table-cell override */
.file-table thead th.col-name { display: table-cell; }

.row-icon { font-size: 1.1rem; flex-shrink: 0; }

.row-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
  display: block;
  font-weight: 600;
}

.col-category { min-width: 110px; }
.row-category { color: var(--accent); font-size: 0.82rem; font-weight: 600; }

.col-size { min-width: 80px; color: var(--text-muted); white-space: nowrap; }
.col-date { min-width: 100px; color: var(--text-muted); white-space: nowrap; }

.col-actions { width: 80px; }

.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

@media (max-width: 900px) { .file-view { padding: 18px; border-radius: 14px; } }

@media (max-width: 640px) {
  .file-view { padding: 14px; border-radius: 12px; }
  .file-header { gap: 10px; }
  .file-header h2 { flex: 1 1 100%; font-size: 1.25rem; }
  .search-input { flex: 1 1 100%; min-width: 0; max-width: none; width: 100%; order: 2; }
  .sort-wrapper { flex: 1 1 auto; order: 3; }
  .sort-wrapper :deep(.app-btn) { width: 100%; }
  .file-header > :deep(.app-btn.primary) { flex: 1 1 100%; width: 100%; order: 4; }
  .file-grid { grid-template-columns: 1fr; }
  .col-size, .col-category { display: none; }
}
</style>