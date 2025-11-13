// Shared TypeScript types
export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  roomId: string;
  content: string;
  imageUrl?: string | null;
  timestamp: Date;
  sentByAdmin: boolean;
  userId?: string;
}

export interface ConversationPassword {
  roomId: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  passwordHash?: string | null;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface JWTPayload {
  userId: string;
  isAdmin: boolean;
  roomId?: string;
  iat?: number;
  exp?: number;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
}
