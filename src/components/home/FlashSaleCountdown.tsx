import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface CountdownProps {
  endDate: string;
}

const FlashSaleCountdown = ({ endDate }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (expired) return null;

  return (
    <div className="flex items-center gap-3 justify-center">
      <Clock className="w-5 h-5 text-destructive" />
      {[
        { val: timeLeft.days, label: 'Days' },
        { val: timeLeft.hours, label: 'Hrs' },
        { val: timeLeft.minutes, label: 'Min' },
        { val: timeLeft.seconds, label: 'Sec' },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl md:text-3xl font-display font-bold text-foreground tabular-nums">
            {String(val).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default FlashSaleCountdown;
