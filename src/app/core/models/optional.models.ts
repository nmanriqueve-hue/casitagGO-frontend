export interface GeoPoint { latitude: number; longitude: number; label: string; }
export interface Conversation { id: number; listingId: number; guestId: number; hostId: number; }
export interface ChatMessage { id: number; conversationId: number; senderId: number; content: string; sentAt: string; readBy: number[]; }
