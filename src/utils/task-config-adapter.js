const YES = '是'
const NO = '否'
const STATUS_ENABLED = '启用'
const STATUS_DISABLED = '停用'

const REQUEST_TYPE_MAP = {
  普通请求: 'NORMAL',
  登录请求: 'LOGIN',
}

const REQUEST_TYPE_REVERSE_MAP = {
  NORMAL: '普通请求',
  LOGIN: '登录请求',
}

const PARAM_TYPE_MAP = {
  变量: 0,
  主体: 1,
  头部: 2,
}

const PARAM_TYPE_REVERSE_MAP = {
  0: '变量',
  1: '主体',
  2: '头部',
}

const FIELD_TYPE_MAP = {
  站点: 1,
  区域: 2,
}

const FIELD_TYPE_REVERSE_MAP = {
  1: '站点',
  2: '区域',
}

const MONITOR_TYPE_MAP = {
  六参: 1,
  气象: 2,
}

const MONITOR_TYPE_REVERSE_MAP = {
  1: '六参',
  2: '气象',
}

const TIME_TYPE_MAP = {
  小时: '10',
  天: '20',
  '5分钟': '30',
  月: '40',
  分钟: '50',
}

const TIME_TYPE_REVERSE_MAP = {
  10: '小时',
  20: '天',
  30: '5分钟',
  40: '月',
  50: '分钟',
}

const DATA_TYPE_MAP = {
  标准: '0',
  实况: '1',
  不区分: '2',
}

const DATA_TYPE_REVERSE_MAP = {
  0: '标准',
  1: '实况',
  10: '标准',
  2: '不区分',
}

const CHECK_STATUS_MAP = {
  原始: '10',
  审核: '20',
}

const CHECK_STATUS_REVERSE_MAP = {
  10: '原始',
  20: '审核',
}

const ATTRIBUTE_TYPE_MAP = {
  站点: '1',
  区域: '2',
}

const ATTRIBUTE_TYPE_REVERSE_MAP = {
  0: '站点',
  1: '站点',
  2: '区域',
}

const COMPONENT_TYPE_MAP = {
  校验: '1',
  计算: '2',
}

const COMPONENT_TYPE_REVERSE_MAP = {
  1: '校验',
  2: '计算',
}

export const statusOptions = [STATUS_ENABLED, STATUS_DISABLED]
export const yesNoOptions = [YES, NO]
export const requestTypeOptions = ['普通请求', '登录请求']
export const paramTypeOptions = ['变量', '主体', '头部']
export const fieldTypeOptions = ['站点', '区域']
export const monitorTypeOptions = ['六参', '气象']
export const timeTypeOptions = ['小时', '天', '5分钟', '月', '分钟']
export const dataTypeOptions = ['标准', '实况', '不区分']
export const auditStatusOptions = ['原始', '审核']
export const attributeTypeOptions = ['站点', '区域']
export const componentTypeOptions = ['校验', '计算']

