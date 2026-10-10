import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import Course from '../pages/Course'
import { SettingsProvider } from './SettingsProvider'

const Playground = lazy(() => import('../pages/Playground'))
const DevComponents = lazy(() => import('../pages/dev/DevComponents'))

const blank = <div className="h-dvh bg-bg" />

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <Routes>
          <Route path="/" element={<Course />} />
          <Route
            path="/playground"
            element={
              <Suspense fallback={blank}>
                <Playground />
              </Suspense>
            }
          />
          <Route
            path="/dev/components"
            element={
              <Suspense fallback={blank}>
                <DevComponents />
              </Suspense>
            }
          />
          <Route path="*" element={<Course />} />
        </Routes>
      </SettingsProvider>
    </BrowserRouter>
  )
}
