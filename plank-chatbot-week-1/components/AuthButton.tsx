'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AuthButton() {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <Button 
        variant="outline" 
        size="default" 
        onClick={() => signOut()}
        className="font-mono text-sm bg-navy-800 text-white border-navy-600 hover:bg-navy-700 hover:text-white"
      >
        TERMINATE SESSION
      </Button>
    );
  }

  return (
    <Button 
      asChild 
      variant="outline" 
      size="default"
      className="font-mono text-sm bg-navy-800 text-white border-navy-600 hover:bg-navy-700 hover:text-white"
    >
      <a href="/auth">AUTHORIZE ACCESS</a>
    </Button>
  );
} 