import axios from 'axios'

export const apiClient = axios.create({
  baseURL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'http://127.0.0.1:8000/api',
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
})

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error?.message
    if (typeof apiMessage === 'string' && apiMessage.length > 0) {
      return apiMessage
    }

    if (error.code === 'ECONNABORTED') {
      return 'The API request timed out. Check that the local backend is running and try again.'
    }

    if (!error.response) {
      return 'The API could not be reached. Check that the local backend is running.'
    }

    return `The API request failed with status ${error.response.status}.`
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'An unexpected error occurred.'
}
