export type UserRole = 'guest' | 'host' | 'admin';
export type ListingStatus = 'BORRADOR' | 'PENDIENTE_REVISION' | 'ACTIVA' | 'PAUSADA' | 'BLOQUEADA';
export type BookingStatus = 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA' | 'EN_REVISION';

export interface User {
  id: number;
  uuid?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  joinedAt: string;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  date: string;
  content: string;
}

export interface Listing {
  id: number;
  hostId: number;
  title: string;
  description: string;
  city: string;
  address: string;
  type: string;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price: number;
  cleaningFee: number;
  amenities: string[];
  rules: string[];
  image: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  status: ListingStatus;
  instantBooking: boolean;
  cancellationPolicy: string;
}

export interface Booking {
  id: number;
  code: string;
  listingId: number;
  guestId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
  total: number;
  createdAt: string;
  reviewed: boolean;
}

export interface Quote {
  nights: number;
  base: number;
  cleaning: number;
  service: number;
  extras: number;
  discount: number;
  total: number;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'booking' | 'listing' | 'account' | 'system';
}

export interface AuditEvent {
  id: number;
  date: string;
  actor: string;
  action: string;
  entity: string;
  result: 'EXITOSO' | 'REVISIÓN' | 'BLOQUEADO';
  detail: string;
}

export interface SearchFilters {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  type: string;
  minPrice: number;
  maxPrice: number;
  amenities: string[];
}


