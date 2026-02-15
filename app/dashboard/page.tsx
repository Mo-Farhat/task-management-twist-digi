"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Tooltip } from "@heroui/tooltip";

// ─── Types ─────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  sourceTranscript?: { id: string; summary: string } | null;
}

// ─── Constants ─────────────────────────────────────────

const STATUS_CONFIG = {
  TODO: { label: "To Do", color: "default" as const },
  IN_PROGRESS: { label: "In Progress", color: "primary" as const },
  DONE: { label: "Done", color: "success" as const },
};

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "default" as const },
  MEDIUM: { label: "Medium", color: "primary" as const },
  HIGH: { label: "High", color: "warning" as const },
  URGENT: { label: "Urgent", color: "danger" as const },
};

// ─── Component ─────────────────────────────────────────

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterPriority !== "ALL") params.set("priority", filterPriority);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Open create modal
  const handleCreate = () => {
    setEditingTask(null);
    setFormData({ title: "", description: "", status: "TODO", priority: "MEDIUM", dueDate: "" });
    setFormError("");
    onOpen();
  };

  // Open edit modal
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
    });
    setFormError("");
    onOpen();
  };

  // Save task (create or update)
  const handleSave = async () => {
    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const body: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      };

      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to save task");
        return;
      }

      onClose();
      fetchTasks();
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete task
  const handleDelete = async (taskId: string) => {
    setDeletingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Quick status toggle
  const handleStatusToggle = async (task: Task) => {
    const nextStatus = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : "TODO";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Check overdue
  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "DONE") return false;
    return new Date(task.dueDate) < new Date();
  };

  // ─── Stats ───────────────────────────────────────────

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    overdue: tasks.filter((t) => isOverdue(t)).length,
  };

  // ─── Render ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" label="Loading tasks..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-default-500">Manage your tasks</p>
        </div>
        <Button color="primary" onPress={handleCreate} size="lg" id="create-task-btn">
          + New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "bg-default-100" },
          { label: "To Do", value: stats.todo, color: "bg-default-100" },
          { label: "In Progress", value: stats.inProgress, color: "bg-primary-50" },
          { label: "Done", value: stats.done, color: "bg-success-50" },
          { label: "Overdue", value: stats.overdue, color: "bg-danger-50" },
        ].map((stat) => (
          <Card key={stat.label} className={stat.color} shadow="none">
            <CardBody className="py-3 px-4">
              <p className="text-xs text-default-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          label="Status"
          selectedKeys={[filterStatus]}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="max-w-[160px]"
          size="sm"
          id="filter-status"
        >
          <SelectItem key="ALL">All Statuses</SelectItem>
          <SelectItem key="TODO">To Do</SelectItem>
          <SelectItem key="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem key="DONE">Done</SelectItem>
        </Select>

        <Select
          label="Priority"
          selectedKeys={[filterPriority]}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="max-w-[160px]"
          size="sm"
          id="filter-priority"
        >
          <SelectItem key="ALL">All Priorities</SelectItem>
          <SelectItem key="LOW">Low</SelectItem>
          <SelectItem key="MEDIUM">Medium</SelectItem>
          <SelectItem key="HIGH">High</SelectItem>
          <SelectItem key="URGENT">Urgent</SelectItem>
        </Select>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card className="border-dashed border-2 border-default-200" shadow="none">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <p className="text-default-400 text-lg mb-2">No tasks yet</p>
            <p className="text-default-400 text-sm mb-4">Create your first task to get started</p>
            <Button color="primary" variant="flat" onPress={handleCreate}>
              + Create Task
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`${isOverdue(task) ? "border-danger border-2" : ""}`}
              shadow="sm"
            >
              <CardBody className="flex flex-row items-center gap-4 py-3">
                {/* Status toggle */}
                <Tooltip content={`Click to change status`}>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => handleStatusToggle(task)}
                    className="min-w-8"
                  >
                    {task.status === "DONE" ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-success">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : task.status === "IN_PROGRESS" ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-default-400">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </Button>
                </Tooltip>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-medium ${task.status === "DONE" ? "line-through text-default-400" : ""}`}
                    >
                      {task.title}
                    </span>
                    <Chip size="sm" color={PRIORITY_CONFIG[task.priority].color} variant="flat">
                      {PRIORITY_CONFIG[task.priority].label}
                    </Chip>
                    <Chip size="sm" color={STATUS_CONFIG[task.status].color} variant="flat">
                      {STATUS_CONFIG[task.status].label}
                    </Chip>
                    {isOverdue(task) && (
                      <Chip size="sm" color="danger" variant="flat">
                        Overdue
                      </Chip>
                    )}
                    {task.sourceTranscript && (
                      <Chip size="sm" color="secondary" variant="flat">
                        From Meeting
                      </Chip>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-default-500 text-sm mt-1 truncate">{task.description}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-xs text-default-400">
                    {task.dueDate && (
                      <span className={isOverdue(task) ? "text-danger font-medium" : ""}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => handleEdit(task)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-default-500">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </Button>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    color="danger"
                    onPress={() => handleDelete(task.id)}
                    isLoading={deletingId === task.id}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-danger">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>{editingTask ? "Edit Task" : "Create New Task"}</ModalHeader>
          <ModalBody>
            {formError && (
              <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-3 text-sm">
                {formError}
              </div>
            )}

            <Input
              label="Title"
              placeholder="What needs to be done?"
              value={formData.title}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, title: val }))}
              isRequired
              id="task-title"
            />

            <Input
              label="Description"
              placeholder="Add more details (optional)"
              value={formData.description}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              id="task-description"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                selectedKeys={[formData.status]}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                id="task-status"
              >
                <SelectItem key="TODO">To Do</SelectItem>
                <SelectItem key="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem key="DONE">Done</SelectItem>
              </Select>

              <Select
                label="Priority"
                selectedKeys={[formData.priority]}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                id="task-priority"
              >
                <SelectItem key="LOW">Low</SelectItem>
                <SelectItem key="MEDIUM">Medium</SelectItem>
                <SelectItem key="HIGH">High</SelectItem>
                <SelectItem key="URGENT">Urgent</SelectItem>
              </Select>
            </div>

            <Input
              label="Due Date"
              type="datetime-local"
              value={formData.dueDate}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, dueDate: val }))}
              id="task-due-date"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleSave} isLoading={isSaving} id="task-save-btn">
              {editingTask ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
