
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-100/70 via-sky-50/70 to-indigo-100/70 dark:from-slate-900/80 dark:via-sky-950/80 dark:to-indigo-900/80">
      <SignupForm />
    </div>
  );
}
