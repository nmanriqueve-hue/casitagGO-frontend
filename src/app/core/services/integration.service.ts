import { Injectable } from '@angular/core';

export interface ExternalIntegrationConfig {
  apiBaseUrl: string;
  mapsProviderUrl: string;
  stripePublicKey: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  readonly config: ExternalIntegrationConfig = {
    apiBaseUrl: 'http://localhost:8080/api',
    mapsProviderUrl: '',
    stripePublicKey: ''
  };

  mapAvailable(): boolean {
    return this.config.mapsProviderUrl.length > 0;
  }

  paymentsAvailable(): boolean {
    return this.config.stripePublicKey.length > 0;
  }
}
