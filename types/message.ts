export interface Message {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MessagePartnerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface MessageWithProfile extends Message {
  sender?: MessagePartnerProfile | null;
  receiver?: MessagePartnerProfile | null;
}

export interface SendMessageInput {
  receiver_id: string;
  body: string;
}
