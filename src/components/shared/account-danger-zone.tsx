"use client";

import { useState } from "react";
import { AlertTriangle, EyeOff, Trash2 } from "lucide-react";

export function AccountDangerZone({ backHref }: { backHref: string }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      });
      if (!res.ok) throw new Error("Couldn't deactivate your account.");
      window.location.href = backHref;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setWorking(false);
    }
  }

  async function deleteAccount() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      if (!res.ok) throw new Error("Couldn't delete your account.");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setWorking(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-12">
      <h1 className="font-serif text-2xl font-semibold mb-7">Account</h1>

      <div className="rounded-2xl border border-line bg-bg-raised p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <EyeOff size={17} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-[14px] font-semibold mb-1">Deactivate</p>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Hides your profile from search. Your data stays intact and you can reactivate anytime by changing your status.
            </p>
          </div>
        </div>
        <button
          onClick={deactivate}
          disabled={working}
          className="w-full py-2.5 rounded-control text-[13.5px] font-semibold border border-line hover:border-teal transition-colors disabled:opacity-60"
        >
          Deactivate my profile
        </button>
      </div>

      <div className="rounded-2xl border border-coral/30 bg-coral/5 p-5">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle size={17} className="text-coral-deep mt-0.5 shrink-0" />
          <div>
            <p className="text-[14px] font-semibold mb-1 text-coral-deep">Delete account</p>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Permanently deletes your account and all associated data. This cannot be undone.
            </p>
          </div>
        </div>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-full py-2.5 rounded-control text-[13.5px] font-semibold border border-coral/40 text-coral-deep hover:bg-coral/10 transition-colors"
          >
            <Trash2 size={13} className="inline mr-1.5 -mt-0.5" /> Delete my account
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-coral-deep">Are you sure? This is permanent.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 py-2.5 rounded-control text-[13px] font-semibold border border-line"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={working}
                className="flex-1 py-2.5 rounded-control text-[13px] font-semibold bg-coral-deep text-white disabled:opacity-60"
              >
                {working ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-[12.5px] text-coral-deep mt-3">{error}</p>}
      </div>
    </div>
  );
}
