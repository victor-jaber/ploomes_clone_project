import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, ArrowRight, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import herminioAvatar from "@assets/herminio-avatar.png";

interface AssistantAction {
  label: string;
  url: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
  isLoading?: boolean;
}

export function HerminioChat() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o Hermínio, assistente do Hermes CRM. Posso te ajudar a encontrar advogados, escritórios, reclamantes e processos. Experimente perguntar algo como:\n\n• \"Buscar advogados com CNJ 0006789-01.2023.5.02.0045\"\n• \"Encontrar escritório Silva & Associados\"\n• \"Quais leads estão na triagem?\"",
      actions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = getToken();
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) throw new Error("Erro na resposta");

      const data = await response.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? { ...msg, content: data.message, actions: data.actions, isLoading: false }
            : msg
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? { ...msg, content: "Desculpe, ocorreu um erro. Tente novamente.", isLoading: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: AssistantAction) => {
    setIsOpen(false);
    const [path, search] = action.url.split("?");
    if (window.location.pathname === path) {
      window.history.replaceState({}, "", action.url);
      window.dispatchEvent(new CustomEvent("herminio-navigate", { detail: { search: search ? `?${search}` : "" } }));
    } else {
      setLocation(action.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[380px] max-w-[calc(100vw-2rem)]">
          <Card className="flex flex-col h-[520px] shadow-2xl border-purple-500/20 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-md">
              <div className="flex items-center gap-2">
                <img src={herminioAvatar} alt="Hermínio" className="h-8 w-8 rounded-full object-cover" />
                <div>
                  <p className="font-semibold text-sm">Hermínio</p>
                  <p className="text-[10px] text-white/70">Assistente Hermes CRM</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-white no-default-hover-elevate no-default-active-elevate"
                data-testid="button-close-herminio"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-purple-600 text-white"
                          : "bg-muted"
                      }`}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-xs">Hermínio está pensando...</span>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {msg.actions.map((action, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleAction(action)}
                                  className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium transition-colors"
                                  data-testid={`button-action-${i}`}
                                >
                                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="px-3 py-2.5 border-t">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ao Hermínio..."
                  disabled={isLoading}
                  className="flex-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-muted-foreground disabled:opacity-50"
                  data-testid="input-herminio-message"
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 no-default-hover-elevate no-default-active-elevate"
                  data-testid="button-send-herminio"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95 overflow-hidden"
        data-testid="button-open-herminio"
      >
        {isOpen ? (
          <div className="h-full w-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <X className="h-5 w-5 text-white" />
          </div>
        ) : (
          <img src={herminioAvatar} alt="Hermínio" className="h-full w-full object-cover" />
        )}
      </div>
    </div>
  );
}
