<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createComponent as createComponentDraft,
  createFactor,
  createFieldConfig as createFieldDraft,
  createLoopRule,
  createRequestParam,
  createResultConfig,
  createStorage,
  createSubTask,
  createTask,
  fieldTypeOptions,
  formatDateTime,
  getComponentDisplayName,
  getStorageDisplayName,
  getSubTaskDisplayName,
  NO,
  STATUS_DISABLED,
  STATUS_ENABLED,
  auditStatusOptions,
  attributeTypeOptions,
  clone,
  componentTypeOptions,
  dataTypeOptions,
  monitorTypeOptions,
  paramTypeOptions,
  requestTypeOptions,
  statusOptions,
  timeTypeOptions,
  toComponentPayload,
  toFieldConfig,
  toFieldPayload,
  toTaskDetail,
  toTaskPayload,
  toTaskSummary,
  yesNoOptions,
  YES,
} from './utils/task-config-adapter'
import {
  createFieldConfig,
  createMouldComponent,
  createTask as createTaskApi,
  deleteMouldComponent,
  deleteFieldConfig,
  deleteTask,
  getTaskDetail,
  pageFieldConfigs,
  pageMouldComponents,
  pageTaskSummaries,
  updateFieldConfig,
  updateMouldComponent,
  updateTask,
} from './api/task-config'

const MAIN_TASK_PAGE_SIZE = 5
const FIELD_PAGE_SIZE = 5
const COMPONENT_PAGE_SIZE = 5
const FILTER_DEBOUNCE_MS = 250

const activeTab = ref('mainTask')
const mainTasks = ref([])
const fieldConfigs = ref([])
const mouldComponents = ref([])
const selectedMainTaskId = ref('')
const selectedSubTaskId = ref('')
const selectedStorageId = ref('')

const loading = reactive({
  mainTasks: false,
  taskDetail: false,
  fields: false,
  components: false,
  taskSaving: false,
  fieldSaving: false,
  componentSaving: false,
})

const mainTaskFilters = reactive({
  taskName: '',
  taskCode: '',
  taskStatus: '',
})

const fieldFilters = reactive({
  tenantCode: '',
  attributeCode: '',
  attributeName: '',
})

const mainTaskPagination = reactive({
  page: 1,
  pageSize: MAIN_TASK_PAGE_SIZE,
  total: 0,
  pages: 1,
})

const fieldPagination = reactive({
  page: 1,
  pageSize: FIELD_PAGE_SIZE,
  total: 0,
  pages: 1,
})

const componentPagination = reactive({
  page: 1,
  pageSize: COMPONENT_PAGE_SIZE,
  total: 0,
  pages: 1,
})

const toast = reactive({
  show: false,
  message: '',
})

const mainTaskModal = reactive({
  open: false,
  mode: 'create',
  draft: createTask({
    loopSettings: { loopItems: [] },
    subTasks: [],
    storageConfigs: [],
  }),
})

const subTaskModal = reactive({
  open: false,
  view: 'list',
  mode: 'create',
  draft: createSubTask(),
})

const storageModal = reactive({
  open: false,
  view: 'list',
  mode: 'create',
  draft: createStorage({
    factors: [],
    components: [],
  }),
})

const fieldModal = reactive({
  open: false,
  mode: 'create',
  draft: createFieldDraft(),
})

const componentModal = reactive({
  open: false,
  mode: 'create',
  draft: createComponentDraft(),
})

let mainTaskFilterTimer = null
let fieldFilterTimer = null
let toastTimer = null

const selectedMainTask = computed(() => {
  return mainTasks.value.find((item) => item.id === selectedMainTaskId.value) || null
})

const selectedSubTask = computed(() => {
  return selectedMainTask.value?.subTasks.find((item) => item.id === selectedSubTaskId.value) || null
})

const selectedStorage = computed(() => {
  return selectedMainTask.value?.storageConfigs.find((item) => item.id === selectedStorageId.value) || null
})

const selectedTaskStatusClass = computed(() => {
  return selectedMainTask.value?.taskStatus === STATUS_ENABLED ? 'status-active' : 'status-disabled'
})

const fieldCountLabel = computed(() => String(fieldPagination.total || 0))
const componentCountLabel = computed(() => String(componentPagination.total || 0))
const mainTaskCountLabel = computed(() => String(mainTaskPagination.total || 0))

const canGoPrevTaskPage = computed(() => mainTaskPagination.page > 1)
const canGoNextTaskPage = computed(() => mainTaskPagination.page < mainTaskPagination.pages)
const canGoPrevFieldPage = computed(() => fieldPagination.page > 1)
const canGoNextFieldPage = computed(() => fieldPagination.page < fieldPagination.pages)
const canGoPrevComponentPage = computed(() => componentPagination.page > 1)
const canGoNextComponentPage = computed(() => componentPagination.page < componentPagination.pages)

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'fieldConfig' && !fieldConfigs.value.length) {
      await loadFieldConfigs({ page: 1 })
    }
    if (tab === 'componentConfig' && !mouldComponents.value.length) {
      await loadMouldComponents({ page: 1 })
    }
  },
)

function showToast(message) {
  toast.message = message
  toast.show = true
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.show = false
  }, 2400)
}

function buildPager(current, total) {
  if (total <= 1) {
    return [1]
  }

  const pages = new Set([1, total, current])
  for (let index = current - 1; index <= current + 1; index += 1) {
    if (index >= 1 && index <= total) {
      pages.add(index)
    }
  }
  return [...pages].sort((left, right) => left - right)
}

const mainTaskPager = computed(() => buildPager(mainTaskPagination.page, mainTaskPagination.pages))
const fieldPager = computed(() => buildPager(fieldPagination.page, fieldPagination.pages))
const componentPager = computed(() => buildPager(componentPagination.page, componentPagination.pages))

function getStatusChipClass(status) {
  return status === STATUS_ENABLED ? 'status-active' : 'status-disabled'
}

function getRealtimeLabel(value) {
  return value === YES ? '实时' : '非实时'
}

function toQueryStatus(value) {
  if (value === STATUS_ENABLED) {
    return 1
  }
  if (value === STATUS_DISABLED) {
    return 0
  }
  return undefined
}

function getSelectedTaskIndex() {
  return mainTasks.value.findIndex((item) => item.id === selectedMainTaskId.value)
}

function replaceTask(nextTask) {
  const index = mainTasks.value.findIndex((item) => item.id === nextTask.id)
  if (index >= 0) {
    mainTasks.value.splice(index, 1, nextTask)
  } else {
    mainTasks.value.unshift(nextTask)
  }
}

function ensureTaskSelections(task) {
  if (!task) {
    selectedSubTaskId.value = ''
    selectedStorageId.value = ''
    return
  }

  if (!task.subTasks.some((item) => item.id === selectedSubTaskId.value)) {
    selectedSubTaskId.value = task.subTasks[0]?.id || ''
  }

  if (!task.storageConfigs.some((item) => item.id === selectedStorageId.value)) {
    selectedStorageId.value = task.storageConfigs[0]?.id || ''
  }
}

