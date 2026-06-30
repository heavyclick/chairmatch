"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: "candidate-photos" | "practice-photos";
  fallbackInitials?: string;
}

export function PhotoUpload({ value, onChange, bucket, fallbackInitials }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Not signed in.");

      const ext = file.name.split(".").pop();
      const path = `${authData.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(publicUrl.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed -- please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URLs aren't in next.config's image domains by default for a dev project, plain <img> avoids that config step
          <img src={value} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-serif text-xl">{fallbackInitials ?? "?"}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-ink/50 flex items-center justify-center">
            <Loader2 size={18} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-deep border border-line rounded-control px-3.5 py-2 hover:border-teal transition-colors"
        >
          <Camera size={14} /> {value ? "Change photo" : "Add photo"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-[12px] text-ink-faint hover:text-coral-deep mt-1.5"
          >
            <X size={11} /> Remove
          </button>
        )}
        {error && <p className="text-[12px] text-coral-deep mt-1.5">{error}</p>}
      </div>
    </div>
  );
}
