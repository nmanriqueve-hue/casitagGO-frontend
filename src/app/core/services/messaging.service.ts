import { Injectable, inject, signal } from '@angular/core';
import { Conversation, ChatMessage } from '../models/optional.models';
import { SessionService } from './session.service';
import { CatalogService } from './catalog.service';
@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly session = inject(SessionService);
  private readonly catalog = inject(CatalogService);
  private readonly threads = signal<Conversation[]>([{ id: 1, listingId: 101, guestId: 1, hostId: 2 }]);
  private readonly messages = signal<ChatMessage[]>([{ id: 1, conversationId: 1, senderId: 2, content: 'Hola, Laura. ¿Tienes alguna pregunta sobre el alojamiento?', sentAt: new Date().toISOString(), readBy: [2] }]);
  private sequence = 2;
  conversations(): Conversation[] {
    const id = this.session.currentUser()?.id;
    return this.threads().filter((t) => t.guestId === id || t.hostId === id);
  }
  open(listingId: number): Conversation | null {
    const user = this.session.currentUser();
    const listing = this.catalog.getById(listingId);
    if (!user || !['guest', 'host'].includes(user.role) || !listing || listing.hostId === user.id) return null;
    const existing = this.conversations().find((t) => t.listingId === listingId && t.guestId === user.id);
    if (existing) return existing;
    const thread = { id: this.sequence++, listingId, guestId: user.id, hostId: listing.hostId };
    this.threads.update((all) => [...all, thread]);
    return thread;
  }
  history(id: number): ChatMessage[] {
    if (!this.conversations().some((t) => t.id === id)) return [];
    return this.messages().filter((m) => m.conversationId === id);
  }
  send(id: number, content: string): boolean {
    const user = this.session.currentUser();
    if (!user || !content.trim() || content.length > 2000 || !this.conversations().some((t) => t.id === id)) return false;
    this.messages.update((all) => [...all, { id: this.sequence++, conversationId: id, senderId: user.id, content: content.trim(), sentAt: new Date().toISOString(), readBy: [user.id] }]);
    return true;
  }
  read(id: number): void {
    const user = this.session.currentUser();
    if (!user || !this.conversations().some((t) => t.id === id)) return;
    this.messages.update((all) => all.map((m) => m.conversationId === id && !m.readBy.includes(user.id) ? { ...m, readBy: [...m.readBy, user.id] } : m));
  }
  unread(id: number): number { return this.history(id).filter((m) => !m.readBy.includes(this.session.currentUser()?.id ?? -1)).length; }
}
