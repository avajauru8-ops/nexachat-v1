'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

export function InactivityTimer({ timeoutMinutes = 5 }: { timeoutMinutes?: number }) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const handleLogout = async () => {
    toast.error('Sessão expirada por inatividade de 5 minutos.');
    
    // Desloga no Supabase
    await supabase.auth.signOut();
    
    // Limpeza forçada de cookies 'sb-' para evitar o erro REQUEST_HEADER_TOO_LARGE
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.replace(/^ +/, "").split("=")[0];
        if (cookieName.startsWith("sb-")) {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }

    router.push('/auth/login');
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleLogout, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    resetTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => resetTimer();

    events.forEach(evt => document.addEventListener(evt, activityHandler));

    return () => {
      events.forEach(evt => document.removeEventListener(evt, activityHandler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [timeoutMinutes]);

  return null;
}