async function loadMainTasks(options = {}) {
  loading.mainTasks = true

  try {
    const requestedPage = options.page ?? mainTaskPagination.page ?? 1
    const requestedSize = options.pageSize ?? mainTaskPagination.pageSize ?? MAIN_TASK_PAGE_SIZE
    const pageData = await pageTaskSummaries({
      pageNo: requestedPage,
      pageSize: requestedSize,
      taskName: mainTaskFilters.taskName || undefined,
      taskCode: mainTaskFilters.taskCode || undefined,
      taskStatus: toQueryStatus(mainTaskFilters.taskStatus),
    })

    mainTaskPagination.page = Number(pageData?.current) || requestedPage
    mainTaskPagination.pageSize = Number(pageData?.size) || requestedSize
    mainTaskPagination.total = Number(pageData?.total) || 0
    mainTaskPagination.pages = Math.max(1, Number(pageData?.pages) || 1)

    const preferredTaskId = options.preferredTaskId || selectedMainTaskId.value
    mainTasks.value = (pageData?.records || []).map((item) => {
      const current = mainTasks.value.find((task) => task.id === String(item.taskId))
      const latestSummary = toTaskSummary(item)

      if (!current?.__detailLoaded) {
        return latestSummary
      }

      return createTask({
        ...current,
        id: latestSummary.id,
        taskName: latestSummary.taskName,
        taskCode: latestSummary.taskCode,
        taskStatus: latestSummary.taskStatus,
        dataSource: latestSummary.dataSource,
        realtimeData: latestSummary.realtimeData,
        __detailLoaded: true,
      })
    })

    const nextSelectedTask =
      mainTasks.value.find((item) => item.id === preferredTaskId) ||
      mainTasks.value[0] ||
      null

    selectedMainTaskId.value = nextSelectedTask?.id || ''
    ensureTaskSelections(nextSelectedTask)

    if (selectedMainTaskId.value) {
      await ensureTaskDetail(selectedMainTaskId.value, {
        silent: true,
        forceReload: options.forceReloadSelectedTaskDetail,
      })
    } else {
      storageComponents.value = []
    }
  } finally {
    loading.mainTasks = false
  }
}

async function ensureTaskDetail(taskId, options = {}) {
  if (!taskId) {
    return null
  }

  const current = mainTasks.value.find((item) => item.id === taskId)
  if (!current) {
    return null
  }

  if (current.__detailLoaded && !options.forceReload) {
    ensureTaskSelections(current)
    return current
  }

  loading.taskDetail = !options.silent

  try {
    const detail = await getTaskDetail(taskId)
    const nextTask = toTaskDetail(
      {
        taskId: current.id,
        taskName: current.taskName,
        taskCode: current.taskCode,
        taskStatus: current.taskStatus === STATUS_ENABLED ? 1 : 0,
        dataSource: current.dataSource,
        actual: current.realtimeData === YES ? 1 : 0,
      },
      detail || {},
    )

    replaceTask(nextTask)
    if (selectedMainTaskId.value === nextTask.id) {
      ensureTaskSelections(nextTask)
    }
    return nextTask
  } finally {
    loading.taskDetail = false
  }
}

async function selectMainTask(taskId) {
  selectedMainTaskId.value = taskId
  const task = await ensureTaskDetail(taskId, { silent: true })
  ensureTaskSelections(task)
}

function scheduleMainTaskReload() {
  window.clearTimeout(mainTaskFilterTimer)
  mainTaskFilterTimer = window.setTimeout(() => {
    mainTaskPagination.page = 1
    loadMainTasks({ page: 1 })
  }, FILTER_DEBOUNCE_MS)
}

function resetMainTaskFilters() {
  mainTaskFilters.taskName = ''
  mainTaskFilters.taskCode = ''
  mainTaskFilters.taskStatus = ''
  mainTaskPagination.page = 1
  loadMainTasks({ page: 1 })
}

function goToMainTaskPage(page) {
  if (page < 1 || page > mainTaskPagination.pages) {
    return
  }
  mainTaskPagination.page = page
  loadMainTasks({ page })
}

async function saveTaskDraft() {
  const draft = clone(mainTaskModal.draft)
  if (!draft.taskName.trim()) {
    showToast('请填写任务名称')
    return
  }
  if (!draft.taskCode.trim()) {
    showToast('请填写任务编码')
    return
  }

  loading.taskSaving = true

  try {
    const payload = toTaskPayload(draft)
    let taskId = draft.id
    let targetPage = mainTaskPagination.page

    if (draft.id.startsWith('task_')) {
      taskId = await createTaskApi(payload)
      targetPage = 1
      showToast('主任务已创建')
    } else {
      await updateTask(draft.id, payload)
      showToast('主任务已更新')
    }

    mainTaskModal.open = false
    await loadMainTasks({ page: targetPage, preferredTaskId: taskId })
  } finally {
    loading.taskSaving = false
  }
}

async function persistSelectedTask(nextTask, successMessage, options = {}) {
  loading.taskSaving = true

  try {
    const payload = toTaskPayload(nextTask)
    let taskId = nextTask.id

    if (taskId.startsWith('task_')) {
      taskId = await createTaskApi(payload)
    } else {
      await updateTask(taskId, payload)
    }

    showToast(successMessage)
    await loadMainTasks({
      page: mainTaskPagination.page,
      preferredTaskId: taskId,
      forceReloadSelectedTaskDetail: options.forceReloadSelectedTaskDetail,
    })
    return taskId
  } finally {
    loading.taskSaving = false
  }
}

async function openMainTaskModal(mode, taskId = '') {
  mainTaskModal.mode = mode

  if (mode === 'edit') {
    await ensureTaskDetail(taskId)
    const source = selectedMainTask.value?.id === taskId
      ? selectedMainTask.value
      : mainTasks.value.find((item) => item.id === taskId)
    mainTaskModal.draft = clone(source || createTask())
  } else {
    mainTaskModal.draft = createTask({
      taskStatus: STATUS_ENABLED,
      realtimeData: NO,
      loopEnabled: NO,
      loopSettings: { loopItems: [] },
      subTasks: [],
      storageConfigs: [],
    })
  }

  mainTaskModal.open = true
}

function closeMainTaskModal() {
  mainTaskModal.open = false
}

async function removeMainTaskById(taskId) {
  if (!window.confirm('确认删除该主任务吗？')) {
    return
  }

  const targetPage =
    mainTasks.value.length === 1 && mainTaskPagination.page > 1
      ? mainTaskPagination.page - 1
      : mainTaskPagination.page

  await deleteTask(taskId)
  showToast('主任务已删除')

  if (selectedMainTaskId.value === taskId) {
    selectedMainTaskId.value = ''
    selectedStorageId.value = ''
    selectedSubTaskId.value = ''
  }

  await loadMainTasks({
    page: targetPage,
  })
}

async function toggleTaskStatus(taskId) {
  const currentTask = await ensureTaskDetail(taskId)
  if (!currentTask) {
    return
  }

  const nextTask = clone(currentTask)
  nextTask.taskStatus = nextTask.taskStatus === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED
  await persistSelectedTask(
    nextTask,
    `主任务已${nextTask.taskStatus === STATUS_ENABLED ? '启用' : '停用'}`,
  )
}

