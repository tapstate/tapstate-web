import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { router } from './router'
import './i18n'
import './styles/main.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Cloud Console root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
