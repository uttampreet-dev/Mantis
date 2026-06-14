"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, AlertCircle, BookOpen, ImagePlus, X, Zap } from "lucide-react";
import { HypothesisBoard } from "./hypothesis-board";
import { CitationModal } from "./citation-modal";
import type { Hypothesis, EnrichedCitation } from "@/lib/types/assistant";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  citations?: EnrichedCitation[];
  isError?: boolean;
}

interface Props {
  productId: string;
  productName: string;
  companyName: string;
}

export function ChatInterface({ productId, productName, companyName }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm the diagnostic assistant for ${productName}. Describe the issue you're experiencing — or upload a photo of any warning lights, damage, or error codes.`,
    },
  ]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [stage, setStage] = useState<"investigating" | "testing" | "diagnosed">(
    "investigating"
  );
  const [recommendedAction, setRecommendedAction] = useState<string | null>(null);
  const [spareParts, setSpareParts] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<EnrichedCitation | null>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const callAssistant = useCallback(
    async (message: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}/assistant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: data.error ?? "Something went wrong. Please try again.",
              isError: true,
            },
          ]);
          return;
        }

        if (data.conversationId) setConversationId(data.conversationId);
        if (data.hypotheses) setHypotheses(data.hypotheses);
        if (data.stage) setStage(data.stage);
        if (data.recommended_action !== undefined)
          setRecommendedAction(data.recommended_action);
        if (data.spare_parts !== undefined) setSpareParts(data.spare_parts);

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message,
            citations: data.citations ?? [],
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Network error — please check your connection and try again.",
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [conversationId, productId]
  );

  const sendMessage = useCallback(async () => {
    if (loading) return;

    if (pendingImage) {
      const { file, previewUrl } = pendingImage;
      const userText = input.trim();

      setMessages((prev) => [
        ...prev,
        {
          id: `user-img-${Date.now()}`,
          role: "user",
          content: userText || "",
          imageUrl: previewUrl,
        },
      ]);
      setPendingImage(null);
      setInput("");
      setLoading(true);

      let description: string;
      try {
        const fd = new FormData();
        fd.append("image", file);
        const visionRes = await fetch(`/api/products/${productId}/vision`, {
          method: "POST",
          body: fd,
        });
        const visionData = await visionRes.json();
        if (!visionRes.ok) throw new Error(visionData.error ?? "Vision failed");
        description = visionData.description as string;
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Image analysis failed: ${err instanceof Error ? err.message : "unknown error"}`,
            isError: true,
          },
        ]);
        setLoading(false);
        return;
      }

      const analysisMessage =
        `[Image analysis]: ${description}` +
        (userText ? `\n\nUser note: ${userText}` : "");
      setLoading(false);
      await callAssistant(analysisMessage);
      return;
    }

    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ]);
    setInput("");
    await callAssistant(text);
  }, [loading, pendingImage, input, productId, callAssistant]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
  };

  const clearPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const canSend = !loading && (input.trim().length > 0 || pendingImage !== null);

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* ── Chat panel ── */}
        <div className="flex flex-1 flex-col border-r border-border min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onCitationClick={setSelectedCitation}
              />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 items-end">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 border border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border p-4 shrink-0 space-y-2">
            {pendingImage && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImage.previewUrl}
                  alt="Pending upload"
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={clearPendingImage}
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-border hover:bg-accent transition-colors"
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-xl border border-border bg-input p-2 focus-within:border-primary/50 transition-colors">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                aria-label="Upload image"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  pendingImage
                    ? "Add a note (optional)…"
                    : `Describe your issue with ${productName}…`
                }
                disabled={loading}
                className="flex-1 resize-none bg-transparent px-1 py-1 text-sm placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!canSend}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground/50">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* ── Hypothesis board ── */}
        <div className="hidden lg:flex w-72 xl:w-80 flex-col bg-card border-l border-border">
          <div className="border-b border-border px-4 py-3 shrink-0">
            <h2 className="text-xs font-semibold tracking-tight">Diagnostic Board</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {companyName} · live hypothesis tracking
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <HypothesisBoard
              hypotheses={hypotheses}
              stage={stage}
              recommendedAction={recommendedAction}
              spareParts={spareParts}
            />
          </div>
        </div>
      </div>

      <CitationModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </>
  );
}

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: DisplayMessage;
  onCitationClick: (c: EnrichedCitation) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-1.5">
          {message.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.imageUrl}
              alt="Uploaded photo"
              className="rounded-2xl rounded-tr-sm object-cover max-h-48 w-auto border border-border ml-auto block"
            />
          )}
          {message.content && (
            <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5">
              <p className="text-sm text-primary-foreground whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-end max-w-[88%]">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          message.isError
            ? "border-destructive/30 bg-destructive/10"
            : "border-primary/20 bg-primary/10"
        }`}
      >
        {message.isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <div className="space-y-1.5">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 border ${
            message.isError
              ? "bg-destructive/5 border-destructive/20"
              : "bg-muted border-border"
          }`}
        >
          <p
            className={`text-sm whitespace-pre-wrap leading-relaxed ${
              message.isError ? "text-destructive" : "text-foreground"
            }`}
          >
            {message.content}
          </p>
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(c)}
                className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                <BookOpen className="h-2.5 w-2.5 shrink-0" />
                <span className="max-w-[140px] truncate font-mono">{c.doc_title}</span>
                {c.page > 0 && (
                  <span className="text-muted-foreground/50 font-mono">p.{c.page}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