function addLoopItem() {
  mainTaskModal.draft.loopSettings.loopItems.push(createLoopRule())
}

function removeLoopItem(loopId) {
  mainTaskModal.draft.loopSettings.loopItems = mainTaskModal.draft.loopSettings.loopItems.filter(
    (item) => item.id !== loopId,
  )
}

async function openSubTaskModal(view = 'list', subTaskId = '') {
  const task = await ensureTaskDetail(selectedMainTaskId.value)
  if (!task) {
    showToast('请先选择主任务')
    return
  }

  subTaskModal.open = true
  subTaskModal.view = view
  if (view === 'form') {
    subTaskModal.mode = subTaskId ? 'edit' : 'create'
    const source = subTaskId
      ? task.subTasks.find((item) => item.id === subTaskId)
      : createSubTask({
          requestParams: [],
          resultConfigs: [],
        })
    subTaskModal.draft = clone(source || createSubTask())
  }
}

function closeSubTaskModal() {
  subTaskModal.open = false
}

function openSubTaskForm(subTaskId = '') {
  subTaskModal.view = 'form'
  subTaskModal.mode = subTaskId ? 'edit' : 'create'
  const source = subTaskId
    ? selectedMainTask.value?.subTasks.find((item) => item.id === subTaskId)
    : createSubTask({
        requestParams: [],
        resultConfigs: [],
      })
  subTaskModal.draft = clone(source || createSubTask())
}

function addSubTaskRequestParam() {
  subTaskModal.draft.requestParams.push(createRequestParam())
}

function removeSubTaskRequestParam(rowId) {
  subTaskModal.draft.requestParams = subTaskModal.draft.requestParams.filter((item) => item.id !== rowId)
}

function addSubTaskResultConfig() {
  subTaskModal.draft.resultConfigs.push(createResultConfig())
}

function removeSubTaskResultConfig(rowId) {
  subTaskModal.draft.resultConfigs = subTaskModal.draft.resultConfigs.filter((item) => item.id !== rowId)
}

async function saveSubTaskDraft() {
  const task = await ensureTaskDetail(selectedMainTaskId.value)
  if (!task) {
    return
  }

  if (!subTaskModal.draft.nodeName.trim()) {
    showToast('请填写子任务名称')
    return
  }

  const nextTask = clone(task)
  const draft = clone(subTaskModal.draft)
  const index = nextTask.subTasks.findIndex((item) => item.id === draft.id)
  if (index >= 0) {
    nextTask.subTasks.splice(index, 1, draft)
  } else {
    nextTask.subTasks.push(draft)
  }

  await persistSelectedTask(nextTask, '子任务已保存', {
    forceReloadSelectedTaskDetail: true,
  })
  selectedSubTaskId.value = draft.id
  subTaskModal.view = 'list'
}

async function removeSubTaskById(subTaskId) {
  const task = await ensureTaskDetail(selectedMainTaskId.value)
  if (!task || !window.confirm('确认删除该子任务吗？')) {
    return
  }

  const nextTask = clone(task)
  nextTask.subTasks = nextTask.subTasks.filter((item) => item.id !== subTaskId)
  await persistSelectedTask(nextTask, '子任务已删除', {
    forceReloadSelectedTaskDetail: true,
  })
}

async function openStorageModal(view = 'list', storageId = '') {
  const task = await ensureTaskDetail(selectedMainTaskId.value)
  if (!task) {
    showToast('请先选择主任务')
    return
  }

  storageModal.open = true
  storageModal.view = view
  if (view === 'form') {
    storageModal.mode = storageId ? 'edit' : 'create'
    const source = storageId
      ? task.storageConfigs.find((item) => item.id === storageId)
      : createStorage({ factors: [], components: [] })
    storageModal.draft = clone(source || createStorage())
  }
}

function closeStorageModal() {
  storageModal.open = false
}

function openStorageForm(storageId = '') {
  storageModal.view = 'form'
  storageModal.mode = storageId ? 'edit' : 'create'
  const source = storageId
    ? selectedMainTask.value?.storageConfigs.find((item) => item.id === storageId)
    : createStorage({ factors: [], components: [] })
  storageModal.draft = clone(source || createStorage())
}

function addStorageFactor() {
  storageModal.draft.factors.push(createFactor())
}

function removeStorageFactor(rowId) {
  storageModal.draft.factors = storageModal.draft.factors.filter((item) => item.id !== rowId)
}

async function saveStorageDraft() {
  const task = await ensureTaskDetail(selectedMainTaskId.value)
  if (!task) {
    return
  }

  const draft = clone(storageModal.draft)
  if (!draft.dataset.trim()) {
    showToast('请填写数据集')
    return
  }

  const nextTask = clone(task)
  const index = nextTask.storageConfigs.findIndex((item) => item.id === draft.id)
  if (index >= 0) {
    nextTask.storageConfigs.splice(index, 1, draft)
  } else {
    nextTask.storageConfigs.push(draft)
  }

  await persistSelectedTask(nextTask, '入库配置已保存', {
    forceReloadSelectedTaskDetail: true,
  })
  selectedStorageId.value = draft.id
  storageModal.view = 'list'
}

async function removeStorageById(storageId) {
  const task = await ensureTaskDetail(selectedMainTaskId.value)
  if (!task || !window.confirm('确认删除该入库配置吗？')) {
    return
  }

  const nextTask = clone(task)
  nextTask.storageConfigs = nextTask.storageConfigs.filter((item) => item.id !== storageId)
  await persistSelectedTask(nextTask, '入库配置已删除', {
    forceReloadSelectedTaskDetail: true,
  })
}

async function loadFieldConfigs(options = {}) {
  loading.fields = true

  try {
    const requestedPage = options.page ?? fieldPagination.page ?? 1
    const requestedSize = options.pageSize ?? fieldPagination.pageSize ?? FIELD_PAGE_SIZE
    const pageData = await pageFieldConfigs({
      pageNo: requestedPage,
      pageSize: requestedSize,
      tenantCode: fieldFilters.tenantCode || undefined,
      attributeCode: fieldFilters.attributeCode || undefined,
      attributeName: fieldFilters.attributeName || undefined,
    })

    fieldPagination.page = Number(pageData?.current) || requestedPage
    fieldPagination.pageSize = Number(pageData?.size) || requestedSize
    fieldPagination.total = Number(pageData?.total) || 0
    fieldPagination.pages = Math.max(1, Number(pageData?.pages) || 1)
    fieldConfigs.value = (pageData?.records || []).map(toFieldConfig)
  } finally {
    loading.fields = false
  }
}

function scheduleFieldReload() {
  window.clearTimeout(fieldFilterTimer)
  fieldFilterTimer = window.setTimeout(() => {
    fieldPagination.page = 1
    loadFieldConfigs({ page: 1 })
  }, FILTER_DEBOUNCE_MS)
}

function resetFieldFilters() {
  fieldFilters.tenantCode = ''
  fieldFilters.attributeCode = ''
  fieldFilters.attributeName = ''
  fieldPagination.page = 1
  loadFieldConfigs({ page: 1 })
}

