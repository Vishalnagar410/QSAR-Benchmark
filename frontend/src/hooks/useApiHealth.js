import { useEffect, useState } from 'react'
import { apiClient } from '../api/client.js'

export default function useApiHealth() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true

    apiClient
      .get('/health')
      .then(({ data }) => {
        if (
          data?.status !== 'ok' ||
          typeof data.application_version !== 'string'
        ) {
          throw new Error('The API returned an unexpected health response.')
        }
        if (active) setStatus('connected')
      })
      .catch(() => {
        if (active) setStatus('unavailable')
      })

    return () => {
      active = false
    }
  }, [])

  return status
}
