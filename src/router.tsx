import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Hub } from './routes/Hub'

// Lazy-load heavier routes so the initial bundle stays small. Setup pulls in
// mapbox-gl, so it becomes its own chunk loaded only when creating a project.
const Setup = lazy(() => import('./routes/Setup').then((m) => ({ default: m.Setup })))
const Dashboard = lazy(() =>
  import('./routes/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Assistant = lazy(() =>
  import('./routes/Assistant').then((m) => ({ default: m.Assistant })),
)
const Schedules = lazy(() =>
  import('./routes/Schedules').then((m) => ({ default: m.Schedules })),
)
const Moodboard = lazy(() =>
  import('./routes/Moodboard').then((m) => ({ default: m.Moodboard })),
)

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-32 items-center justify-center text-body text-muted">
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Hub /> },
  { path: '/project/new', element: <Lazy><Setup /></Lazy> },
  { path: '/project/:id', element: <Lazy><Dashboard /></Lazy> },
  { path: '/project/:id/materials', element: <Lazy><Assistant discipline="materials" /></Lazy> },
  { path: '/project/:id/lighting', element: <Lazy><Assistant discipline="lighting" /></Lazy> },
  { path: '/project/:id/furniture', element: <Lazy><Assistant discipline="furniture" /></Lazy> },
  { path: '/project/:id/schedules', element: <Lazy><Schedules /></Lazy> },
  { path: '/project/:id/moodboard', element: <Lazy><Moodboard /></Lazy> },
])
