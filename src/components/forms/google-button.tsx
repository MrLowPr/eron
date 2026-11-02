"use client";

import { Button } from "@/components/ui/button";

export function GoogleButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        void import("next-auth/react").then(({ signIn }) =>
          signIn("google", { redirectTo: callbackUrl ?? "/" })
        );
      }}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.26 2C7.06 2 2.03 6.16 2.03 12c0 5.7 4.91 9.98 9.44 9.98 4.42 0 8-3.07 8-7.42 0-3.46-2.12-5.46-2.12-5.46Z"
        />
      </svg>
      Lanjutkan dengan Google
    </Button>
  );
}
