"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import Wordmark from "../../components/Wordmark";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId;
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [otherName, setOtherName] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: convo, error: convoError } = await supabase
        .from("conversations")
        .select("user_one, user_two")
        .eq("id", conversationId)
        .single();

      if (convoError || !convo) {
        setError("Couldn't find that conversation.");
        setLoading(false);
        return;
      }

      const otherId =
        convo.user_one === userData.user.id ? convo.user_two : convo.user_one;
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", otherId)
        .single();
      setOtherName(otherProfile?.display_name || "Someone");

      await loadMessages();
      setLoading(false);
    }
    init();
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const { error: sendError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: newMessage,
    });
    setSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setNewMessage("");
    await loadMessages();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <Wordmark />
        {loading ? (
          <p>Loading conversation...</p>
        ) : error ? (
          <div className="error-box">{error}</div>
        ) : (
          <>
            <div className="field">
              <label>Conversation with</label>
              <p style={{ fontWeight: 700 }}>{otherName}</p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ marginBottom: 10, padding: "6px 14px", fontSize: 13 }}
              onClick={loadMessages}
            >
              ↻ Refresh
            </button>

            <div className="message-thread">
              {messages.length === 0 && (
                <p style={{ fontSize: 14 }}>
                  No messages yet — say hi!
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`message-bubble ${
                    m.sender_id === userId ? "mine" : "theirs"
                  }`}
                >
                  {m.content}
                </div>
              ))}
            </div>

            <form onSubmit={handleSend}>
              <div className="field">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
              </div>
              <button className="btn-primary" type="submit" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        )}
        <button
          className="btn-secondary"
          type="button"
          onClick={() => router.push("/messages")}
          style={{ marginTop: 10 }}
        >
          Back to messages
        </button>
      </div>
    </div>
  );
}
