"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface GalleryPhoto {
  id?: string;
  photoUrl: string;
  caption: string;
}

interface GalleryUploadProps {
  value: GalleryPhoto[];
  onChange: (photos: GalleryPhoto[]) => void;
  maxPhotos?: number;
}

/**
 * Multi-photo uploader for a practice's team/office gallery --
 * distinct from PhotoUpload (single profile photo). Lets an owner add
 * several photos with optional captions, shown on the public-facing
 * practice profile candidates see.
 */
export function GalleryUpload({ value, onChange, maxPhotos = 12 }: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    const remaining = maxPhotos - value.length;
    if (remaining <= 0) {
      setError(`You can add up to ${maxPhotos} photos.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Not signed in.");

      const uploaded: GalleryPhoto[] = [];
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const ext = file.name.split(".").pop();
        const path = `${authData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("practice-gallery")
          .upload(path, file);
        if (uploadError) continue;

        const { data: publicUrl } = supabase.storage.from("practice-gallery").getPublicUrl(path);
        uploaded.push({ photoUrl: publicUrl.publicUrl, caption: "" });
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed -- please try again.");
    } finally {
      setUploading(false);
    }
  }

  function updateCaption(index: number, caption: string) {
    const next = [...value];
    next[index] = { ...next[index], caption };
    onChange(next);
  }

  function removePhoto(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        {value.map((photo, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden border border-line bg-bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.photoUrl} alt={photo.caption || "Practice photo"} className="w-full h-28 object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/70 text-white flex items-center justify-center"
            >
              <X size={12} />
            </button>
            <input
              value={photo.caption}
              onChange={(e) => updateCaption(i, e.target.value)}
              placeholder="Caption (optional)"
              className="w-full px-2 py-1.5 text-[11.5px] bg-bg-raised border-t border-line outline-none"
            />
          </div>
        ))}

        {value.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-28 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1.5 text-ink-faint hover:border-teal hover:text-teal-deep transition-colors"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span className="text-[11.5px] font-semibold flex items-center gap-1">
              <Camera size={11} /> Add photos
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
      />

      {error && <p className="text-[12px] text-coral-deep">{error}</p>}
      <p className="text-[11.5px] text-ink-faint mt-1">
        {value.length}/{maxPhotos} photos. Team photos, office shots, anything candidates should see.
      </p>
    </div>
  );
}
