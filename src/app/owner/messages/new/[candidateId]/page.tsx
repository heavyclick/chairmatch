"use client";

import { useParams } from "next/navigation";
import { MessageThread } from "@/components/shared/message-thread";

export default function NewMessageThreadPage() {
  const params = useParams<{ candidateId: string }>();
  return <MessageThread candidateId={params.candidateId} backHref="/owner/messages" />;
}
