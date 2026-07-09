"use client";

import { useState, useRef } from "react";
import { X, Paperclip, Loader2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB per file, per founder's spec
const MAX_FILES = 5; // not specified, a sane cap

interface PendingFile {
  file: File;
  path?: string;
  uploading: boolean;
  error?: string;
}

export function FileTicketModal({ onClose, onFiled }: { onClose: () => void; onFiled: () => void }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const newFiles = Array.from(selected).slice(0, MAX_FILES - files.length);
    for (const file of newFiles) {
      if (file.size > MAX_FILE_BYTES) {
        setFiles((f) => [...f, { file, uploading: false, error: "Over 3MB limit" }]);
        continue;
      }
      const pending: PendingFile = { file, uploading: true };
      setFiles((f) => [...f, pending]);

      const path = `${authData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from("support-attachments").upload(path, file);
      setFiles((f) =>
        f.map((p) =>
          p.file === file ? { ...p, uploading: false, path: error ? undefined : path, error: error?.message } : p
        )
      );
    }
  }

  function removeFile(file: File) {
    setFiles((f) => f.filter((p) => p.file !== file));
  }

  async function submit() {
    if (!subject.trim() || !description.trim()) {
      setSubmitError("Please fill in both the subject and description.");
      return;
    }
    if (files.some((f) => f.uploading)) {
      setSubmitError("Please wait for attachments to finish uploading.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          attachments: files
            .filter((f) => f.path)
            .map((f) => ({ path: f.path, name: f.file.name, size: f.file.size })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Couldn't file the ticket. Please try again.");
        return;
      }
      onFiled();
    } catch {
      setSubmitError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 px-4 pb-4 md:pb-0">
      <div className="w-full md:max-w-md bg-bg-raised rounded-2xl p-5 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3.5 right-3.5 text-ink-faint hover:text-ink" aria-label="Close">
          <X size={17} />
        </button>
        <h3 className="text-[16px] font-semibold mb-4">File a support ticket</h3>

        <label className="block text-[12.5px] font-semibold mb-1.5">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue"
          className="w-full mb-4 px-3 py-2 rounded-lg border border-line text-[13.5px] bg-bg"
        />

        <label className="block text-[12.5px] font-semibold mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="What's going on? Include any steps to reproduce if it's a bug."
          className="w-full mb-4 px-3 py-2 rounded-lg border border-line text-[13.5px] bg-bg resize-none"
        />

        <label className="block text-[12.5px] font-semibold mb-1.5">Attachments (optional)</label>
        <div className="space-y-1.5 mb-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[12.5px] bg-line-soft px-2.5 py-1.5 rounded-lg">
              <FileText size={13} className="shrink-0 text-ink-faint" />
              <span className="flex-1 truncate">{f.file.name}</span>
              {f.uploading && <Loader2 size={13} className="animate-spin shrink-0" />}
              {f.error && <span className="text-coral-deep shrink-0">{f.error}</span>}
              <button onClick={() => removeFile(f.file)} className="shrink-0 text-ink-faint hover:text-coral-deep">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        {files.length < MAX_FILES && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-deep mb-4"
          >
            <Paperclip size={13} /> Attach files (up to {MAX_FILES}, 3MB each)
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {submitError && <p className="text-[12.5px] text-coral-deep mb-3">{submitError}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-2.5 rounded-control bg-teal text-white font-semibold text-[13.5px] hover:bg-teal-deep disabled:opacity-50"
        >
          {submitting ? "Filing…" : "File ticket"}
        </button>
      </div>
    </div>
  );
}
