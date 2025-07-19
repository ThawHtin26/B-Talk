// Polyfills must be loaded first
import './polyfills';

// Additional global object handling
(window as any).global = window;
(window as any).process = (window as any).process || { env: {} };

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