export {
  YES,
  NO,
  STATUS_ENABLED,
  STATUS_DISABLED,
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeString(value) {
  return value == null ? '' : String(value)
}

function fromMap(reverseMap, value, fallback = '') {
  if (value == null || value === '') {
    return fallback
  }
  return reverseMap[String(value)] || String(value)
}

function toMappedValue(map, value, fallback = null) {
  if (value == null || value === '') {
    return fallback
  }
  return map[value] ?? value
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function formatDateTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function createLoopRule(values = {}) {
  return {
    id: values.id || uid('loop'),
    loopParam: values.loopParam || '',
    loopValue: values.loopValue || '',
    loopScript: values.loopScript || '',
  }
}

export function createRequestParam(values = {}) {
  return {
    id: values.id || uid('req'),
    paramName: values.paramName || '',
    paramValue: values.paramValue || '',
    paramEncodeType: values.paramEncodeType || '',
    paramType: values.paramType || '主体',
    paramScript: values.paramScript || '',
  }
}

export function createResultConfig(values = {}) {
  return {
    id: values.id || uid('res'),
    systemField: values.systemField || '',
    pageField: values.pageField || '',
    resultScript: values.resultScript || '',
  }
}

export function createFactor(values = {}) {
  return {
    id: values.id || uid('fac'),
    factorCode: values.factorCode || '',
    factorName: values.factorName || '',
    factorValueField: values.factorValueField || '',
    factorStatus: values.factorStatus || 'N',
    factorMw: values.factorMw || '',
    deviceCodeField: values.deviceCodeField || '',
    dataTimeField: values.dataTimeField || '',
    regionCodeField: values.regionCodeField || '',
  }
}

export function createComponent(values = {}) {
  return {
    id: values.id || uid('cmp'),
    componentCode: values.componentCode || '',
    componentName: values.componentName || '',
    componentConfig: values.componentConfig || '',
    componentSetting: values.componentSetting || '',
    componentType: values.componentType || '',
    componentOrder: values.componentOrder || '',
  }
}

export function createFieldConfig(values = {}) {
  return {
    id: values.id || uid('fld'),
    tenantId: values.tenantId || '',
    fieldType: values.fieldType || '站点',
    siteParamCode: values.siteParamCode || '',
    siteDataCode: values.siteDataCode || '',
    systemCode: values.systemCode || '',
    systemName: values.systemName || '',
  }
}

export function createSubTask(values = {}) {
  return {
    id: values.id || uid('sub'),
    nodeName: values.nodeName || '',
    nodeCode: values.nodeCode || '',
    requestUrl: values.requestUrl || '',
    requestMethod: values.requestMethod || 'POST',
    responseFormat: values.responseFormat || 'JSON',
    submitFormat: values.submitFormat || 'JSON',
    requestType: values.requestType || '普通请求',
    captchaUrl: values.captchaUrl || '',
    captchaParams: values.captchaParams || '',
    encodeField: values.encodeField || '',
    loginSuccessJs: values.loginSuccessJs || '',
    fileSuffix: values.fileSuffix || '',
    order: values.order || '',
    parserScript: values.parserScript || '',
    requestParams: (values.requestParams || []).map(createRequestParam),
    resultConfigs: (values.resultConfigs || []).map(createResultConfig),
  }
}

export function createStorage(values = {}) {
  return {
    id: values.id || uid('store'),
    storageName: values.storageName || '',
    forecastFlag: values.forecastFlag || NO,
    monitorType: values.monitorType || '六参',
    timeType: values.timeType || '小时',
    tenantNo: values.tenantNo || '',
    dataType: values.dataType || '标准',
    auditStatus: values.auditStatus || '原始',
    dataSource: values.dataSource || '',
    propertyType: values.propertyType || '站点',
    dataset: values.dataset || '',
    factors: (values.factors || []).map(createFactor),
    components: (values.components || []).map(createComponent),
  }
}

export function createTask(values = {}) {
  const loopItemsSource = values.loopSettings?.loopItems || []
  return {
    id: values.id || uid('task'),
    taskName: values.taskName || '',
    taskCode: values.taskCode || '',
    taskStatus: values.taskStatus || STATUS_ENABLED,
    dataSource: values.dataSource || '',
    realtimeData: values.realtimeData || NO,
    district: values.district ?? '',
    mass: values.mass ?? '',
    loopEnabled: values.loopEnabled || NO,
    loopSettings: {
      startNode: values.loopSettings?.startNode ?? '',
      endNode: values.loopSettings?.endNode ?? '',
      loopParam: values.loopSettings?.loopParam ?? '',
      loopValue: values.loopSettings?.loopValue ?? '',
      loopScript: values.loopSettings?.loopScript ?? '',
      loopItems: loopItemsSource.map(createLoopRule),
    },
    subTasks: (values.subTasks || []).map(createSubTask),
    storageConfigs: (values.storageConfigs || []).map(createStorage),
    __detailLoaded: values.__detailLoaded ?? false,
    createTime: values.createTime || '',
    updateTime: values.updateTime || '',
  }
}

function mapBooleanLabel(value) {
  if (value === YES || value === '1' || value === 1 || value === true) {
    return YES
  }
  return NO
}

function mapTaskStatus(value) {
  return Number(value) === 1 || value === STATUS_ENABLED ? STATUS_ENABLED : STATUS_DISABLED
}

function toLegacyLoop(loopRule = {}) {
  const loopItems = (loopRule.loopParams || []).map((item) =>
    createLoopRule({
      id: item.loopParamId || '',
      loopParam: normalizeString(item.loopParamName),
      loopValue: normalizeString(item.loopParamValue),
      loopScript: normalizeString(item.loopParamJs),
    }),
  )

  const firstLoop = loopItems[0] || {}
  return {
    startNode: loopRule.startNode ?? '',
    endNode: loopRule.endNode ?? '',
    loopParam: firstLoop.loopParam || '',
    loopValue: firstLoop.loopValue || '',
    loopScript: firstLoop.loopScript || '',
    loopItems,
  }
}

function toLegacySubTask(item = {}) {
  return createSubTask({
    id: item.nodeId || '',
    nodeName: normalizeString(item.nodeName),
    nodeCode: normalizeString(item.nodeCode),
    requestUrl: normalizeString(item.nodeUrl),
    requestMethod: normalizeString(item.nodeRequestMethod || 'POST'),
    responseFormat: normalizeString(item.nodeResultType || 'JSON'),
    submitFormat: normalizeString(item.nodeSubmitType || 'JSON'),
    requestType: REQUEST_TYPE_REVERSE_MAP[item.nodeRequestType] || '普通请求',
    captchaUrl: normalizeString(item.verifyCode?.url),
    captchaParams: normalizeString(item.verifyCode?.paramName),
    encodeField: normalizeString(item.verifyCode?.paramEncodeType),
    loginSuccessJs: normalizeString(item.loginSuccessJs),
    fileSuffix: normalizeString(item.nodeFileSuffix),
    order: item.nodeOrder ?? '',
    parserScript: normalizeString(item.resultJs),
    requestParams: (item.requestParams || []).map((param) =>
      createRequestParam({
        id: param.paramId || '',
        paramName: normalizeString(param.paramName),
        paramValue: normalizeString(param.paramValue),
        paramEncodeType: normalizeString(param.paramEncodeType),
        paramType: fromMap(PARAM_TYPE_REVERSE_MAP, param.paramType, '主体'),
        paramScript: normalizeString(param.paramJsFunction),
      }),
    ),
    resultConfigs: (item.resultConfigs || []).map((result) =>
      createResultConfig({
        id: result.resultId || '',
        systemField: normalizeString(result.resultName),
        pageField: normalizeString(result.resultValue),
        resultScript: normalizeString(result.resultJs),
      }),
    ),
  })
}

function toLegacyStorage(item = {}) {
  return createStorage({
    id: item.accessId || '',
    storageName: normalizeString(item.dataCollection || item.tenantCode || '入库配置'),
    forecastFlag: mapBooleanLabel(item.isForecast),
    monitorType: fromMap(MONITOR_TYPE_REVERSE_MAP, item.monitorType, '六参'),
    timeType: fromMap(TIME_TYPE_REVERSE_MAP, item.timeType, '小时'),
    tenantNo: normalizeString(item.tenantCode),
    dataType: fromMap(DATA_TYPE_REVERSE_MAP, item.dataType, '标准'),
    auditStatus: fromMap(CHECK_STATUS_REVERSE_MAP, item.checkStatus, '原始'),
    dataSource: normalizeString(item.collectionSource),
    propertyType: fromMap(ATTRIBUTE_TYPE_REVERSE_MAP, item.attributeType, '站点'),
    dataset: normalizeString(item.dataCollection),
    factors: (item.factors || []).map((factor) =>
      createFactor({
        id: factor.factorId || '',
        factorCode: normalizeString(factor.factorCode),
        factorName: normalizeString(factor.factorName),
        factorValueField: normalizeString(factor.factorValue),
        factorStatus: normalizeString(factor.factorStatus),
        factorMw: normalizeString(factor.factorMw),
        deviceCodeField: normalizeString(factor.deviceCode),
        dataTimeField: normalizeString(factor.datatime),
        regionCodeField: normalizeString(factor.attributeCode),
      }),
    ),
    components: (item.components || []).map((component) =>
      createComponent({
        id: component.componentId || '',
        componentCode: normalizeString(component.componentCode),
        componentName: normalizeString(component.componentName),
        componentConfig: normalizeString(component.componentBean),
        componentSetting: normalizeString(component.componentConfig),
        componentType: fromMap(COMPONENT_TYPE_REVERSE_MAP, component.componentType, ''),
        componentOrder: component.componentSort ?? '',
      }),
    ),
  })
}

export function toTaskSummary(summary = {}) {
  return createTask({
    id: summary.taskId || '',
    taskName: normalizeString(summary.taskName),
    taskCode: normalizeString(summary.taskCode),
    taskStatus: mapTaskStatus(summary.taskStatus),
    dataSource: normalizeString(summary.dataSource),
    realtimeData: mapBooleanLabel(summary.actual),
    __detailLoaded: false,
  })
}

export function toTaskDetail(summary = {}, detail = {}) {
  const task = detail.task || {}
  const loopSettings = toLegacyLoop(detail.loopRule || {})
  const hasLoop =
    loopSettings.startNode !== '' ||
    loopSettings.endNode !== '' ||
    (loopSettings.loopItems && loopSettings.loopItems.length > 0)

  return createTask({
    id: task.taskId || summary.taskId || '',
    taskName: normalizeString(task.taskName || summary.taskName),
    taskCode: normalizeString(task.taskCode || summary.taskCode),
    taskStatus: mapTaskStatus(task.taskStatus ?? summary.taskStatus),
    dataSource: normalizeString(task.dataSource || summary.dataSource),
    realtimeData: mapBooleanLabel(task.actual ?? summary.actual),
    district: task.district ?? '',
    mass: task.mass ?? '',
    loopEnabled: hasLoop ? YES : NO,
    loopSettings,
    subTasks: (detail.subTasks || []).map(toLegacySubTask),
    storageConfigs: (detail.accessModels || []).map(toLegacyStorage),
    __detailLoaded: true,
    createTime: task.createTime || '',
    updateTime: task.updateTime || '',
  })
}

export function toFieldConfig(item = {}) {
  return createFieldConfig({
    id: item.correctId != null ? String(item.correctId) : '',
    tenantId: normalizeString(item.tenantCode),
    fieldType: fromMap(FIELD_TYPE_REVERSE_MAP, item.type, '站点'),
    siteParamCode: normalizeString(item.paramCode),
    siteDataCode: normalizeString(item.crawlCode),
    systemCode: normalizeString(item.attributeCode),
    systemName: normalizeString(item.attributeName),
  })
}

function isPersistedTaskId(id) {
  return typeof id === 'string' && id.length === 32 && !id.startsWith('task_')
}

function isPersistedChildId(id) {
  return typeof id === 'string' && id.length > 0 && !id.includes('_')
}

function isPersistedFieldId(id) {
  return /^\d+$/.test(String(id || ''))
}

export function toTaskPayload(task = {}) {
  const loopItems = task.loopEnabled === YES ? task.loopSettings?.loopItems || [] : []

  return {
    task: {
      taskId: isPersistedTaskId(task.id) ? task.id : null,
      taskName: normalizeString(task.taskName),
      taskCode: normalizeString(task.taskCode),
      taskStatus: task.taskStatus === STATUS_ENABLED ? 1 : 0,
      dataSource: normalizeString(task.dataSource),
      actual: task.realtimeData === YES ? 1 : 0,
      district: task.district !== '' && task.district != null ? Number(task.district) : null,
      mass: task.mass !== '' && task.mass != null ? Number(task.mass) : null,
    },
    loopRule: {
      startNode: task.loopEnabled === YES && task.loopSettings?.startNode !== '' ? Number(task.loopSettings.startNode) : null,
      endNode: task.loopEnabled === YES && task.loopSettings?.endNode !== '' ? Number(task.loopSettings.endNode) : null,
      loopParams: loopItems.map((item) => ({
        loopParamId: isPersistedChildId(item.id) ? item.id : null,
        loopParamName: normalizeString(item.loopParam),
        loopParamValue: normalizeString(item.loopValue),
        loopParamJs: normalizeString(item.loopScript),
      })),
    },
    subTasks: (task.subTasks || []).map((subTask) => ({
      nodeId: isPersistedChildId(subTask.id) ? subTask.id : null,
      nodeName: normalizeString(subTask.nodeName),
      nodeCode: normalizeString(subTask.nodeCode),
      nodeUrl: normalizeString(subTask.requestUrl),
      nodeRequestMethod: normalizeString(subTask.requestMethod || 'POST'),
      nodeResultType: normalizeString(subTask.responseFormat || 'JSON'),
      nodeSubmitType: normalizeString(subTask.submitFormat || 'JSON'),
      nodeRequestType: REQUEST_TYPE_MAP[subTask.requestType] || normalizeString(subTask.requestType || 'NORMAL'),
      loginSuccessJs: normalizeString(subTask.loginSuccessJs),
      nodeOrder: subTask.order !== '' && subTask.order != null ? Number(subTask.order) : null,
      nodeFileSuffix: normalizeString(subTask.fileSuffix),
      resultJs: normalizeString(subTask.parserScript),
      verifyCode: {
        verifyCodeId: null,
        url: normalizeString(subTask.captchaUrl),
        paramName: normalizeString(subTask.captchaParams),
        paramEncodeType: normalizeString(subTask.encodeField),
        type: '',
      },
      requestParams: (subTask.requestParams || []).map((param) => ({
        paramId: isPersistedChildId(param.id) ? param.id : null,
        paramName: normalizeString(param.paramName),
        paramValue: normalizeString(param.paramValue),
        paramEncodeType: normalizeString(param.paramEncodeType),
        paramType: PARAM_TYPE_MAP[param.paramType] ?? 1,
        paramJsFunction: normalizeString(param.paramScript),
      })),
      resultConfigs: (subTask.resultConfigs || []).map((result) => ({
        resultId: isPersistedChildId(result.id) ? result.id : null,
        resultName: normalizeString(result.systemField),
        resultValue: normalizeString(result.pageField),
        resultJs: normalizeString(result.resultScript),
      })),
    })),
    accessModels: (task.storageConfigs || []).map((storage, index) => ({
      accessId: isPersistedChildId(storage.id) ? storage.id : null,
      taskId: isPersistedTaskId(task.id) ? task.id : null,
      isForecast: storage.forecastFlag === YES ? '1' : '0',
      monitorType: Number(toMappedValue(MONITOR_TYPE_MAP, storage.monitorType, null)),
      timeType: normalizeString(toMappedValue(TIME_TYPE_MAP, storage.timeType, '10')),
      tenantCode: normalizeString(storage.tenantNo),
      dataType: normalizeString(toMappedValue(DATA_TYPE_MAP, storage.dataType, '0')),
      checkStatus: normalizeString(toMappedValue(CHECK_STATUS_MAP, storage.auditStatus, '10')),
      collectionSource: normalizeString(storage.dataSource),
      attributeType: normalizeString(toMappedValue(ATTRIBUTE_TYPE_MAP, storage.propertyType, '1')),
      dataCollection: normalizeString(storage.dataset || storage.storageName),
      factors: (storage.factors || []).map((factor) => ({
        factorId: isPersistedChildId(factor.id) ? factor.id : null,
        factorCode: normalizeString(factor.factorCode),
        factorName: normalizeString(factor.factorName),
        factorValue: normalizeString(factor.factorValueField),
        factorStatus: normalizeString(factor.factorStatus || 'N'),
        factorMw: factor.factorMw !== '' && factor.factorMw != null ? Number(factor.factorMw) : null,
        deviceCode: normalizeString(factor.deviceCodeField),
        datatime: normalizeString(factor.dataTimeField),
        attributeCode: normalizeString(factor.regionCodeField),
      })),
      components: (storage.components || []).map((component, componentIndex) => ({
        componentId: isPersistedChildId(component.id) ? component.id : null,
        componentCode: normalizeString(component.componentCode),
        componentName: normalizeString(component.componentName),
        componentBean: normalizeString(component.componentConfig),
        componentConfig: normalizeString(component.componentSetting),
        componentType: normalizeString(toMappedValue(COMPONENT_TYPE_MAP, component.componentType, '2')),
        componentSort: component.componentOrder !== '' && component.componentOrder != null
          ? Number(component.componentOrder)
          : componentIndex + 1,
      })),
      storageSort: index + 1,
    })),
  }
}

export function toFieldPayload(field = {}) {
  return {
    correctId: isPersistedFieldId(field.id) ? Number(field.id) : null,
    tenantCode: normalizeString(field.tenantId),
    type: FIELD_TYPE_MAP[field.fieldType] ?? 1,
    paramCode: normalizeString(field.siteParamCode),
    crawlCode: normalizeString(field.siteDataCode),
    attributeCode: normalizeString(field.systemCode),
    attributeName: normalizeString(field.systemName),
  }
}

export function toComponentPayload(component = {}) {
  return {
    componentId: isPersistedChildId(component.id) ? component.id : null,
    componentCode: normalizeString(component.componentCode),
    componentName: normalizeString(component.componentName),
    componentBean: normalizeString(component.componentConfig),
    componentConfig: normalizeString(component.componentSetting),
    componentType: normalizeString(toMappedValue(COMPONENT_TYPE_MAP, component.componentType, '2')),
    componentSort: component.componentOrder !== '' && component.componentOrder != null
      ? Number(component.componentOrder)
      : null,
  }
}

export function getSubTaskDisplayName(item, index = 0) {
  return item?.nodeName || item?.nodeCode || `未命名子任务 ${index + 1}`
}

export function getStorageDisplayName(item, index = 0) {
  return item?.dataset || item?.tenantNo || item?.storageName || `未命名入库配置 ${index + 1}`
}

export function getComponentDisplayName(item, index = 0) {
  return item?.componentName || item?.componentCode || `未命名组件 ${index + 1}`
}
