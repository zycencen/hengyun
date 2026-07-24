import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppContext } from '@/store'
import { getCarList } from '@/api/modules/car'
import { DEFAULT_CARS, DEFAULT_HOURLY_DURATIONS, DEFAULT_DAILY_DURATIONS } from '@/data/defaults'

export function useCars() {
  const { state, dispatch } = useAppContext()
  const [error, setError] = useState<string | null>(null)
  const lastFleetOrgId = useRef(state.fleetOrgId)

  const fetchCars = useCallback(async (fleetOrgId?: string | null) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    setError(null)
    try {
      const data = await getCarList(fleetOrgId)
      dispatch({ type: 'SET_CARS', payload: data.cars })
      dispatch({ type: 'SET_DURATIONS', payload: { hourly: data.hourlyDurations, daily: data.dailyDurations } })
    } catch {
      // 降级：使用默认数据
      dispatch({ type: 'SET_CARS', payload: DEFAULT_CARS })
      dispatch({ type: 'SET_DURATIONS', payload: { hourly: DEFAULT_HOURLY_DURATIONS, daily: DEFAULT_DAILY_DURATIONS } })
      setError('网络异常，使用缓存数据')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch])

  useEffect(() => {
    // fleetOrgId 变化时重新加载车辆列表
    if (lastFleetOrgId.current !== state.fleetOrgId || state.cars.length === 0) {
      lastFleetOrgId.current = state.fleetOrgId
      fetchCars(state.fleetOrgId)
    }
  }, [state.fleetOrgId, state.cars.length, fetchCars])

  return {
    cars: state.cars,
    hourlyDurations: state.hourlyDurations,
    dailyDurations: state.dailyDurations,
    loading: state.loading,
    error,
    refetch: () => fetchCars(state.fleetOrgId),
  }
}
