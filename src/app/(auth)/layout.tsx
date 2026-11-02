import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container relative flex min-h-svh flex-col items-center justify-center py-10">
      <Link
        href="/"
        className="absolute left-8 top-8 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Kembali ke beranda
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
        {children}
      </div>
    </div>
  );
}
