import axios from 'axios'

// API 기본 URL 설정
const API_BASE_URL = 'http://localhost:3000/api'

// axios 인스턴스 생성
const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30초
  headers: {
    'Content-Type': 'application/json',
  },
})

// 응답 인터셉터 추가
instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 요청 취소 에러는 별도로 처리하지 않고 그대로 반환
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    // 요청이 실패한 경우 에러 로깅
    console.error(
      `API 요청 실패: ${error.config?.url || '알 수 없는 URL'}, 메시지: ${
        error.message
      }, 상태 코드: ${error.response?.status || '없음'}`,
    )

    // 에러 응답이 있는 경우, 사용자 정의 메시지를 포함시킬 수 있음
    if (error.response) {
      const errorMessage =
        error.response.data?.message || error.response.data?.error || '서버 오류가 발생했습니다.'

      console.error('서버 응답 에러:', errorMessage)

      // 요청 설정에 silentError가 설정되어 있지 않은 경우에만 에러 처리
      if (!error.config?.silentError) {
        // 여기서 필요에 따라 토스트 메시지 등 표시 가능
      }
    } else if (error.request) {
      // 요청은 보냈으나 응답을 받지 못한 경우 (네트워크 에러 등)
      console.error('응답을 받지 못했습니다:', error.request)
    }

    return Promise.reject(error)
  },
)

export default instance
