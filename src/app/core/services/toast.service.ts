import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  text: string;
  tone: 'success' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<ToastMessage | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string, tone: ToastMessage['tone'] = 'success'): void {
    clearTimeout(this.timer);
    this.message.set({ text, tone });
    this.timer = setTimeout(() => this.message.set(null), 3200);
  }

  close(): void {
    this.message.set(null);
  }
}
