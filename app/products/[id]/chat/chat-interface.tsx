"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, AlertCircle, BookOpen, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HypothesisBoard } from "./hypothesis-board";
import { CitationModal } from "./citation-modal";
import type { Hypothesis, EnrichedCitation } from "@/lib/types/assistant";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Local blob URL shown as a thumbnail in the chat */
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
  const [selectedCitation, setSelectedCitation] =
    useState<EnrichedCitation | null>(null);
  /** Pending image selection before the user sends / confirms */
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

  /** Calls /assistant and appends the response to messages */
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
            content:
              "Network error — please check your connection and try again.",
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

    // If there's a pending image, handle it first
    if (pendingImage) {
      const { file, previewUrl } = pendingImage;
      const userText = input.trim();

      // Show user "message" with thumbnail immediately
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

      // Step 1: vision analysis
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

      // Step 2: feed description (+ optional user text) into the assistant
      const analysisMessage =
        `[Image analysis]: ${description}` +
        (userText ? `\n\nUser note: ${userText}` : "");
      setLoading(false);
      await callAssistant(analysisMessage);
      return;
    }

    // Normal text message
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
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
  };

  const clearPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const canSend =
    !loading && (input.trim().length > 0 || pendingImage !== null);

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className="flex flex-1 flex-col border-r min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-4 shrink-0 space-y-2">
            {/* Pending image preview */}
            {pendingImage && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImage.previewUrl}
                  alt="Pending upload"
                  className="h-20 w-20 rounded-lg object-cover border"
                />
                <button
                  onClick={clearPendingImage}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted transition-colors"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow">
              {/* Image upload button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
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
                className="flex-1 resize-none bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />
              <Button
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={sendMessage}
                disabled={!canSend}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Enter to send · Shift+Enter for new line ·{" "}
              <ImagePlus className="inline h-3 w-3 mb-0.5" /> to attach a photo
            </p>
          </div>
        </div>

        {/* Hypothesis board panel */}
        <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-muted/20 border-l">
          <div className="border-b px-4 py-3 shrink-0">
            <h2 className="text-sm font-semibold">Diagnostic Board</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {companyName} · hypothesis tracking
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

      {/* Citation modal */}
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
              className="rounded-2xl rounded-tr-sm object-cover max-h-48 w-auto border ml-auto block"
            />
          )}
          {message.content && (
            <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5">
              <p className="text-sm text-primary-foreground whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-end max-w-[85%]">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground ${
          message.isError ? "bg-destructive" : "bg-primary"
        }`}
      >
        {message.isError ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className="space-y-1.5">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 ${
            message.isError
              ? "bg-destructive/10 border border-destructive/20"
              : "bg-muted"
          }`}
        >
          <p
            className={`text-sm whitespace-pre-wrap leading-relaxed ${
              message.isError ? "text-destructive" : ""
            }`}
          >
            {message.content}
          </p>
        </div>

        {/* Citation chips */}
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(c)}
                className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="max-w-[140px] truncate">{c.doc_title}</span>
                {c.page > 0 ? (
                  <span className="text-muted-foreground/60">p.{c.page}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
