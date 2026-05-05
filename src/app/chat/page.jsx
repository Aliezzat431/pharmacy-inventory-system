"use client";

import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSend,
  FiTrash2,
  FiUser,
  FiCpu,
  FiInfo
} from "react-icons/fi";

// ==================== NO AI MODE ====================
const AI_ENABLED = false;

// ==================== UI ====================
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow
        ${isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-black"}`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
};

// ==================== MAIN ====================
export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 أهلاً! النظام حالياً في وضع العرض فقط بدون ذكاء اصطناعي."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ==================== SEND MESSAGE ====================
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      role: "user",
      content: input
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // ❌ AI DISABLED RESPONSE
    setTimeout(() => {
      const fakeReply = {
        role: "assistant",
        content:
          "⚠️ مفيش AI شغال دلوقتي. دي واجهة عرض فقط بدون أي تنفيذ أو تحليل."
      };

      setMessages((prev) => [...prev, fakeReply]);
      setLoading(false);
    }, 600);
  };

  // ==================== CLEAR CHAT ====================
  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "💬 تم مسح المحادثة (وضع العرض فقط)"
      }
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* HEADER */}
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FiCpu />
          <h1 className="font-bold">محسن (وضع بدون AI)</h1>
        </div>

        <button onClick={clearChat}>
          <FiTrash2 />
        </button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب رسالة..."
          className="flex-1 border rounded-xl px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-4 rounded-xl"
        >
          <FiSend />
        </button>
      </div>

      {/* FOOT NOTE */}
      <div className="text-xs text-gray-400 p-2 flex items-center gap-1">
        <FiInfo size={12} />
        النظام في وضع العرض فقط بدون ذكاء اصطناعي أو تنفيذ أوامر
      </div>
    </div>
  );
}