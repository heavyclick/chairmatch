"use client";

import { useParams } from "next/navigation";
import { MessageThread } from "@/components/shared/message-thread";

export default function CandidateMessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  return <MessageThread threadId={params.threadId} backHref="/candidate/messages" />;
}
