<template>
  <!-- Show register/login if not authenticated -->
  <Register
    v-if="!isLoggedIn && showRegister"
    @register-success="onLoginSuccess"
    @show-login="showRegister = false"
  />
  <Login
    v-else-if="!isLoggedIn"
    @login-success="onLoginSuccess"
    @show-register="showRegister = true"
  />

  <!-- Main app after login -->
  <SmallWindows
    v-else
    :users="[currentUser]"
    v-model:currentUserId="currentUser.id"
    v-model:currentView="currentView"
    :conversations="conversations"
    :currentConversationId="currentConversationId"
    :showDeleteModal="showDeleteModal"
    :currentUserName="currentUser.full_name"
    @logout="logout"
    @open-settings="openSettings"
    @start-new-chat="startNewChat"
    @load-chat="loadChat"
    @prompt-delete="promptDeleteChat"
    @cancel-delete="cancelDelete"
    @confirm-delete="confirmDeleteChat"
  >
    <div class="workspace-shell">
      <ChatWindows
        v-if="currentView === 'chat'"
        :messages="messages"
        :loading="loading"
        :isUploading="isUploading"
        @send-message="sendMessage"
        @file-dropped="handleFileUpload"
      />

      <FileView
        v-else-if="currentView === 'files'"
        :files="userFiles"
        :isUploading="isUploading"
        :categories="categories"
        @upload-file="handleFileUpload"
        @open-file="openFile"
        @delete-file="handleDeleteFile"
        @update-category="updateCategory"
        @rename-file="handleRenameFile"
      />

      <FolderView
        v-else-if="currentView === 'folders'"
        :files="userFiles"
        :categories="categories"
        :isUploading="isUploading"
        @upload-file="handleFileUpload"
        @open-file="openFile"
        @delete-file="handleDeleteFile"
        @update-category="updateCategory"
        @rename-file="handleRenameFile"
      />
    </div>
  </SmallWindows>
</template>

<script setup>
import { ref, onMounted } from 'vue'

import Login from './Login.vue'
import Register from './Register.vue'
import SmallWindows from './utils/smallwindows.vue'
import ChatWindows from './utils/chatwindows.vue'
import FileView from './FileView.vue'
import FolderView from './FolderView.vue'

import {
  setAccessToken,
  refreshToken,
  fetchMe,
  logout as apiLogout,
  fetchConversations as apiFetchConversations,
  fetchMessages,
  sendChatMessage,
  deleteChat,
  fetchUserFiles as apiFetchUserFiles,
  uploadFile,
  deleteFile as apiDeleteFile,
  openFileInNewTab,
  fetchCategories as apiFetchCategories,
  updateFileCategory as apiUpdateFileCategory,
  renameFile as apiRenameFile
} from './utils/apicalls.js'

// ==========================================
// 🔐 AUTH STATE
// ==========================================

const isLoggedIn = ref(false)
const currentUser = ref(null)
const showRegister = ref(false)

function onLoginSuccess(data) {
  setAccessToken(data.accessToken)
  currentUser.value = data.user
  isLoggedIn.value = true
  showRegister.value = false

  loadInitialData()
}

async function logout() {
  await apiLogout()
  currentUser.value = null
  isLoggedIn.value = false
  conversations.value = []
  messages.value = []
  userFiles.value = []
}

function loadInitialData() {
  loadConversations()
  loadUserFiles()
  loadCategories()
}

onMounted(async () => {
  const restored = await refreshToken()
  if (restored) {
    try {
      const data = await fetchMe()
      if (data) {
        // Fallback added here just in case fetchMe returns an ID but not the full object
        currentUser.value = data.user || { id: data.user_id, full_name: 'User' }
        isLoggedIn.value = true
        loadInitialData()
      }
    } catch (err) {
      console.error('Session restore failed:', err)
    }
  }
})

// ==========================================
// 💬 CHAT LOGIC
// ==========================================

const currentView = ref('chat')
const currentConversationId = ref(null)
const conversations = ref([])
const messages = ref([])
const loading = ref(false)
const isUploading = ref(false)
const showDeleteModal = ref(false)
const chatToDelete = ref(null)

async function loadConversations() {
  try {
    // ✅ Removed currentUser.value.id
    conversations.value = await apiFetchConversations()
  } catch (err) {
    console.error('Failed to load sidebar:', err)
  }
}