function goToFieldPage(page) {
  if (page < 1 || page > fieldPagination.pages) {
    return
  }
  fieldPagination.page = page
  loadFieldConfigs({ page })
}

function openFieldModal(mode, field = null) {
  fieldModal.mode = mode
  fieldModal.draft = clone(field || createFieldDraft())
  fieldModal.open = true
}

function closeFieldModal() {
  fieldModal.open = false
}

async function saveFieldDraft() {
  const draft = clone(fieldModal.draft)
  if (!draft.tenantId.trim()) {
    showToast('请填写租户编号')
    return
  }
  if (!draft.systemCode.trim()) {
    showToast('请填写系统编号')
    return
  }

  loading.fieldSaving = true
  try {
    const payload = toFieldPayload(draft)
    if (draft.id.startsWith('fld_')) {
      await createFieldConfig(payload)
      fieldPagination.page = 1
      showToast('字段配置已创建')
    } else {
      await updateFieldConfig(draft.id, payload)
      showToast('字段配置已更新')
    }

    fieldModal.open = false
    await loadFieldConfigs({ page: fieldPagination.page })
  } finally {
    loading.fieldSaving = false
  }
}

async function removeFieldConfigById(fieldId) {
  if (!window.confirm('确认删除该字段配置吗？')) {
    return
  }
  await deleteFieldConfig(fieldId)
  showToast('字段配置已删除')
  await loadFieldConfigs({ page: fieldPagination.page })
}

function mapBackendComponent(component = {}) {
  return createComponentDraft({
    id: component.componentId || '',
    componentCode: component.componentCode || '',
    componentName: component.componentName || '',
    componentConfig: component.componentBean || '',
    componentSetting: component.componentConfig || '',
    componentType: component.componentType === 1 || component.componentType === '1' ? '校验' : '计算',
    componentOrder: component.componentSort ?? '',
  })
}

async function loadMouldComponents(options = {}) {
  loading.components = true
  try {
    const requestedPage = options.page ?? componentPagination.page ?? 1
    const requestedSize = options.pageSize ?? componentPagination.pageSize ?? COMPONENT_PAGE_SIZE
    const pageData = await pageMouldComponents({
      pageNo: requestedPage,
      pageSize: requestedSize,
    })
    componentPagination.page = Number(pageData?.current) || requestedPage
    componentPagination.pageSize = Number(pageData?.size) || requestedSize
    componentPagination.total = Number(pageData?.total) || 0
    componentPagination.pages = Math.max(1, Number(pageData?.pages) || 1)
    mouldComponents.value = (pageData?.records || []).map(mapBackendComponent)
  } finally {
    loading.components = false
  }
}

function openComponentModal(mode, component = null) {
  componentModal.mode = mode
  componentModal.draft = clone(component || createComponentDraft())
  componentModal.open = true
}

function closeComponentModal() {
  componentModal.open = false
}

async function saveComponentDraft() {
  const draft = clone(componentModal.draft)
  if (!draft.componentName.trim()) {
    showToast('请填写组件名称')
    return
  }

  loading.componentSaving = true
  try {
    const payload = toComponentPayload(draft)
    if (draft.id.startsWith('cmp_')) {
      await createMouldComponent(payload)
      showToast('组件配置已创建')
    } else {
      await updateMouldComponent(draft.id, payload)
      showToast('组件配置已更新')
    }

    componentModal.open = false
    await loadMouldComponents({ page: componentPagination.page })
  } finally {
    loading.componentSaving = false
  }
}

async function removeComponentById(componentId) {
  if (!window.confirm('确认删除该组件配置吗？')) {
    return
  }
  await deleteMouldComponent(componentId)
  showToast('组件配置已删除')
  await loadMouldComponents({ page: componentPagination.page })
}

function goToComponentPage(page) {
  if (page < 1 || page > componentPagination.pages) {
    return
  }
  componentPagination.page = page
  loadMouldComponents({ page })
}

function openSubTaskManagerFromMainTask() {
  closeMainTaskModal()
  openSubTaskModal('list')
}

function openStorageManagerFromMainTask() {
  closeMainTaskModal()
  openStorageModal('list')
}

