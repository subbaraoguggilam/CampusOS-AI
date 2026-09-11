"use client";

import { CheckCircle2, Circle, XCircle, MinusCircle, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AgentStep } from "@/lib/types";

const STATUS_ICON: Record<AgentStep["status"], React.ReactNode> = {
  done: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
  waiting: <Circle className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />,
  blocked: <XCircle className="h-4 w-4 text-red-600 shrink-0" />,
  skipped: <MinusCircle className="h-4 w-4 text-gray-300 shrink-0" />,
};

const STATUS_TEXT_CLASS: Record<AgentStep["status"], string> = {
  done: "text-gray-900",
  waiting: "text-amber-800",
  blocked: "text-red-700",
  skipped: "text-gray-400",
};

export function AgentActivityPanel({ steps }: { steps: AgentStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Bot className="h-5 w-5 text-campus-600" />
        <CardTitle className="text-base">CampusOS AI Agent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2">
            {STATUS_ICON[step.status]}
            <div className="min-w-0">
              <p className={cn("text-sm font-medium leading-tight", STATUS_TEXT_CLASS[step.status])}>
                {step.label}
                <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 font-normal">
                  {step.agent}
                </span>
              </p>
              {step.detail && (
                <p className="text-xs text-gray-500 mt-0.5 break-words">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
