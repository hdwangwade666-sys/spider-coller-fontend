const API_PREFIX = '/api/task-config'
const DEFAULT_PAGE_SIZE = 1000

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Request failed: ${response.status}`)
  }

  return payload.data
}

function toQuery(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  return query.toString()
}

export async function pageTaskSummaries(params = {}) {
  const query = toQuery({
    pageNo: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...params,
  })
  return request(`${API_PREFIX}/tasks?${query}`)
}

export async function listTaskSummaries(params = {}) {
  const page = await pageTaskSummaries(params)
  return page?.records || []
}

export async function getTaskDetail(taskId) {
  return request(`${API_PREFIX}/tasks/${taskId}`)
}

export async function createTask(payload) {
  return request(`${API_PREFIX}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTask(taskId, payload) {
  return request(`${API_PREFIX}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteTask(taskId) {
  return request(`${API_PREFIX}/tasks/${taskId}`, {
    method: 'DELETE',
  })
}

export async function listFieldConfigs(params = {}) {
  const page = await pageFieldConfigs(params)
  return page?.records || []
}

export async function pageFieldConfigs(params = {}) {
  const query = toQuery({
    pageNo: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...params,
  })
  return request(`${API_PREFIX}/field-configs?${query}`)
}

export async function createFieldConfig(payload) {
  return request(`${API_PREFIX}/field-configs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateFieldConfig(correctId, payload) {
  return request(`${API_PREFIX}/field-configs/${correctId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteFieldConfig(correctId) {
  return request(`${API_PREFIX}/field-configs/${correctId}`, {
    method: 'DELETE',
  })
}

export async function pageMouldComponents(params = {}) {
  const query = toQuery({
    pageNo: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...params,
  })
  return request(`${API_PREFIX}/mould-components?${query}`)
}

export async function createMouldComponent(payload) {
  return request(`${API_PREFIX}/mould-components`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateMouldComponent(componentId, payload) {
  return request(`${API_PREFIX}/mould-components/${componentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteMouldComponent(componentId) {
  return request(`${API_PREFIX}/mould-components/${componentId}`, {
    method: 'DELETE',
  })
}

export async function listComponents(accessId) {
  return request(`${API_PREFIX}/access-models/${accessId}/components`)
}

export async function createComponent(accessId, payload) {
  return request(`${API_PREFIX}/access-models/${accessId}/components`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateComponent(componentId, payload) {
  return request(`${API_PREFIX}/components/${componentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteComponent(componentId) {
  return request(`${API_PREFIX}/components/${componentId}`, {
    method: 'DELETE',
  })
}
