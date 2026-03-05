import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Smile, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface UserContact {
  user_id: string;
  full_name: string;
  role: string;
  phone: string | null;
}

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  recipient_id: string | null;
  room_id: string;
  created_at: string;
}

const EMOJI_LIST = ['😀','😂','😍','👍','❤️','🙏','🔥','💯','👋','😊','🎉','✅','⚡','💪','🏠','🔑','💰','📋','🛠️','📱'];

const roleBadge: Record<string, string> = {
  super_admin: 'Admin',
  landlord: 'Landlord',
  caretaker: 'Caretaker',
  tenant: 'Tenant',
};

const roleColor: Record<string, string> = {
  super_admin: 'bg-destructive/20 text-destructive',
  landlord: 'bg-primary/20 text-primary',
  caretaker: 'bg-aero-success/20 text-foreground',
  tenant: 'bg-aero-warning/20 text-foreground',
};

const ChatWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all users as contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .neq('user_id', user.id);

    if (!data) return;

    // Get roles for each user
    const userIds = data.map(d => d.user_id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const roleMap: Record<string, string> = {};
    roles?.forEach(r => { roleMap[r.user_id] = r.role; });

    setContacts(data.map(d => ({
      ...d,
      role: roleMap[d.user_id] || 'tenant',
    })));
  }, [user]);

  useEffect(() => {
    if (open) fetchContacts();
  }, [open, fetchContacts]);

  // Generate room id (deterministic between two users)
  const getRoomId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Fetch messages for selected contact
  const fetchMessages = useCallback(async () => {
    if (!user || !selectedContact) return;
    const roomId = getRoomId(user.id, selectedContact.user_id);
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200);
    setMessages((data as ChatMessage[]) || []);
  }, [user, selectedContact]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !selectedContact) return;
    const roomId = getRoomId(user.id, selectedContact.user_id);
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chats',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Count unread (simple: messages where recipient is me and not in current view)
  useEffect(() => {
    if (!user || open) { setUnread(0); return; }
    const channel = supabase
      .channel('unread-counter')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chats',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        setUnread(prev => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, open]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !selectedContact) return;
    const roomId = getRoomId(user.id, selectedContact.user_id);
    await supabase.from('chats').insert({
      message: input.trim(),
      sender_id: user.id,
      recipient_id: selectedContact.user_id,
      room_id: roomId,
    });
    setInput('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (roleBadge[c.role] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => { setOpen(!open); setUnread(0); }}
        className="fixed bottom-6 right-6 z-[90] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        style={{ boxShadow: '0 4px 20px hsl(210 80% 45% / 0.4)' }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-4 z-[90] w-[360px] h-[520px] max-h-[80vh] rounded-xl overflow-hidden shadow-2xl border border-border flex flex-col bg-card animate-aero-fade-in
          max-[480px]:w-[calc(100vw-16px)] max-[480px]:right-2 max-[480px]:bottom-20 max-[480px]:h-[70vh]">

          {/* Header */}
          <div className="aero-title-bar px-4 py-3 flex items-center gap-3 shrink-0">
            {selectedContact && (
              <button onClick={() => setSelectedContact(null)} className="text-sidebar-foreground/80 hover:text-sidebar-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <MessageCircle className="h-5 w-5 text-sidebar-foreground/80" />
            <span className="text-sm font-semibold text-sidebar-foreground flex-1 truncate">
              {selectedContact ? selectedContact.full_name : 'Messages'}
            </span>
            {selectedContact && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleColor[selectedContact.role] || ''}`}>
                {roleBadge[selectedContact.role] || selectedContact.role}
              </span>
            )}
          </div>

          {!selectedContact ? (
            /* Contact List */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs aero-input"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                  {filteredContacts.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">No contacts found</p>
                  )}
                  {filteredContacts.map(contact => (
                    <button
                      key={contact.user_id}
                      onClick={() => setSelectedContact(contact)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {getInitials(contact.full_name || '??')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{contact.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground">{contact.phone || 'No phone'}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${roleColor[contact.role] || ''}`}>
                        {roleBadge[contact.role] || contact.role}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* Conversation View */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-12">
                      No messages yet. Say hello! 👋
                    </p>
                  )}
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === user.id;
                    const showTime = i === 0 || 
                      new Date(msg.created_at).getTime() - new Date(messages[i-1].created_at).getTime() > 300000;
                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <p className="text-center text-[10px] text-muted-foreground my-2">
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </p>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                            }`}
                          >
                            {msg.message}
                            <span className={`block text-[9px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Emoji Picker */}
              {showEmoji && (
                <div className="px-3 py-2 border-t border-border bg-card grid grid-cols-10 gap-1">
                  {EMOJI_LIST.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setInput(prev => prev + emoji); inputRef.current?.focus(); }}
                      className="text-lg hover:scale-125 transition-transform h-8 w-8 flex items-center justify-center rounded hover:bg-accent/30"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Bar */}
              <div className="px-3 py-2 border-t border-border flex items-center gap-2 shrink-0 bg-card">
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className={`p-1.5 rounded-full transition-colors ${showEmoji ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Smile className="h-5 w-5" />
                </button>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message..."
                  className="flex-1 h-9 text-sm aero-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
