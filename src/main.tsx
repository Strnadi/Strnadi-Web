import './services/sentry';
import './services/firebase';
import * as Sentry from '@sentry/react';
import { BrowserRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from '@/App';
import '@/index.css';

const rootElement = document.getElementById('root')!;

const rootOptions = {
  // Callback called when an error is thrown and not caught by an ErrorBoundary.
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),

  // Callback called when React catches an error in an ErrorBoundary.
  onCaughtError: Sentry.reactErrorHandler(),

  // Callback called when React automatically recovers from errors.
  onRecoverableError: Sentry.reactErrorHandler(),
};

const app = (
  <StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  </StrictMode>
);

const root = createRoot(rootElement, rootOptions)
root.render(app)
