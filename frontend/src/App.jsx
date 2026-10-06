import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { restoreSession, logout } from './app/store'
import { setSignedOutHandler } from './api/client'
import { Toasts } from './components/ui'
import { LogoMark } from './components/Brand'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Tithe from './pages/Tithe'
import Offering from './pages/Offering'
import Pledges from './pages/Pledges'
import HomeChurch from './pages/HomeChurch'
import Leadership from './pages/Leadership'
import Inventory from './pages/Inventory'
import Activities from './pages/Activities'
import Forms from './pages/Forms'
import Audit from './pages/Audit'
import Reports from './pages/Reports'
import Departments, { DepartmentPage } from './pages/Departments'
import { homeFor } from './lib/utils'


const OFFICE = ['bishop', 'pastor', 'secretary']

function Guard({ roles, children }) {
  const user = useSelector((s) => s.auth.user)
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />
  return children
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-altar-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse rounded-3xl bg-white p-4">
          <LogoMark className="h-16 w-20" />
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-200">LAIM Office</div>
      </div>
    </div>
  )
}

export default function App() {
  const dispatch = useDispatch()
  const status = useSelector((s) => s.auth.status)
  useEffect(() => {
    setSignedOutHandler(() => dispatch(logout()))
    dispatch(restoreSession())
  }, [dispatch])

  if (status === 'restoring') return <Splash />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Guard>
              <AppLayout />
            </Guard>
          }
        >
          <Route index element={<Guard roles={OFFICE}><Dashboard /></Guard>} />
          <Route path="members" element={<Guard roles={OFFICE}><Members /></Guard>} />
          <Route path="home-church" element={<Guard roles={[...OFFICE, 'cell_leader']}><HomeChurch /></Guard>} />
          <Route path="departments" element={<Guard roles={OFFICE}><Departments /></Guard>} />
          <Route path="departments/:id" element={<Guard roles={[...OFFICE, 'dept_leader']}><DepartmentPage /></Guard>} />
          <Route path="reports" element={<Guard roles={OFFICE}><Reports /></Guard>} />
          <Route path="leadership" element={<Guard roles={OFFICE}><Leadership /></Guard>} />
          <Route path="tithe" element={<Guard roles={OFFICE}><Tithe /></Guard>} />
          <Route path="offering" element={<Guard roles={OFFICE}><Offering /></Guard>} />
          <Route path="pledges" element={<Guard roles={OFFICE}><Pledges /></Guard>} />
          <Route path="activities" element={<Activities />} />
          <Route path="inventory" element={<Guard roles={OFFICE}><Inventory /></Guard>} />
          <Route path="forms" element={<Forms />} />
          <Route path="audit" element={<Guard roles={['bishop']}><Audit /></Guard>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </BrowserRouter>
  )
}
