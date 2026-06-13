<template>
  <main class="folder-view"
        role="main"
        aria-label="Folder view"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
    >
    <div v-if="isDragging" class="drop-overlay" aria-live="polite">
      <div class="drop-message">📄 Drop PDF here to upload</div>
    </div>

    <div class="file-header">
      <h2>Folders</h2>
      <input 
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 Search folders or documents..."
        aria-label="Search folders or documents"
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

    <div class="folder-list" role="region" aria-label="Folder list">
      <div v-if="groupedFiles.length === 0" class="empty-state">
          <p>{{ searchQuery ? 'No results found.' : 'No documents uploaded yet.' }}</p>
          <small v-if="!searchQuery">Drag a PDF here or click upload.</small>
      </div>

      <div v-for="folder in groupedFiles" :key="folder.category" class="folder" role="region" :aria-label="`Folder: ${folder.category}`">
        <div 
          class="folder-header" 
          @click="toggleFolder(folder.category)"
          role="button"
          :tabindex="0"
          :aria-expanded="openFolders.includes(folder.category)"
          :aria-controls="`folder-${folder.category}`"
          @keydown.enter="toggleFolder(folder.category)"
          @keydown.space.prevent="toggleFolder(folder.category)"
        >
          <span class="folder-icon" aria-hidden="true">{{ openFolders.includes(folder.category) ? '📂' : '📁' }}</span>
          <span class="folder-name">{{ folder.category }}</span>
          <span class="folder-count">{{ folder.files.length }} File{{ folder.files.length !== 1 ? 's' : '' }}</span>
          <span class="folder-chevron" aria-hidden="true">{{ openFolders.includes(folder.category) ? '▲' : '▼' }}</span>
        </div>
        <div 
          v-if="openFolders.includes(folder.category)" 
          :id="`folder-${folder.category}`"
          class="folder-files"
          role="list"
        >
          <div v-for="file in folder.files" :key="file.id" class="file-card" role="listitem">
            <div class="file-icon" aria-hidden="true">📄</div>
            <div class="file-info">
              <span class="file-name" :title="file.name">{{ file.name }}</span>
              <span class="file-date">{{ formatDate(file.created_at) }}</span>
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
              
              <Buttons 
                variant="icon-visible" 
                title="Delete document" 
                :aria-label="`Delete file ${file.name}`"
                @click="$emit('delete-file', file.id)"
              >🗑️</Buttons>
              
              <div class="dropdown-wrapper">
                <Buttons 
                  variant="icon-visible" 
                  title="Options" 
                  :aria-label="`Options for ${file.name}`"
                  @click="toggleDropdown(file.id, $event)"
                >⋯</Buttons>
                <div v-if="openDropdown === file.id" class="dropdown-menu" @click.stop role="listbox">
                  <div class="dropdown-item" role="option" @click="$emit('open-file', file); openDropdown = null">👁️ View PDF</div>
                  <div class="dropdown-item" role="option" @click="openInfo(file); openDropdown = null">📋 Properties</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

const emit = defineEmits(['upload-file', 'open-file', 'delete-file', 'update-category'])
const isDragging = ref(false)
const fileInputRef = ref(null)
const openFolders = ref([])
const infoFile = ref(null)
const openDropdown = ref(null)

// For Sort

const sortMode = ref('date-desc')
const sortOpen = ref(false)

const sortLabel = computed(() => {
  switch (sortMode.value) {
    case 'name-asc': return '🔤 Name A→Z'
    case 'name-desc': return '🔤 Name Z→A'
    case 'date-asc': return '📅 Oldest first'
    case 'date-desc': return '📅 Newest first'
    default: return 'Sort'
  }
})

function toggleSort(event) {
  event.stopPropagation()
  sortOpen.value = !sortOpen.value
}

function setSort(mode) {
  sortMode.value = mode
  sortOpen.value = false
}

function toggleDropdown(fileId, event) {
  event.stopPropagation() // prevents onClickOutside from firing immediately
  openDropdown.value = openDropdown.value === fileId ? null : fileId
}

