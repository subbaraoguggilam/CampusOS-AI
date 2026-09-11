"use client";

import { useState } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentActivityPanel } from "@/components/agent-activity-panel";
import { AiRecommendationBanner } from "@/components/ai-recommendation-banner";
import type { AgentStep } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  match?: {
    templateName: string;
    confidence: number;
    lowConfidence: boolean;
    missingFields: string[];
  };
}

interface RagChatProps {
  onSubmitRequest?: (query: string, fieldData: Record<string, string>, templateId?: string) => void | Promise<void>;
}

export function RagChat({ onSubmitRequest }: RagChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your CampusOS AI assistant. Describe what you need in plain English — for example:\n\n• \"I need a bonafide certificate for bank account\"\n• \"Apply for leave from 10/09 to 15/09 due to medical reasons\"\n• \"Request exam revaluation for semester 3\"\n\nI'll match your request to the right workflow and guide you through the process.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    query: string;
    extractedFields: Record<string, string>;
    missingFields: string[];
    templateId?: string;
  } | null>(null);
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>({});
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [recommendation, setRecommendation] = useState<{ decision: "approve" | "reject" | "review"; reason: string } | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [policyChecks, setPolicyChecks] = useState<{ rule: string; passed: boolean; detail: string }[]>([]);
  const [alternatives, setAlternatives] = useState<{ templateName: string }[]>([]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      setLastResult({
        query,
        extractedFields: data.extractedFields,
        missingFields: data.missingFields,
        templateId: data.bestMatch?.templateId,
      });
      setFieldInputs(data.extractedFields);
      setAgentSteps(data.agentSteps || []);
      setRecommendation(data.recommendation || null);
      setConfidence(data.bestMatch?.confidence ?? null);
      setMatchedKeywords(data.bestMatch?.matchedKeywords || []);
      setPolicyChecks(data.policy?.checks || []);
      setAlternatives(
        (data.matches || [])
          .filter((m: { templateId: string }) => m.templateId !== data.bestMatch?.templateId)
          .map((m: { templateName: string }) => ({ templateName: m.templateName }))
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.guidance,
          match: data.bestMatch
            ? {
                templateName: data.bestMatch.templateName,
                confidence: data.bestMatch.confidence,
                lowConfidence: data.bestMatch.lowConfidence,
                missingFields: data.missingFields,
              }
            : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest() {
    if (!lastResult || !onSubmitRequest) return;
    const merged = { ...lastResult.extractedFields, ...fieldInputs };
    const missing = lastResult.missingFields.filter((field) => !merged[field]?.trim());
    if (missing.length > 0) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Please complete these fields before submitting: ${missing.map((field) => field.replace(/_/g, " ")).join(", ")}.` }]);
      return;
    }
    await onSubmitRequest(lastResult.query, merged, lastResult.templateId);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="flex flex-col h-[600px]">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Sparkles className="h-5 w-5 text-campus-600" />
            <CardTitle>CampusOS AI Orchestrator</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user" ? "bg-campus-600" : "bg-gray-100"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-campus-600" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-campus-600 text-white"
                        : "bg-gray-50 text-gray-800 border border-gray-100"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    {msg.match && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-campus-100 text-campus-800">
                          {msg.match.templateName}
                        </Badge>
                        <Badge
                          className={
                            msg.match.lowConfidence
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {(msg.match.confidence * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                    <Loader2 className="h-4 w-4 animate-spin text-campus-600" />
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Analyzing your request with offline RAG...
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-2">
              <Input
                placeholder="Describe your request in plain English..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <div className="space-y-4">
          <AgentActivityPanel steps={agentSteps} />

          {recommendation && (
            <AiRecommendationBanner
              decision={recommendation.decision}
              reason={recommendation.reason}
              confidence={confidence}
              matchedKeywords={matchedKeywords}
              policyChecks={policyChecks}
              alternatives={alternatives}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lastResult.missingFields.length > 0 ? (
                lastResult.missingFields.map((field) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-gray-600 capitalize">
                      {field.replace(/_/g, " ")} *
                    </label>
                    <Input
                      className="mt-1"
                      value={fieldInputs[field] || ""}
                      onChange={(e) =>
                        setFieldInputs((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      placeholder={`Enter ${field.replace(/_/g, " ")}`}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-green-700 font-medium">
                  All required fields collected!
                </p>
              )}
              {onSubmitRequest && lastResult.templateId && (
                <Button className="w-full mt-2" onClick={handleSubmitRequest}>
                  Submit Request
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
