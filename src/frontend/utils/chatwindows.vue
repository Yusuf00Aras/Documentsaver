<template>
  <main 
    class="chat"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-message">📄 Drop PDF here to upload</div>
    </div>

    <div class="messages" ref="messagesscroll" role="log" aria-label="Chat messages">
      <div v-if="messages.length === 0" class="empty">
        <p>Ask a question about your documents…</p>
        <p><small>(or drag & drop a PDF here)</small></p>
        
        <Buttons variant="upload" @click="triggerFileInput">
          📁 Select PDF
        </Buttons>
      </div>

      <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]" :aria-label="`${m.role === 'user' ? 'Your question' : 'Answer'}: ${m.content}`">
        <div class="bubble" role="article">
          <span>{{ m.content }}</span>
        </div>
      </div>
      
      <div v-if="loading" class="msg assistant" aria-label="AI is responding...">
        <div class="bubble typing" aria-live="polite">
          <span class="spinner"></span> Responding…
        </div>
      </div>
      
      <div v-if="isUploading" class="msg assistant" aria-label="File is uploading...">
        <div class="bubble typing" aria-live="polite">
          <span class="spinner"></span> Processing PDF… 
        </div>
      </div>
    </div>

    <form class="input-row" @submit.prevent="submitMessage">
      <button
        type="button"
        class="add-pdf-btn"
        :disabled="loading || isUploading"
        :title="isUploading ? 'PDF is being processed…' : 'Add PDF'"
        aria-label="Add PDF"
        @click="triggerFileInput"
      >+</button>
      <input
        type="file"
        ref="fileInputRef"
        accept="application/pdf"
        aria-label="Select PDF file"
        class="hidden-input"
        @change="onFileSelected"
      />
      <input
        v-model="draft"
        type="text"
        placeholder="Enter a question…"
        :disabled="loading || isUploading"
        autofocus
      />
      <Buttons variant="primary" type="submit" :disabled="!draft.trim() || loading || isUploading">
        Send
      </Buttons>
    </form>
  </main>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import Buttons from './buttons.vue'

const props = defineProps({
  messages: Array,
  loading: Boolean,
  isUploading: Boolean
})

const emit = defineEmits(['send-message', 'file-dropped'])

const draft = ref('')
const isDragging = ref(false)
const messagesscroll = ref(null)
const fileInputRef = ref(null)

// Scroll Logic - improved
const shouldAutoScroll = computed(() => {
  if (!messagesscroll.value) return true
  const container = messagesscroll.value
  return container.scrollTop + container.clientHeight >= container.scrollHeight - 100
})

watch(() => props.messages, () => {
  if (shouldAutoScroll.value) {
    nextTick(() => {
      if (messagesscroll.value) {
        messagesscroll.value.scrollTop = messagesscroll.value.scrollHeight
      }
    })
  }
}, { deep: true })

watch(() => props.loading, () => {
  if (props.loading) {
    nextTick(() => {
      if (messagesscroll.value) {
        messagesscroll.value.scrollTop = messagesscroll.value.scrollHeight
      }
    })
  }
})

// Form Submission
function submitMessage() {
  if (!draft.value.trim() || props.loading || props.isUploading) return
  emit('send-message', draft.value.trim())
  draft.value = ''
}

// Drag & Drop / File Logic
function onDragOver() { isDragging.value = true }
function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) isDragging.value = false
}
function onDrop(event) {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files.length > 0) {
    if (files[0].type === 'application/pdf') {
      emit('file-dropped', files[0])
    } else {
      alert('Please upload PDF files only.')
    }
  }
}
function triggerFileInput() { fileInputRef.value.click() }
function onFileSelected(event) {
  const files = event.target.files
  if (files.length > 0) {
    if (files[0].type === 'application/pdf') {
      emit('file-dropped', files[0])
      event.target.value = ''
    } else {
      alert('Please upload PDF files only.')
    }
  }
}
</script>

<style scoped>
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px;
  position: relative;
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
  border-radius: 16px;
  margin: 8px;
  border: 3px dashed rgba(255,255,255,0.7);
  animation: pulse-border 0.6s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: rgba(255,255,255,0.7); }
  50%       { border-color: rgba(255,255,255,1); }
}

.drop-message {
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  pointer-events: none;
  text-align: center;
  max-width: 300px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  scroll-behavior: smooth;
}

.messages::-webkit-scrollbar { width: 6px; }
.messages::-webkit-scrollbar-track { background: transparent; }
.messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.messages::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.empty {
  text-align: center;
  color: var(--text-muted);
  margin: auto 0;
  line-height: 1.7;
  padding: 32px 20px;
}

.hidden-input { display: none; }

.msg {
  display: flex;
  margin-bottom: 2px;
  animation: fadeIn 0.25s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.msg.user { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }

.bubble {
  max-width: 78%;
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-shadow: var(--shadow-sm);
}

.msg.user .bubble {
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 5px;
}

.msg.assistant .bubble {
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-bottom-left-radius: 5px;
  color: var(--text-primary);
}

.bubble.typing {
  font-style: italic;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.input-row {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
  min-height: 56px;
}

.input-row input {
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
  background: var(--bg-surface-2);
  color: var(--text-primary);
  font-family: inherit;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.input-row input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-medium);
  background: var(--bg-surface);
}

.input-row input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-pdf-btn {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--accent);
  background: var(--accent-light);
  border: 1.5px solid var(--accent-medium);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
}

.add-pdf-btn:hover:not(:disabled) {
  background: var(--accent-medium);
  transform: translateY(-1px);
}

.add-pdf-btn:active:not(:disabled) { transform: translateY(0); }
.add-pdf-btn:disabled { opacity: 0.45; cursor: not-allowed; }

@media (max-width: 640px) {
  .chat { padding: 14px; border-radius: 12px; }
  .bubble { max-width: 88%; }
  .input-row { flex-wrap: wrap; gap: 7px; }
  .input-row input[type="text"] { flex: 1 1 0; min-width: 0; }
  .input-row :deep(button[type="submit"]) { flex: 1 1 100%; }
  .add-pdf-btn { width: 42px; height: 42px; }
  .messages { gap: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .msg { animation: none; }
  .spinner { animation: none; }
  .drop-overlay { animation: none; }
}
</style>