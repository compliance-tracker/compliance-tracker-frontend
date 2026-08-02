import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/shell/ErrorBoundary.tsx'
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage.tsx'
import { ResetPasswordPage } from './components/auth/ResetPasswordPage.tsx'
import { VerifyEmailPage } from './components/auth/VerifyEmailPage.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import { registerServiceWorker } from './lib/registerServiceWorker.ts'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          {/* App owns everything else (the authenticated dashboard and the login/register
              screen itself) - unchanged, not restructured into routes of its own, since it
              doesn't need URL-addressable sub-pages the way password reset does. */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
      {/* Issue #22 - mounted once at the very top so a toast fired from any page (authenticated
          or not - e.g. a password-reset success) has somewhere to render, rather than needing
          its own instance nested under every route. */}
      <Toaster position="bottom-right" />
    </ErrorBoundary>
  </StrictMode>,
)
