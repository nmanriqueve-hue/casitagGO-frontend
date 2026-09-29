import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { USERS } from '../../core/services/mock-data';
@Component({ selector: 'app-messages', imports: [FieldValidationDirective, FormsModule, DatePipe, RouterLink], templateUrl: './messages.component.html', styleUrl: './messages.component.css' })
export class MessagesComponent {
  readonly chat = inject(MessagingService);
  readonly catalog = inject(CatalogService);
  readonly session = inject(SessionService);
  readonly selected = signal<number | null>(null);
  draft = '';
  constructor() {
    const id = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('alojamiento'));
    const thread = id ? this.chat.open(id) : null;
    const first = thread ?? this.chat.conversations()[0];
    if (first) this.select(first.id);
  }
  select(id: number): void { this.selected.set(id); this.draft = ''; this.chat.read(id); }
  name(id: number): string { return USERS.find((u) => u.id === id)?.name ?? 'Usuario #' + id; }
  send(): void { const id = this.selected(); if (id && this.chat.send(id, this.draft)) this.draft = ''; }
}
