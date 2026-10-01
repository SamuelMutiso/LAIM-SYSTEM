import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { errorMessage } from '../api/client'
import { bumpData, pushToast } from './store'

export function useApi(fn, deps = []) {
  const version = useSelector((s) => s.ui.dataVersion)
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const depsKey = JSON.stringify(deps)
  const lastKey = useRef(depsKey)
  const load = useCallback(() => {
    let live = true
    const sameQuery = lastKey.current === depsKey
    lastKey.current = depsKey
    setState((s) => (sameQuery && s.data !== null ? { ...s, error: null } : { data: null, loading: true, error: null }))
    fnRef
      .current()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((e) => live && setState({ data: null, loading: false, error: errorMessage(e) }))
    return () => {
      live = false
    }

  }, [version, depsKey])
  useEffect(load, [load])
  return { ...state, reload: load }
}

export function useMutation(fn, { success } = {}) {
  const dispatch = useDispatch()
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (...args) => {
      setBusy(true)
      try {
        const data = await fn(...args)
        dispatch(bumpData())
        if (success) dispatch(pushToast(typeof success === 'function' ? success(data) : success))
        return { data }
      } catch (e) {
        return { error: e }
      } finally {
        setBusy(false)
      }
    },
    [fn, success, dispatch],
  )
  return [run, busy]
}
