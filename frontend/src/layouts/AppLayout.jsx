import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar.jsx'
import { BackgroundGrid } from '../components/BackgroundGrid.jsx'
import { CursorGlow } from '../components/CursorGlow.jsx'

export function AppLayout() {
  return (
    <div className="bg-command min-h-screen">
      <BackgroundGrid />
      <CursorGlow />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4">
        <Outlet />
      </main>
    </div>
  )
}