async function loadChat(conversationId) {
  currentConversationId.value = conversationId
  currentView.value = 'chat'
  messages.value = []
  try {
    // ✅ Removed currentUser.value.id
    messages.value = await fetchMessages(conversationId)
  } catch (err) {
    console.error('Failed to load messages:', err)
  }
}

function startNewChat() {
  currentConversationId.value = null
  currentView.value = 'chat'
  messages.value = []
}

async function sendMessage(text) {
  messages.value.push({ role: 'user', content: text })
  const tempMsg = { role: 'assistant', content: 'Thinking...' }
  messages.value.push(tempMsg)

  loading.value = true
  const isNewConversation = !currentConversationId.value

  try {
    // ✅ Removed currentUser.value.id
    const data = await sendChatMessage(
      currentConversationId.value,
      text
    )
    tempMsg.content = data.answer ?? '(no answer)'
    if (data.conversation_id) currentConversationId.value = data.conversation_id
    if (isNewConversation) loadConversations()
  } catch (err) {
    console.error('Chat request failed:', err)
    tempMsg.content = `Error: ${err.message || 'Could not load answer.'}`
  } finally {
    loading.value = false
  }
}

// ==========================================
// 🗑️ DELETE MODAL LOGIC
// ==========================================

function promptDeleteChat(conversationId) {
  chatToDelete.value = conversationId
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  chatToDelete.value = null
}

async function confirmDeleteChat() {
  const conversationId = chatToDelete.value
  showDeleteModal.value = false
  chatToDelete.value = null

  try {
    // ✅ Removed currentUser.value.id
    const ok = await deleteChat(conversationId)
    if (ok) {
      conversations.value = conversations.value.filter(c => c.id !== conversationId)
      if (currentConversationId.value === conversationId) startNewChat()
    } else {
      alert('Failed to delete the chat.')
    }
  } catch (err) {
    console.error('Delete error:', err)
  }
}

// ==========================================
// 📁 FILE MANAGER LOGIC
// ==========================================

const userFiles = ref([])

async function loadUserFiles() {
  try {
    // ✅ Removed currentUser.value.id
    userFiles.value = await apiFetchUserFiles()
  } catch (err) {
    console.error('Failed to load files:', err)
  }
}

async function handleFileUpload(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload PDF files only!')
    return
  }

  isUploading.value = true

  try {
    // ✅ Removed currentUser.value.id
    const data = await uploadFile(file)
    await loadUserFiles()

    const uploadedFile = userFiles.value.find(f => f.id === data.document_id)

    if (currentView.value === 'chat') {
      const category = uploadedFile?.category || 'No category'
      messages.value.push({
        role: 'assistant',
        content: `✅ The file "${file.name}" was uploaded and analysed successfully. Category: "${category}"`
      })
    }
  } catch (err) {
    if (currentView.value === 'chat') {
      messages.value.push({
        role: 'assistant',
        content: `❌ Failed to upload "${file.name}".`
      })
    } else {
      alert(`Failed to upload "${file.name}".`)
    }
  } finally {
    isUploading.value = false
  }
}

function openFile(file) {
  openFileInNewTab(file)
}

async function handleRenameFile(fileId, newName) {
  try {
    const ok = await apiRenameFile(fileId, newName)
    if (ok) {
      const file = userFiles.value.find(f => f.id === fileId)
      if (file) file.name = newName
    }
  } catch (err) {
    console.error('Rename error:', err)
  }
}

async function handleDeleteFile(fileId) {
  if (!confirm('Do you really want to permanently delete this file?')) return

  try {
    const ok = await apiDeleteFile(fileId)
    if (ok) {
      userFiles.value = userFiles.value.filter(f => f.id !== fileId)
    } else {
      alert('Failed to delete the file.')
    }
  } catch (err) {
    console.error('Delete error:', err)
  }
}

// ==========================================
// 📁 CATEGORY LOGIC
// ==========================================

const categories = ref([])

async function loadCategories() {
  try {
    categories.value = await apiFetchCategories()
  } catch (err) {
    console.error('Failed to load categories:', err)
  }
}

async function updateCategory(fileId, categoryName) {
  try {
    await apiUpdateFileCategory(fileId, categoryName)
    const file = userFiles.value.find(f => f.id === fileId)
    if (file) file.category = categoryName
  } catch (err) {
    console.error('Failed to set category:', err)
  }
}
</script>
<style scoped>
.workspace-shell {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  padding: 16px;
  background: var(--bg-base);
  overflow: hidden;
}

.workspace-shell > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 600px) {
  .workspace-shell { padding: 10px; }
}
</style>