// Close when clicking outside
function onClickOutside() {
  openDropdown.value = null
  sortOpen.value = false
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



// SEARCH BAR

const searchQuery = ref('')

const groupedFiles = computed(() => {
  const groups = {}
  let filesToGroup = props.files

  if (searchQuery.value.trim()) {
    const fuse = new Fuse(props.files, {
      keys: ['name', 'category', 'tags'],
      threshold: 0.4,
    })
    filesToGroup = fuse.search(searchQuery.value).map(r => r.item)
  }

  for (const file of filesToGroup) {
    const key = file.category || 'Uncategorized'
    if (!groups[key]) groups[key] = []
    groups[key].push(file)
  }

  const result = Object.entries(groups)
    .map(([category, files]) => {
      // Sort files within each folder
      const sorted = [...files].sort((a, b) => {
        if (sortMode.value === 'name-asc') return a.name.localeCompare(b.name)
        if (sortMode.value === 'name-desc') return b.name.localeCompare(a.name)
        if (sortMode.value === 'date-asc') return new Date(a.created_at) - new Date(b.created_at)
        if (sortMode.value === 'date-desc') return new Date(b.created_at) - new Date(a.created_at)
      })
      return { category, files: sorted }
    })
    .sort((a, b) => {
      if (a.category === 'Uncategorized') return 1
      if (b.category === 'Uncategorized') return -1
      return a.category.localeCompare(b.category)
    })

  if (searchQuery.value.trim()) {
    result.forEach(folder => {
      if (!openFolders.value.includes(folder.category)) {
        openFolders.value.push(folder.category)
      }
    })
  }

  return result
})


///

function toggleFolder(category) {
  const idx = openFolders.value.indexOf(category)
  if (idx === -1) openFolders.value.push(category)
  else openFolders.value.splice(idx, 1)
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString('de-DE')
}

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

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

</script>

<style scoped>
.folder-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 22px;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  position: relative;
}

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

.sort-wrapper { position: relative; }

.folder-list { display: flex; flex-direction: column; gap: 10px; }

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 40px;
  background: var(--bg-surface-2);
  border-radius: 14px;
  border: 1.5px dashed var(--border);
}

.folder {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: visible;
  box-shadow: var(--shadow-sm);
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  cursor: pointer;
  transition: background 0.16s;
  user-select: none;
  border-radius: 12px;
}

.folder-header:hover { background: var(--accent-light); }
.folder-icon { font-size: 1.2rem; }
.folder-name { font-weight: 700; color: var(--text-primary); flex: 1; font-size: 0.95rem; }
.folder-count { font-size: 0.78rem; color: var(--text-muted); }
.folder-chevron { font-size: 0.65rem; color: var(--text-muted); }

.folder-files { border-top: 1px solid var(--border); }

.file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.16s;
}

.file-card:last-child { border-bottom: none; }
.file-card:hover { background: var(--accent-light); }

.file-icon { font-size: 1.4rem; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.file-name { font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.92rem; }
.file-date { font-size: 0.78rem; color: var(--text-muted); }
.file-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }

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

.dropdown-wrapper { position: relative; }

.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  min-width: 160px;
  overflow: hidden;
}

.dropdown-item {
  padding: 10px 14px;
  font-size: 0.9rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.14s;
}

.dropdown-item:hover { background: var(--accent-light); color: var(--accent); }

@media (max-width: 900px) { .folder-view { padding: 18px; border-radius: 14px; } }

@media (max-width: 640px) {
  .folder-view { padding: 14px; border-radius: 12px; }
  .file-header { gap: 10px; }
  .file-header h2 { flex: 1 1 100%; font-size: 1.25rem; }
  .search-input { flex: 1 1 100%; min-width: 0; max-width: none; width: 100%; order: 2; }
  .sort-wrapper { flex: 1 1 auto; order: 3; }
  .sort-wrapper :deep(.app-btn) { width: 100%; }
  .file-header > :deep(.app-btn.primary) { flex: 1 1 100%; width: 100%; order: 4; }
  .folder-header { padding: 11px 12px; }
}
</style>