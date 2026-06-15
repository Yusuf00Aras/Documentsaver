// State that lives only in this module (token only)
let accessToken = null

async function buildApiError(res, fallbackMessage) {
  let message = fallbackMessage

  try {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await res.json()
      message = data.detail || data.error || message
    } else {
      const text = await res.text()
      if (text.trim()) {
        message = text.trim()
      }
    }
  } catch {
    // Ignore response parsing failures and keep fallback message.
  }

  return new Error(message)
}

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

// Public auth calls (no access token required yet)
export async function loginUser(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Login failed')
  }

  return data
}

export async function registerUser(fullName, email, password) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ full_name: fullName, email, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  return data
}

export async function loginGuest(name = null) {
  const payload = typeof name === 'string' && name.trim()
    ? { name: name.trim() }
    : {}

  const res = await fetch('/api/guestlogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Guest login failed')
  }

  return data
}

// Internal wraps fetch with auth + refresh
async function authFetch(url, options = {}) {

  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`
  }
  options.credentials = 'include'

  let res = await fetch(url, options)
  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      options.headers['Authorization'] = `Bearer ${accessToken}`
      res = await fetch(url, options)
    } else {
      return null
    }
  }
  return res
}

// Refreshes the accesstoken for the website for a period of time
export async function refreshToken() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })
    if (!res.ok) return false
    const data = await res.json()
    accessToken = data.accessToken
    return true
  } catch (err) {
    console.error('Token refresh failed:', err)
    return false
  }
}

export async function fetchMe() {
  const res = await authFetch('/api/auth/me')
  if (res && res.ok) return await res.json()
  return null
}

// logout where accesstoken is set to null
export async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } catch (err) {
    console.error('Logout didnt work', err)
  }
  accessToken = null
}

// Conversations
export async function fetchConversations() {
  const res = await authFetch(`/api/conversations`)
  if (res && res.ok) return await res.json()
  return []
}

export async function fetchMessages(conversationId) {
  const res = await authFetch(`/api/conversations/${conversationId}/messages`)
  if (res && res.ok) return await res.json()
  return []
}

export async function sendChatMessage( conversationId, prompt) {
  const res = await authFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      prompt
    })
  })
  if (!res) throw new Error('Not signed in or session expired')
  if (!res.ok) throw await buildApiError(res, `HTTP ${res.status}`)
  return await res.json()
}

export async function deleteChat(conversationId) {
  const res = await authFetch('/api/chat/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({conversation_id: conversationId })
  })
  return res && res.ok
}

// Files
export async function fetchUserFiles() {
  const res = await authFetch(`/api/files`)
  if (res && res.ok) return await res.json()
  return []
}

export async function uploadFile( file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await authFetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  if (!res || !res.ok) throw new Error(`HTTP Error: ${res?.status}`)
  return await res.json()
}

export async function deleteFile(fileId) {
  const res = await authFetch(`/api/files/${fileId}`, { method: 'DELETE' })
  return res && res.ok
}

export function openFileInNewTab(file) {
  if (file.url) {
    window.open(file.url, '_blank')
  } else {
    window.open(`/api/files/download/${file.id}`, '_blank')
  }
}

// Categories
export async function fetchCategories() {
  const res = await authFetch('/api/categories')
  if (res && res.ok) return await res.json()
  return []
}

export async function updateFileCategory(fileId, categoryName) {
  return await authFetch(`/api/files/${fileId}/category`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: categoryName })
  })
}