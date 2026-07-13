"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

type GetToken = () => Promise<string | null>;

let getTokenFn: GetToken | null = null;

export function setClerkGetToken(fn: GetToken) {
  getTokenFn = fn;
}

export async function clerkGetToken(): Promise<string | null> {
  if (!getTokenFn) return null;
  try {
    return await getTokenFn();
  } catch {
    return null;
  }
}

export function ClerkAuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setClerkGetToken(() => getToken() as Promise<string | null>);
  }, [getToken]);
  return null;
}
