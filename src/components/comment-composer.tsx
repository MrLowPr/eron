"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { createCommentAction } from "@/server/actions/comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function CommentComposer({
  postId,
  parentId,
  placeholder = "Tulis komentar…",
  onDone,
  autoFocus = false,
}: {
  postId: string;
  parentId?: string | null;
  placeholder?: string;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const textarea = form.elements.namedItem("content") as HTMLTextAreaElement;
        const content = textarea.value.trim();
        if (content.length < 3) {
          toast.error("Komentar minimal 3 karakter");
          return;
        }
        setPending(true);
        const result = await createCommentAction({ postId, parentId: parentId ?? null, content });
        setPending(false);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        textarea.value = "";
        toast.success(parentId ? "Balasan terkirim" : "Komentar terkirim");
        onDone?.();
      }}
    >
      <Textarea
        name="content"
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        maxLength={2000}
        required
        aria-label={parentId ? "Tulis balasan" : "Tulis komentar"}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          {parentId ? "Balas" : "Kirim"}
        </Button>
      </div>
    </form>
  );
}
