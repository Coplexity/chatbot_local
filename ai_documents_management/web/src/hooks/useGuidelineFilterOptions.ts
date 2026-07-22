import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { GuidelineFilterOptionsResponse } from '../lib/types'

const EMPTY_OPTIONS: GuidelineFilterOptionsResponse = {
  loai_van_bans: [],
  don_vi_ban_hanhs: [],
  chu_des: [],
  authors: [],
}

export default function useGuidelineFilterOptions() {
  const [options, setOptions] = useState<GuidelineFilterOptionsResponse>(EMPTY_OPTIONS)

  const fetchOptions = useCallback(async () => {
    try {
      const response = await api.get<GuidelineFilterOptionsResponse>('/guidelines/filter-options')
      setOptions({
        loai_van_bans: response.data.loai_van_bans,
        don_vi_ban_hanhs: response.data.don_vi_ban_hanhs,
        chu_des: response.data.chu_des,
        authors: response.data.authors,
      })
    } catch (error) {
      console.error('Failed to fetch guideline filter options:', error)
    }
  }, [])

  useEffect(() => {
    void fetchOptions()
  }, [fetchOptions])

  return options
}

