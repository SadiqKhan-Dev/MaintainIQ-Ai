import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 py-12 px-4">
      <SignUp />
    </div>
  );
}
