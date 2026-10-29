import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/golos-text';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import '../styles/index.css';
import './lab.css';
import { BrushProvider } from '../features/brush/BrushProvider';
import { AppProvider } from '../state/AppState';
import { FigureLab } from './FigureLab';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider><BrushProvider><FigureLab /></BrushProvider></AppProvider>
  </StrictMode>,
);
