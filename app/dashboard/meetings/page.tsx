"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Select, SelectItem } from "@heroui/select";
import { Divider } from "@heroui/divider";

// ─── Types ─────────────────────────────────────────────

interface ActionItem {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  suggestedDueDate: string | null;
  included: boolean;
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "default" as const },
  MEDIUM: { label: "Medium", color: "primary" as const },
  HIGH: { label: "High", color: "warning" as const },
  URGENT: { label: "Urgent", color: "danger" as const },
};

// ─── Component ─────────────────────────────────────────

export default function MeetingsPage() {
  const [transcript, setTranscript] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Extraction results
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // Extract action items from transcript
  const handleExtract = async () => {
    if (transcript.trim().length < 10) {
      setError("Transcript must be at least 10 characters");
      return;
    }

    setIsExtracting(true);
    setError("");
    setSuccess("");
    setActionItems([]);
    setSummary("");
    setTranscriptId(null);

    try {
      const res = await fetch("/api/meetings/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to extract action items");
        return;
      }

      setTranscriptId(data.transcriptId);
      setSummary(data.summary);
      setActionItems(
        data.actionItems.map((item: Omit<ActionItem, "included">) => ({
          ...item,
          included: true,
        })),
      );
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle item inclusion
  const toggleItem = (index: number) => {
    setActionItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, included: !item.included } : item,
      ),
    );
  };

  // Update item field
  const updateItem = (index: number, field: string, value: string) => {
    setActionItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  // Confirm and create tasks
  const handleConfirm = async () => {
    if (!transcriptId) return;

    const selectedItems = actionItems.filter((item) => item.included);
    if (selectedItems.length === 0) {
      setError("Select at least one action item to create");
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      const res = await fetch("/api/meetings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptId,
          actionItems: selectedItems.map((item) => ({
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueDate: item.suggestedDueDate,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create tasks");
        return;
      }

      setSuccess(`${data.tasks?.length || selectedItems.length} tasks created successfully! View them on the Dashboard.`);
      setTranscript("");
      setActionItems([]);
      setSummary("");
      setTranscriptId(null);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Reset
  const handleReset = () => {
    setTranscript("");
    setActionItems([]);
    setSummary("");
    setTranscriptId(null);
    setError("");
    setSuccess("");
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meeting Notes</h1>
        <p className="text-default-500">
          Paste a meeting transcript and let AI extract action items for you
        </p>
      </div>

      {/* Success message */}
      {success && (
        <Card className="bg-success-50 border border-success-200" shadow="none">
          <CardBody>
            <p className="text-success-700">{success}</p>
            <Button
              color="success"
              variant="flat"
              size="sm"
              className="mt-2"
              onPress={handleReset}
            >
              Extract from another transcript
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Input area (only show if no results yet) */}
      {!transcriptId && !success && (
        <Card>
          <CardHeader className="px-6 pt-6">
            <h2 className="text-xl font-semibold">Paste Meeting Transcript</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <textarea
              className="w-full min-h-[250px] p-4 rounded-xl bg-default-100 border-2 border-default-200 focus:border-primary outline-none resize-y text-sm font-mono"
              placeholder={`Paste your meeting transcript here...\n\nExample:\n"Team standup - Feb 15, 2026\n\nJohn: Let's go around the table. Sarah, what's your update?\n\nSarah: I finished the login page yesterday. Today I'll work on the dashboard.\n\nJohn: Great. Make sure to add the overdue indicators by Friday.\n\nSarah: Got it. Also, we need someone to review the API security.\n\nJohn: I'll handle that. Let me also set up the deployment pipeline by next week."`}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              id="transcript-input"
            />
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-default-400">
                {transcript.length} / 50,000 characters
              </span>
              <Button
                color="primary"
                onPress={handleExtract}
                isLoading={isExtracting}
                isDisabled={transcript.trim().length < 10}
                size="lg"
                id="extract-btn"
              >
                {isExtracting ? "Analyzing..." : "🤖 Extract Action Items"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Loading state */}
      {isExtracting && (
        <Card className="border-primary border-2" shadow="none">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-default-500">
              AI is analyzing your transcript...
            </p>
            <p className="text-xs text-default-400 mt-1">
              This usually takes a few seconds
            </p>
          </CardBody>
        </Card>
      )}

      {/* Results */}
      {transcriptId && actionItems.length > 0 && !success && (
        <>
          {/* Summary */}
          <Card className="bg-secondary-50 border border-secondary-200" shadow="none">
            <CardBody>
              <p className="text-sm font-semibold text-secondary-700 mb-1">Meeting Summary</p>
              <p className="text-default-700">{summary}</p>
            </CardBody>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="px-6 pt-6 flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Extracted Action Items ({actionItems.filter((i) => i.included).length}/{actionItems.length})
                </h2>
                <p className="text-default-500 text-sm">
                  Review, edit, or exclude items before creating tasks
                </p>
              </div>
            </CardHeader>
            <CardBody className="px-6 pb-6 flex flex-col gap-4">
              {actionItems.map((item, index) => (
                <div key={index}>
                  <div
                    className={`flex gap-4 items-start p-4 rounded-xl border-2 transition-all ${
                      item.included
                        ? "border-primary-200 bg-primary-50/30"
                        : "border-default-200 bg-default-50 opacity-60"
                    }`}
                  >
                    {/* Toggle */}
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => toggleItem(index)}
                      className="mt-0.5"
                    >
                      {item.included ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/>
                          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-default-400">
                          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </Button>

                    {/* Item details */}
                    <div className="flex-1 flex flex-col gap-2">
                      <Input
                        size="sm"
                        value={item.title}
                        onValueChange={(val) => updateItem(index, "title", val)}
                        isDisabled={!item.included}
                        classNames={{ input: "font-medium" }}
                        label="Title"
                      />
                      <Input
                        size="sm"
                        value={item.description}
                        onValueChange={(val) => updateItem(index, "description", val)}
                        isDisabled={!item.included}
                        label="Description"
                      />
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select
                          size="sm"
                          selectedKeys={[item.priority]}
                          onChange={(e) => updateItem(index, "priority", e.target.value)}
                          isDisabled={!item.included}
                          className="max-w-[140px]"
                          label="Priority"
                        >
                          <SelectItem key="LOW">Low</SelectItem>
                          <SelectItem key="MEDIUM">Medium</SelectItem>
                          <SelectItem key="HIGH">High</SelectItem>
                          <SelectItem key="URGENT">Urgent</SelectItem>
                        </Select>
                        <Chip
                          size="sm"
                          color={PRIORITY_CONFIG[item.priority].color}
                          variant="flat"
                        >
                          {PRIORITY_CONFIG[item.priority].label}
                        </Chip>
                        {item.suggestedDueDate && (
                          <Chip size="sm" variant="flat">
                            Due: {new Date(item.suggestedDueDate).toLocaleDateString()}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < actionItems.length - 1 && <Divider className="mt-4" />}
                </div>
              ))}

              <div className="flex justify-between items-center mt-4">
                <Button variant="light" onPress={handleReset}>
                  Start Over
                </Button>
                <Button
                  color="primary"
                  size="lg"
                  onPress={handleConfirm}
                  isLoading={isConfirming}
                  isDisabled={actionItems.filter((i) => i.included).length === 0}
                  id="confirm-tasks-btn"
                >
                  Create {actionItems.filter((i) => i.included).length} Tasks
                </Button>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* No action items found */}
      {transcriptId && actionItems.length === 0 && !isExtracting && !success && (
        <Card className="border-warning border-2" shadow="none">
          <CardBody className="flex flex-col items-center justify-center py-8">
            <p className="text-warning-600 font-medium">
              No action items found for you in this transcript.
            </p>
            <p className="text-default-400 text-sm mt-1">
              Try a different transcript or check if your name is mentioned.
            </p>
            <Button variant="flat" onPress={handleReset} className="mt-4">
              Try Again
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
