"use client";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

export default function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton mode="modal">
        <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
}
