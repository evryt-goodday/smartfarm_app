import iziToast from 'izitoast'
import 'izitoast/dist/css/iziToast.min.css'

// 기본 설정
const defaultOptions = {
  position: 'bottomRight',
  timeout: 3000,
  closeOnClick: true,
}

export const toast = {
  success(message, title = '성공', options = {}) {
    iziToast.success({
      title,
      message,
      ...defaultOptions,
      ...options,
    })
  },

  error(message, title = '오류', options = {}) {
    iziToast.error({
      title,
      message,
      ...defaultOptions,
      ...options,
    })
  },

  warning(message, title = '경고', options = {}) {
    iziToast.warning({
      title,
      message,
      ...defaultOptions,
      ...options,
    })
  },

  info(message, title = '정보', options = {}) {
    iziToast.info({
      title,
      message,
      ...defaultOptions,
      ...options,
    })
  },

  // 하우스 선택 전용 토스트
  houseSelected(houseName, customMessage) {
    const message = customMessage || `${houseName} 하우스가 선택되었습니다.`
    this.success(message, '하우스 선택')
  },

  // 하우스 관련 일반 토스트
  house(houseName, action, customMessage) {
    let title = '하우스 정보'
    let defaultMessage = `${houseName} 하우스`
    let type = 'info'

    switch (action) {
      case 'select':
        title = '하우스 선택'
        defaultMessage = `${houseName} 하우스가 선택되었습니다.`
        type = 'success'
        break
      case 'create':
        title = '하우스 생성'
        defaultMessage = `${houseName} 하우스가 생성되었습니다.`
        type = 'success'
        break
      case 'update':
        title = '하우스 업데이트'
        defaultMessage = `${houseName} 하우스가 업데이트되었습니다.`
        type = 'info'
        break
      case 'delete':
        title = '하우스 삭제'
        defaultMessage = `${houseName} 하우스가 삭제되었습니다.`
        type = 'warning'
        break
      case 'error':
        title = '하우스 오류'
        defaultMessage = `${houseName} 하우스에 오류가 발생했습니다.`
        type = 'error'
        break
    }

    const message = customMessage || defaultMessage
    this[type](message, title)
  },

  // 일반 항목 선택 토스트
  itemSelected(itemName, customMessage) {
    const message = customMessage || `${itemName} 선택 완료되었습니다.`
    this.success(message, '선택 완료')
  },

  // 데이터 조회 관련 토스트
  dataQuery(queryType, customMessage) {
    let title = '데이터 조회'
    let defaultMessage = '데이터가 조회 됩니다.'

    switch (queryType) {
      case 'hourly':
        defaultMessage = '시간별 데이터가 조회 됩니다.'
        break
      case 'daily':
        defaultMessage = '월간 데이터가 조회 됩니다.'
        break
      case 'monthly':
        defaultMessage = '연간 데이터가 조회 됩니다.'
        break
      case 'realtime':
        defaultMessage = '실시간 데이터가 조회 됩니다.'
        break
    }

    const message = customMessage || defaultMessage
    this.info(message, title)
  },

  // 완전 커스텀 토스트 (어떤 유형의 메시지든 처리 가능)
  custom(type, message, title, options = {}) {
    const toastType = type || 'info'
    if (['success', 'error', 'warning', 'info'].includes(toastType)) {
      this[toastType](message, title, options)
    } else {
      this.info(message, title, options)
    }
  },
}

export default toast
