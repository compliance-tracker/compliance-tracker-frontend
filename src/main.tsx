import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ForgotPasswordPage } from './components/ForgotPasswordPage.tsx'
import { ResetPasswordPage } from './components/ResetPasswordPage.tsx'
import { VerifyEmailPage } from './components/VerifyEmailPage.tsx'

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
    </ErrorBoundary>
  </StrictMode>,
)
