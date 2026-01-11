"use client";

import { signOut } from '@/app/auth/actions'; // Imports the new action
import { LogOut } from 'lucide-react';
import { useTransition } from 'react';

export default function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors w-full text-left"
    >
      <LogOut className="w-5 h-5" />
      <span className="font-medium">
        {isPending ? 'Signing out...' : 'Sign Out'}
      </span>
    </button>
  );
}