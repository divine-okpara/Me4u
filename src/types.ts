import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  coins: number;
  role: 'user' | 'admin';
  isVerified?: boolean;
  privacySettings?: {
    showStories: 'everyone' | 'matches' | 'nobody';
    showProfile: 'everyone' | 'matches';
    allowChatFrom: 'everyone' | 'verified_only' | 'matches_only';
    blockedUsers?: string[];
  };
  lastActive?: Timestamp;
}

export interface Swipe {
  id: string;
  fromUid: string;
  toUid: string;
  type: 'like' | 'dislike' | 'superlike';
  timestamp: Timestamp;
}

export interface Match {
  id: string;
  uids: string[];
  timestamp: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
}

export interface Story {
  id: string;
  uid: string;
  mediaUrl: string;
  type: 'image' | 'video';
  vibe?: string;
  timestamp: Timestamp;
  expiresAt: Timestamp;
}

export interface Message {
  id: string;
  matchId: string;
  senderUid: string;
  text?: string;
  mediaUrl?: string;
  isSnap?: boolean;
  timestamp: Timestamp;
}

export interface Report {
  id: string;
  reporterUid: string;
  reportedUid: string;
  reason: string;
  details?: string;
  timestamp: Timestamp;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface Gift {
  id: string;
  fromUid: string;
  toUid: string;
  amount: number;
  message?: string;
  timestamp: Timestamp;
}

export interface SuperComment {
  id: string;
  fromUid: string;
  targetUid: string;
  targetId: string;
  targetType: 'profile' | 'story';
  text: string;
  amount: number;
  timestamp: Timestamp;
}

export interface Transaction {
  id: string;
  uid: string;
  type: 'purchase' | 'spend';
  amount: number;
  description: string;
  stripePaymentIntentId?: string;
  timestamp: Timestamp;
}
