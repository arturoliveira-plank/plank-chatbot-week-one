'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AuthButton() {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <Button variant="outline" size="default" onClick={() => signOut()}>
        Sign Out
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="default">
      <a href="/auth">Sign In</a>
    </Button>
  );
} 