onMounted(async () => {
  await loadMainTasks({ page: 1, pageSize: MAIN_TASK_PAGE_SIZE })
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">DL</div>
        <div>
          <h1>配置系统</h1>
        </div>
      </div>

      <nav class="side-nav">
        <button
          class="nav-item"
          :class="{ active: activeTab === 'mainTask' }"
          type="button"
          @click="activeTab = 'mainTask'"
        >
          <div class="nav-item-title">
            <span>主任务配置</span>
            <span class="nav-badge">01</span>
          </div>
          <p class="nav-item-meta">维护主任务基础信息、循环规则、子任务与入库配置。</p>
        </button>

        <button
          class="nav-item"
          :class="{ active: activeTab === 'fieldConfig' }"
          type="button"
          @click="activeTab = 'fieldConfig'"
        >
          <div class="nav-item-title">
            <span>数据字段配置</span>
            <span class="nav-badge">{{ fieldCountLabel }}</span>
          </div>
          <p class="nav-item-meta">按租户、系统编号和系统名称维护字段映射关系。</p>
        </button>

        <button
          class="nav-item"
          :class="{ active: activeTab === 'componentConfig' }"
          type="button"
          @click="activeTab = 'componentConfig'"
        >
          <div class="nav-item-title">
            <span>组件配置</span>
            <span class="nav-badge">{{ componentCountLabel }}</span>
          </div>
          <p class="nav-item-meta">维护组件编号、组件名称、实体类名、配置、类型与排序。</p>
        </button>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="topbar-copy">
          <h2>数据接入配置工作台</h2>
        </div>

        <div class="topbar-side">
          <div class="highlight-card topbar-flow-card">
            <h4>推荐配置流程</h4>
            <p>先创建主任务，再补充子任务与入库配置；字段和组件在独立区域继续维护。</p>
            <div class="tag-list">
              <span class="tag">主任务</span>
              <span class="tag">子任务</span>
              <span class="tag">入库策略</span>
            </div>
          </div>
        </div>
      </header>

      <section class="workspace">
        <div class="config-panel">
          <div class="tab-panel active">
            <section v-if="activeTab === 'mainTask'" class="section-card">
              <div class="table-panel-head">
                <div class="table-panel-copy">
                  <h3 class="table-panel-title">主任务列表</h3>
                </div>
              </div>

              <div class="maintask-toolbar">
                <div class="maintask-filters">
                  <div class="field">
                    <label for="filterTaskName">任务名称</label>
                    <input
                      id="filterTaskName"
                      v-model="mainTaskFilters.taskName"
                      placeholder="按任务名称筛选"
                      @input="scheduleMainTaskReload"
                    />
                  </div>
                  <div class="field">
                    <label for="filterTaskCode">任务编码</label>
                    <input
                      id="filterTaskCode"
                      v-model="mainTaskFilters.taskCode"
                      placeholder="按任务编码筛选"
                      @input="scheduleMainTaskReload"
                    />
                  </div>
                  <div class="field">
                    <label for="filterTaskStatus">任务状态</label>
                    <select
                      id="filterTaskStatus"
                      v-model="mainTaskFilters.taskStatus"
                      @change="scheduleMainTaskReload"
                    >
                      <option value="">全部状态</option>
                      <option v-for="option in statusOptions" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="maintask-actions">
                  <button class="btn btn-soft" type="button" @click="resetMainTaskFilters">重置筛选</button>
                  <button class="btn btn-secondary" type="button" @click="openMainTaskModal('create')">新增主任务</button>
                </div>
              </div>

              <div class="table-wrap">
                <table class="main-task-table">
                  <colgroup>
                    <col style="width: 25%" />
                    <col style="width: 20%" />
                    <col style="width: 10%" />
                    <col style="width: 15%" />
                    <col style="width: 10%" />
                    <col style="width: 20%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>任务名称</th>
                      <th>任务编码</th>
                      <th>任务状态</th>
                      <th>数据来源</th>
                      <th>实时数据</th>
                      <th class="table-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading.mainTasks && !mainTasks.length">
                      <td colspan="6">主任务加载中...</td>
                    </tr>
                    <tr v-else-if="!mainTasks.length">
                      <td colspan="6">暂无主任务数据</td>
                    </tr>
                    <tr
                      v-for="task in mainTasks"
                      :key="task.id"
                      :class="{ 'row-selected': task.id === selectedMainTaskId }"
                      @click="selectMainTask(task.id)"
                    >
                      <td>{{ task.taskName || '--' }}</td>
                      <td>{{ task.taskCode || '--' }}</td>
                      <td>
                        <span class="status-chip" :class="getStatusChipClass(task.taskStatus)">
                          {{ task.taskStatus }}
                        </span>
                      </td>
                      <td>{{ task.dataSource || '--' }}</td>
                      <td>
                        <span class="status-chip status-realtime">{{ getRealtimeLabel(task.realtimeData) }}</span>
                      </td>
                      <td class="table-actions">
                        <div class="inline-actions">
                          <button class="btn btn-soft" type="button" @click.stop="openMainTaskModal('edit', task.id)">编辑</button>
                          <button class="btn btn-soft" type="button" @click.stop="toggleTaskStatus(task.id)">
                            {{ task.taskStatus === STATUS_ENABLED ? '停用' : '启用' }}
                          </button>
                          <button class="ghost-btn" type="button" @click.stop="removeMainTaskById(task.id)">删除</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="main-task-pagination">
                <div class="pagination-meta">
                  共 {{ mainTaskPagination.total }} 条，当前第 {{ mainTaskPagination.page }} / {{ mainTaskPagination.pages }} 页
                </div>
                <div class="pagination-actions">
                  <button class="pager-btn" type="button" :disabled="!canGoPrevTaskPage" @click="goToMainTaskPage(mainTaskPagination.page - 1)">
                    上一页
                  </button>
                  <button
                    v-for="page in mainTaskPager"
                    :key="`task-page-${page}`"
                    class="pager-btn"
                    :class="{ active: page === mainTaskPagination.page }"
                    type="button"
                    @click="goToMainTaskPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="pager-btn" type="button" :disabled="!canGoNextTaskPage" @click="goToMainTaskPage(mainTaskPagination.page + 1)">
                    下一页
                  </button>
                </div>
              </div>

            </section>

            <section v-if="activeTab === 'fieldConfig'" class="section-card">
              <div class="section-head">
                <div>
                  <h3>数据字段配置</h3>
                  <p class="section-desc">字段列表走服务端分页查询，避免前端全量拉取。</p>
                </div>
              </div>

              <div class="maintask-toolbar">
                <div class="maintask-filters">
                  <div class="field">
                    <label for="filterFieldTenantCode">租户编号</label>
                    <input
                      id="filterFieldTenantCode"
                      v-model="fieldFilters.tenantCode"
                      placeholder="按租户编号筛选"
                      @input="scheduleFieldReload"
                    />
                  </div>
                  <div class="field">
                    <label for="filterFieldAttributeCode">系统编号</label>
                    <input
                      id="filterFieldAttributeCode"
                      v-model="fieldFilters.attributeCode"
                      placeholder="按系统编号筛选"
                      @input="scheduleFieldReload"
                    />
                  </div>
                  <div class="field">
                    <label for="filterFieldAttributeName">系统名称</label>
                    <input
                      id="filterFieldAttributeName"
                      v-model="fieldFilters.attributeName"
                      placeholder="按系统名称筛选"
                      @input="scheduleFieldReload"
                    />
                  </div>
                </div>

                <div class="maintask-actions">
                  <button class="btn btn-soft" type="button" @click="resetFieldFilters">重置筛选</button>
                  <button class="btn btn-secondary" type="button" @click="openFieldModal('create')">新增字段</button>
                </div>
              </div>

              <div class="table-wrap">
                <table class="main-task-table storage-list-table">
                  <thead>
                    <tr>
                      <th>租户编号</th>
                      <th>类型</th>
                      <th>网站参数编号</th>
                      <th>网站数据编号</th>
                      <th>系统编号</th>
                      <th>系统名称</th>
                      <th class="table-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading.fields && !fieldConfigs.length">
                      <td colspan="7">字段配置加载中...</td>
                    </tr>
                    <tr v-else-if="!fieldConfigs.length">
                      <td colspan="7">暂无字段配置</td>
                    </tr>
                    <tr v-for="field in fieldConfigs" :key="field.id">
                      <td>{{ field.tenantId || '--' }}</td>
                      <td>{{ field.fieldType || '--' }}</td>
                      <td>{{ field.siteParamCode || '--' }}</td>
                      <td>{{ field.siteDataCode || '--' }}</td>
                      <td>{{ field.systemCode || '--' }}</td>
                      <td>{{ field.systemName || '--' }}</td>
                      <td class="table-actions">
                        <div class="inline-actions">
                          <button class="btn btn-soft" type="button" @click="openFieldModal('edit', field)">编辑</button>
                          <button class="ghost-btn" type="button" @click="removeFieldConfigById(field.id)">删除</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="main-task-pagination">
                <div class="pagination-meta">
                  共 {{ fieldPagination.total }} 条，当前第 {{ fieldPagination.page }} / {{ fieldPagination.pages }} 页
                </div>
                <div class="pagination-actions">
                  <button class="pager-btn" type="button" :disabled="!canGoPrevFieldPage" @click="goToFieldPage(fieldPagination.page - 1)">
                    上一页
                  </button>
                  <button
                    v-for="page in fieldPager"
                    :key="`field-page-${page}`"
                    class="pager-btn"
                    :class="{ active: page === fieldPagination.page }"
                    type="button"
                    @click="goToFieldPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="pager-btn" type="button" :disabled="!canGoNextFieldPage" @click="goToFieldPage(fieldPagination.page + 1)">
                    下一页
                  </button>
                </div>
              </div>
            </section>

            <section v-if="activeTab === 'componentConfig'" class="section-card">
              <div class="table-panel-head">
                <div class="table-panel-copy">
                  <h3 class="table-panel-title">组件配置列表</h3>
                </div>
                <div class="inline-actions">
                  <button class="btn btn-secondary" type="button" @click="openComponentModal('create')">新增组件配置</button>
                </div>
              </div>

              <div class="table-wrap">
                <table class="main-task-table component-list-table">
                  <colgroup>
                    <col style="width: 18%" />
                    <col style="width: 14%" />
                    <col style="width: 14%" />
                    <col style="width: 24%" />
                    <col style="width: 10%" />
                    <col style="width: 20%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>组件名称</th>
                      <th>组件编号</th>
                      <th>类型</th>
                      <th>实体类名</th>
                      <th>排序</th>
                      <th class="table-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading.components && !mouldComponents.length">
                      <td colspan="6">组件配置加载中...</td>
                    </tr>
                    <tr v-else-if="!mouldComponents.length">
                      <td colspan="6">暂无组件配置</td>
                    </tr>
                    <tr v-for="component in mouldComponents" :key="component.id">
                      <td>{{ component.componentName || '--' }}</td>
                      <td>{{ component.componentCode || '--' }}</td>
                      <td>{{ component.componentType || '--' }}</td>
                      <td>{{ component.componentConfig || '--' }}</td>
                      <td>{{ component.componentOrder || '--' }}</td>
                      <td class="table-actions">
                        <div class="inline-actions">
                          <button class="btn btn-secondary" type="button" @click="openComponentModal('edit', component)">修改</button>
                          <button class="ghost-btn" type="button" @click="removeComponentById(component.id)">删除</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="main-task-pagination">
                <div class="pagination-meta">
                  共 {{ componentPagination.total }} 条，当前第 {{ componentPagination.page }} / {{ componentPagination.pages }} 页
                </div>
                <div class="pagination-actions">
                  <button class="pager-btn" type="button" :disabled="!canGoPrevComponentPage" @click="goToComponentPage(componentPagination.page - 1)">
                    上一页
                  </button>
                  <button
                    v-for="page in componentPager"
                    :key="`component-page-${page}`"
                    class="pager-btn"
                    :class="{ active: page === componentPagination.page }"
                    type="button"
                    @click="goToComponentPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="pager-btn" type="button" :disabled="!canGoNextComponentPage" @click="goToComponentPage(componentPagination.page + 1)">
                    下一页
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  </div>

  <div class="toast" :class="{ show: toast.show }">{{ toast.message }}</div>

  <div class="modal-overlay" :class="{ open: mainTaskModal.open }" @click.self="closeMainTaskModal">
    <div class="modal-shell">
      <button class="btn modal-close-icon" type="button" @click="closeMainTaskModal" aria-label="关闭">×</button>
      <div class="modal-dialog">
        <div class="modal-head">
          <div>
            <h3 class="modal-title">{{ mainTaskModal.mode === 'create' ? '新增主任务' : '编辑主任务' }}</h3>
            <p class="section-desc">保持原有页面结构，但底层已经改成 Vue 3 响应式表单。</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-soft" type="button" @click="closeMainTaskModal">取消</button>
            <button class="btn btn-primary" type="button" :disabled="loading.taskSaving" @click="saveTaskDraft">
              {{ loading.taskSaving ? '保存中...' : '保存主任务' }}
            </button>
          </div>
        </div>

        <div class="modal-stack">
          <section class="section-card">
            <div class="section-head">
              <div><h3>基础信息</h3></div>
            </div>
            <div class="field-grid columns-3">
              <div class="field">
                <label>任务名称</label>
                <input v-model="mainTaskModal.draft.taskName" />
              </div>
              <div class="field">
                <label>任务编码</label>
                <input v-model="mainTaskModal.draft.taskCode" />
              </div>
              <div class="field">
                <label>任务状态</label>
                <select v-model="mainTaskModal.draft.taskStatus">
                  <option v-for="option in statusOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>数据来源</label>
                <input v-model="mainTaskModal.draft.dataSource" />
              </div>
              <div class="field">
                <label>实时数据</label>
                <select v-model="mainTaskModal.draft.realtimeData">
                  <option v-for="option in yesNoOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>是否循环</label>
                <select v-model="mainTaskModal.draft.loopEnabled">
                  <option v-for="option in yesNoOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>分区</label>
                <input v-model="mainTaskModal.draft.district" />
              </div>
              <div class="field">
                <label>爬虫服务 index</label>
                <input v-model="mainTaskModal.draft.mass" />
              </div>
            </div>
          </section>

          <section v-if="mainTaskModal.draft.loopEnabled === YES" class="section-card">
            <div class="section-head">
              <div><h3>循环规则</h3></div>
              <div class="inline-actions">
                <button class="btn btn-soft" type="button" @click="addLoopItem">新增循环项</button>
              </div>
            </div>
            <div class="field-grid columns-3">
              <div class="field">
                <label>开始节点</label>
                <input v-model="mainTaskModal.draft.loopSettings.startNode" type="number" />
              </div>
              <div class="field">
                <label>结束节点</label>
                <input v-model="mainTaskModal.draft.loopSettings.endNode" type="number" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>循环参数</th>
                    <th>循环值</th>
                    <th>值脚本</th>
                    <th class="table-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!mainTaskModal.draft.loopSettings.loopItems.length">
                    <td colspan="4">暂无循环项</td>
                  </tr>
                  <tr v-for="item in mainTaskModal.draft.loopSettings.loopItems" :key="item.id">
                    <td><input v-model="item.loopParam" /></td>
                    <td><input v-model="item.loopValue" /></td>
                    <td><textarea v-model="item.loopScript"></textarea></td>
                    <td class="table-actions">
                      <button class="ghost-btn" type="button" @click="removeLoopItem(item.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <div><h3>子任务配置</h3></div>
            </div>
            <div class="summary-slab maintask-link-slab">
              <div class="maintask-link-row">
                <p class="maintask-link-heading">已添加子任务：</p>
                <div class="maintask-link-chip-row">
                  <span
                    v-for="(item, index) in mainTaskModal.draft.subTasks"
                    :key="item.id"
                    class="maintask-link-chip"
                  >
                    {{ getSubTaskDisplayName(item, index) }}
                  </span>
                  <span v-if="!mainTaskModal.draft.subTasks.length" class="maintask-link-empty">当前没有子任务</span>
                </div>
              </div>
              <div class="inline-actions">
                <button
                  class="btn btn-soft"
                  type="button"
                  :disabled="mainTaskModal.mode === 'create'"
                  @click="openSubTaskManagerFromMainTask"
                >
                  管理子任务列表
                </button>
                <button
                  class="btn btn-secondary"
                  type="button"
                  :disabled="mainTaskModal.mode === 'create'"
                  @click="openSubTaskManagerFromMainTask"
                >
                  编辑子任务
                </button>
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <div><h3>入库配置</h3></div>
            </div>
            <div class="summary-slab maintask-link-slab">
              <div class="maintask-link-row">
                <p class="maintask-link-heading">已添加入库项：</p>
                <div class="maintask-link-chip-row">
                  <span
                    v-for="item in mainTaskModal.draft.storageConfigs"
                    :key="item.id"
                    class="maintask-link-chip"
                  >
                    {{ item.tenantNo || '--' }}
                  </span>
                  <span v-if="!mainTaskModal.draft.storageConfigs.length" class="maintask-link-empty">当前没有入库配置</span>
                </div>
              </div>
              <div class="inline-actions">
                <button
                  class="btn btn-soft"
                  type="button"
                  :disabled="mainTaskModal.mode === 'create'"
                  @click="openStorageManagerFromMainTask"
                >
                  管理入库配置
                </button>
                <button
                  class="btn btn-secondary"
                  type="button"
                  :disabled="mainTaskModal.mode === 'create'"
                  @click="openStorageManagerFromMainTask"
                >
                  编辑入库配置
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" :class="{ open: subTaskModal.open }" @click.self="closeSubTaskModal">
    <div class="modal-shell">
      <button class="btn modal-close-icon" type="button" @click="closeSubTaskModal" aria-label="关闭">×</button>
      <div class="modal-dialog">
        <div class="modal-head">
          <div>
            <h3 class="modal-title">{{ subTaskModal.view === 'list' ? '子任务列表' : (subTaskModal.mode === 'create' ? '新增子任务' : '编辑子任务') }}</h3>
          </div>
          <div class="modal-actions">
            <button v-if="subTaskModal.view === 'form'" class="btn btn-soft" type="button" @click="subTaskModal.view = 'list'">返回列表</button>
            <button v-if="subTaskModal.view === 'list'" class="btn btn-primary" type="button" @click="openSubTaskForm()">新增子任务</button>
            <button v-if="subTaskModal.view === 'form'" class="btn btn-primary" type="button" :disabled="loading.taskSaving" @click="saveSubTaskDraft">
              {{ loading.taskSaving ? '保存中...' : '保存子任务' }}
            </button>
          </div>
        </div>

        <div v-if="subTaskModal.view === 'list'" class="modal-list">
          <div v-if="!selectedMainTask?.subTasks.length" class="empty-state">
            <strong>当前主任务还没有子任务</strong>
            <p class="empty-note">点击右上角“新增子任务”开始配置。</p>
          </div>
          <div v-else class="table-wrap">
            <table class="main-task-table storage-list-table">
              <colgroup>
                <col style="width: 28%" />
                <col style="width: 22%" />
                <col style="width: 14%" />
                <col style="width: 14%" />
                <col style="width: 22%" />
              </colgroup>
              <thead>
                <tr>
                  <th>节点名称</th>
                  <th>节点编码</th>
                  <th>请求方式</th>
                  <th>任务顺序</th>
                  <th class="table-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in selectedMainTask?.subTasks || []" :key="item.id">
                  <td>{{ item.nodeName || `未命名子任务 ${index + 1}` }}</td>
                  <td>{{ item.nodeCode || '-' }}</td>
                  <td><span class="status-chip status-realtime">{{ item.requestMethod || '-' }}</span></td>
                  <td>{{ item.order || '-' }}</td>
                  <td class="table-actions">
                    <div class="inline-actions">
                      <button class="btn btn-secondary" type="button" @click="openSubTaskForm(item.id)">修改</button>
                      <button class="ghost-btn" type="button" @click="removeSubTaskById(item.id)">删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="modal-stack">
          <section class="section-card">
            <div class="field-grid columns-3">
              <div class="field">
                <label>子任务名称</label>
                <input v-model="subTaskModal.draft.nodeName" />
              </div>
              <div class="field">
                <label>子任务编码</label>
                <input v-model="subTaskModal.draft.nodeCode" />
              </div>
              <div class="field">
                <label>执行顺序</label>
                <input v-model="subTaskModal.draft.order" />
              </div>
              <div class="field span-2">
                <label>请求地址</label>
                <input v-model="subTaskModal.draft.requestUrl" />
              </div>
              <div class="field">
                <label>请求方式</label>
                <input v-model="subTaskModal.draft.requestMethod" />
              </div>
              <div class="field">
                <label>请求类型</label>
                <select v-model="subTaskModal.draft.requestType">
                  <option v-for="option in requestTypeOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>响应格式</label>
                <input v-model="subTaskModal.draft.responseFormat" />
              </div>
              <div class="field">
                <label>提交格式</label>
                <input v-model="subTaskModal.draft.submitFormat" />
              </div>
              <div class="field">
                <label>文件后缀</label>
                <input v-model="subTaskModal.draft.fileSuffix" />
              </div>
              <div class="field span-2">
                <label>登录成功脚本</label>
                <textarea v-model="subTaskModal.draft.loginSuccessJs"></textarea>
              </div>
              <div class="field span-2">
                <label>解析脚本</label>
                <textarea v-model="subTaskModal.draft.parserScript"></textarea>
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <div><h3>请求参数</h3></div>
              <div class="inline-actions">
                <button class="btn btn-soft" type="button" @click="addSubTaskRequestParam">新增请求参数</button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>参数名</th>
                    <th>参数值</th>
                    <th>编码方式</th>
                    <th>参数类型</th>
                    <th>参数脚本</th>
                    <th class="table-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!subTaskModal.draft.requestParams.length">
                    <td colspan="6">暂无请求参数</td>
                  </tr>
                  <tr v-for="row in subTaskModal.draft.requestParams" :key="row.id">
                    <td><input v-model="row.paramName" /></td>
                    <td><input v-model="row.paramValue" /></td>
                    <td><input v-model="row.paramEncodeType" /></td>
                    <td>
                      <select v-model="row.paramType">
                        <option v-for="option in paramTypeOptions" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </td>
                    <td><textarea v-model="row.paramScript"></textarea></td>
                    <td class="table-actions">
                      <button class="ghost-btn" type="button" @click="removeSubTaskRequestParam(row.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <div><h3>结果映射</h3></div>
              <div class="inline-actions">
                <button class="btn btn-soft" type="button" @click="addSubTaskResultConfig">新增结果映射</button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>系统字段</th>
                    <th>页面字段</th>
                    <th>结果脚本</th>
                    <th class="table-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!subTaskModal.draft.resultConfigs.length">
                    <td colspan="4">暂无结果映射</td>
                  </tr>
                  <tr v-for="row in subTaskModal.draft.resultConfigs" :key="row.id">
                    <td><input v-model="row.systemField" /></td>
                    <td><input v-model="row.pageField" /></td>
                    <td><textarea v-model="row.resultScript"></textarea></td>
                    <td class="table-actions">
                      <button class="ghost-btn" type="button" @click="removeSubTaskResultConfig(row.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" :class="{ open: storageModal.open }" @click.self="closeStorageModal">
    <div class="modal-shell">
      <button class="btn modal-close-icon" type="button" @click="closeStorageModal" aria-label="关闭">×</button>
      <div class="modal-dialog">
        <div class="modal-head">
          <div>
            <h3 class="modal-title">{{ storageModal.view === 'list' ? '入库配置列表' : (storageModal.mode === 'create' ? '新增入库配置' : '编辑入库配置') }}</h3>
            <p class="section-desc">入库配置和因子映射会直接保存到当前主任务下。</p>
          </div>
          <div class="modal-actions">
            <button v-if="storageModal.view === 'form'" class="btn btn-soft" type="button" @click="storageModal.view = 'list'">返回列表</button>
            <button v-if="storageModal.view === 'list'" class="btn btn-secondary" type="button" @click="openStorageForm()">新增入库配置</button>
            <button v-if="storageModal.view === 'form'" class="btn btn-primary" type="button" :disabled="loading.taskSaving" @click="saveStorageDraft">
              {{ loading.taskSaving ? '保存中...' : '保存入库配置' }}
            </button>
          </div>
        </div>

        <div v-if="storageModal.view === 'list'" class="modal-list">
          <div v-if="!selectedMainTask?.storageConfigs.length" class="empty-state">
            <strong>当前主任务还没有入库配置</strong>
            <p class="empty-note">点击右上角“新增入库配置”开始配置。</p>
          </div>
          <div v-else class="table-wrap">
            <table class="main-task-table storage-list-table">
              <colgroup>
                <col style="width: 20%" />
                <col style="width: 18%" />
                <col style="width: 16%" />
                <col style="width: 16%" />
                <col style="width: 14%" />
                <col style="width: 16%" />
              </colgroup>
              <thead>
                <tr>
                  <th>租户编号</th>
                  <th>监测数据类型</th>
                  <th>时间类型</th>
                  <th>审核状态</th>
                  <th>属性类型</th>
                  <th class="table-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedMainTask?.storageConfigs || []" :key="item.id">
                  <td>{{ item.tenantNo || '--' }}</td>
                  <td>{{ item.monitorType || '--' }}</td>
                  <td>{{ item.timeType || '--' }}</td>
                  <td>{{ item.auditStatus || '--' }}</td>
                  <td>{{ item.propertyType || '--' }}</td>
                  <td class="table-actions">
                    <div class="inline-actions">
                      <button class="btn btn-secondary" type="button" @click="openStorageForm(item.id)">修改</button>
                      <button class="ghost-btn" type="button" @click="removeStorageById(item.id)">删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="modal-stack">
          <section class="section-card">
            <div class="field-grid columns-3">
              <div class="field">
                <label>租户编号</label>
                <input v-model="storageModal.draft.tenantNo" />
              </div>
              <div class="field">
                <label>是否预报</label>
                <select v-model="storageModal.draft.forecastFlag">
                  <option v-for="option in yesNoOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>监测类型</label>
                <select v-model="storageModal.draft.monitorType">
                  <option v-for="option in monitorTypeOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>时间类型</label>
                <select v-model="storageModal.draft.timeType">
                  <option v-for="option in timeTypeOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>数据类型</label>
                <select v-model="storageModal.draft.dataType">
                  <option v-for="option in dataTypeOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>审核状态</label>
                <select v-model="storageModal.draft.auditStatus">
                  <option v-for="option in auditStatusOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field">
                <label>属性类型</label>
                <select v-model="storageModal.draft.propertyType">
                  <option v-for="option in attributeTypeOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="field span-2">
                <label>数据来源</label>
                <input v-model="storageModal.draft.dataSource" />
              </div>
              <div class="field">
                <label>数据集</label>
                <input v-model="storageModal.draft.dataset" />
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <div><h3>因子配置</h3></div>
              <div class="inline-actions">
                <button class="btn btn-soft" type="button" @click="addStorageFactor">新增因子</button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>因子编码</th>
                    <th>字段映射</th>
                    <th>时间字段</th>
                    <th>区域编码</th>
                    <th class="table-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!storageModal.draft.factors.length">
                    <td colspan="5">暂无因子</td>
                  </tr>
                  <tr v-for="row in storageModal.draft.factors" :key="row.id">
                    <td><input v-model="row.factorCode" /></td>
                    <td><input v-model="row.factorValueField" /></td>
                    <td><input v-model="row.dataTimeField" /></td>
                    <td><input v-model="row.regionCodeField" /></td>
                    <td class="table-actions">
                      <button class="ghost-btn" type="button" @click="removeStorageFactor(row.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" :class="{ open: fieldModal.open }" @click.self="closeFieldModal">
    <div class="modal-shell modal-shell--narrow">
      <button class="btn modal-close-icon" type="button" @click="closeFieldModal" aria-label="关闭">×</button>
      <div class="modal-dialog">
        <div class="modal-head">
          <div>
            <h3 class="modal-title">{{ fieldModal.mode === 'create' ? '新增字段配置' : '编辑字段配置' }}</h3>
          </div>
          <div class="modal-actions">
            <button class="btn btn-soft" type="button" @click="closeFieldModal">取消</button>
            <button class="btn btn-primary" type="button" :disabled="loading.fieldSaving" @click="saveFieldDraft">
              {{ loading.fieldSaving ? '保存中...' : '保存字段' }}
            </button>
          </div>
        </div>

        <div class="field-grid columns-3">
          <div class="field">
            <label>租户编号</label>
            <input v-model="fieldModal.draft.tenantId" />
          </div>
          <div class="field">
            <label>类型</label>
            <select v-model="fieldModal.draft.fieldType">
              <option v-for="option in fieldTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <div class="field">
            <label>网站参数编号</label>
            <input v-model="fieldModal.draft.siteParamCode" />
          </div>
          <div class="field">
            <label>网站数据编号</label>
            <input v-model="fieldModal.draft.siteDataCode" />
          </div>
          <div class="field">
            <label>系统编号</label>
            <input v-model="fieldModal.draft.systemCode" />
          </div>
          <div class="field">
            <label>系统名称</label>
            <input v-model="fieldModal.draft.systemName" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" :class="{ open: componentModal.open }" @click.self="closeComponentModal">
    <div class="modal-shell modal-shell--narrow">
      <button class="btn modal-close-icon" type="button" @click="closeComponentModal" aria-label="关闭">×</button>
      <div class="modal-dialog">
        <div class="modal-head">
          <div>
            <h3 class="modal-title">{{ componentModal.mode === 'create' ? '新增组件配置' : '编辑组件配置' }}</h3>
          </div>
          <div class="modal-actions">
            <button class="btn btn-soft" type="button" @click="closeComponentModal">取消</button>
            <button class="btn btn-primary" type="button" :disabled="loading.componentSaving" @click="saveComponentDraft">
              {{ loading.componentSaving ? '保存中...' : '保存组件' }}
            </button>
          </div>
        </div>

        <div class="field-grid columns-3 component-form-grid">
          <div class="field component-name-field">
            <label>名称</label>
            <input v-model="componentModal.draft.componentName" />
          </div>
          <div class="field component-code-field">
            <label>编号</label>
            <input v-model="componentModal.draft.componentCode" />
          </div>
          <div class="field component-entity-field">
            <label>实体类名</label>
            <input v-model="componentModal.draft.componentConfig" />
          </div>
          <div class="field component-type-field">
            <label>类型</label>
            <select v-model="componentModal.draft.componentType">
              <option v-for="option in componentTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <div class="field component-setting-field span-2">
            <label>配置</label>
            <textarea v-model="componentModal.draft.componentSetting"></textarea>
          </div>
          <div class="field">
            <label>排序</label>
            <input v-model="componentModal.draft.componentOrder" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
