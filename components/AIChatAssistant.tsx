"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metric?: string;
  comparison?: string;
  details?: string[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "How many leads were added this week?",
  "What's the pipeline value?",
  "Any pending follow-ups?",
  "Show me a summary",
];

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "I couldn't process that request.",
        metric: data.metric,
        comparison: data.comparison,
        details: data.details,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't connect. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {/* Chat Panel */}
      <div
        id="ai-chat-panel"
        className={`
          fixed bottom-24 right-6 z-50
          w-[380px] max-h-[560px]
          flex flex-col
          rounded-2xl overflow-hidden
          transition-all duration-300 ease-out
          ${isOpen && !isMinimized
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
          }
        `}
        style={{
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(20, 184, 166, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)",
            borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)",
                  boxShadow: "0 4px 12px rgba(20, 184, 166, 0.3)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3 6.5V18a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.5C6.5 14 5 12 5 9a7 7 0 0 1 7-7z" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                style={{
                  background: "#10b981",
                  borderColor: "rgba(15, 23, 42, 0.95)",
                }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">EstateFlow AI</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Always Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{
            maxHeight: "360px",
            minHeight: "200px",
            scrollbarWidth: "thin",
            scrollbarColor: "#334155 transparent",
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)",
                  border: "1px solid rgba(20, 184, 166, 0.15)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <circle cx="9" cy="10" r="1" fill="#14b8a6" />
                  <circle cx="12" cy="10" r="1" fill="#14b8a6" />
                  <circle cx="15" cy="10" r="1" fill="#14b8a6" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white mb-1">Ask me anything</p>
              <p className="text-xs text-slate-500 mb-5 max-w-[240px]">
                I can help with leads, pipeline, follow-ups, activities, and more.
              </p>
              <div className="space-y-2 w-full">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-3.5 py-2.5 text-xs rounded-xl transition-all duration-200 group"
                    style={{
                      background: "rgba(30, 41, 59, 0.4)",
                      border: "1px solid rgba(148, 163, 184, 0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(20, 184, 166, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(30, 41, 59, 0.4)";
                      e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.08)";
                    }}
                  >
                    <span className="text-slate-300 group-hover:text-teal-300 transition-colors">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                          boxShadow: "0 4px 12px rgba(20, 184, 166, 0.2)",
                        }
                      : {
                          background: "rgba(30, 41, 59, 0.6)",
                          border: "1px solid rgba(148, 163, 184, 0.08)",
                        }
                  }
                >
                  <p
                    className={`text-sm leading-relaxed ${
                      msg.role === "user" ? "text-white" : "text-slate-200"
                    }`}
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {msg.content}
                  </p>

                  {/* Metric card */}
                  {msg.metric && (
                    <div
                      className="mt-3 px-3 py-2.5 rounded-xl"
                      style={{
                        background: "rgba(20, 184, 166, 0.08)",
                        border: "1px solid rgba(20, 184, 166, 0.15)",
                      }}
                    >
                      <p className="text-2xl font-bold text-teal-400">{msg.metric}</p>
                      {msg.comparison && (
                        <p className={`text-xs mt-1 ${
                          msg.comparison.startsWith("+") ? "text-emerald-400" : msg.comparison.startsWith("-") ? "text-red-400" : "text-slate-400"
                        }`}>
                          {msg.comparison.startsWith("+") && "↑ "}
                          {msg.comparison.startsWith("-") && "↓ "}
                          {msg.comparison}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Detail list */}
                  {msg.details && msg.details.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {msg.details.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg"
                          style={{ background: "rgba(15, 23, 42, 0.4)" }}
                        >
                          <span className="shrink-0 mt-0.5 text-slate-500">
                            {d.startsWith("•") || d.match(/^\d\./) ? "" : "•"}
                          </span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] mt-1.5 ${
                    msg.role === "user" ? "text-teal-200/60" : "text-slate-600"
                  }`}>
                    {msg.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-md px-4 py-3"
                style={{
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.08)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3"
          style={{
            borderTop: "1px solid rgba(148, 163, 184, 0.08)",
            background: "rgba(10, 15, 30, 0.5)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-1"
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(148, 163, 184, 0.1)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your CRM data..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none py-2.5"
              id="ai-chat-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30"
              style={{
                background: input.trim() ? "linear-gradient(135deg, #14b8a6, #3b82f6)" : "transparent",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Floating Action Button */}
      <button
        id="ai-chat-toggle"
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group"
        style={{
          background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)",
          boxShadow: isOpen
            ? "0 8px 25px rgba(20, 184, 166, 0.3), 0 0 40px rgba(20, 184, 166, 0.1)"
            : "0 8px 25px rgba(20, 184, 166, 0.25), 0 0 0 0 rgba(20, 184, 166, 0.4)",
          animation: !isOpen ? "pulse-glow 2s ease-in-out infinite" : "none",
        }}
        title={isOpen ? "Close assistant" : "Open AI assistant"}
      >
        <div className="relative w-6 h-6">
          {/* Chat icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
            }`}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {/* Close icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            }`}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        {/* Notification dot */}
        {!isOpen && messages.length === 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{
              background: "#ef4444",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
              animation: "scaleIn 0.3s ease-out forwards",
            }}
          >
            1
          </span>
        )}
      </button>
    </>
  );
}
