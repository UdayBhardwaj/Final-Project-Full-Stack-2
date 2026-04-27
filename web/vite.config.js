import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const webRoot = process.cwd();
const keyPath = path.resolve(webRoot, './localhost-key.pem');
const certPath = path.resolve(webRoot, './localhost.pem');

let httpsConfig = false;
try {
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsConfig = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    console.log('Using local HTTPS certs for Vite dev server.');
  } else {
    console.log('Local HTTPS certs not found — Vite will start without HTTPS.');
  }
} catch (err) {
  console.warn('Error checking certs, starting without HTTPS:', err);
  httpsConfig = false;
}

export default defineConfig({
  plugins: [react()],
  server: {
    https: httpsConfig || false,
    host: 'localhost'
  }
});
