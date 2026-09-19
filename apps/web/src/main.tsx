import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';
import './styles/global.css';

const queryClient = new QueryClient();

// Portal-wide typeface (FF Good via Adobe Fonts).
const FONT_FAMILY =
  "'ff-good-web-pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1e7fe6', // Dlogix blue
            colorInfo: '#1e7fe6',
            colorLink: '#1565c0',
            colorLinkHover: '#1e7fe6',
            fontFamily: FONT_FAMILY,
          },
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
