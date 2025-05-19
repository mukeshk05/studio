
import { SignupForm } from "@/components/auth/SignupForm";
import { cn } from "@/lib/utils"; // Import cn for conditional classes if needed

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <SignupForm />
    </div>
  );
}
