import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../lib/auth';
import { QueryProvider } from '../lib/queryProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          </Head>
          <Component {...pageProps} />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#fff',
                color: '#1a1a1a',
                border: '1px solid #ede4d0',
                borderRadius: '12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#2d6a4f', secondary: '#fff' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}