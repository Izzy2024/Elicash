import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeToEnterProps {
  onSwipe: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function SwipeToEnter({ onSwipe, disabled = false, loading = false }: SwipeToEnterProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);

  const THUMB_SIZE = 52;
  const PADDING = 6;
  const THRESHOLD = 0.75;

  const updateDragPosition = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const maxX = track.offsetWidth - THUMB_SIZE - PADDING * 2;
    const newX = Math.max(0, Math.min(maxX, clientX - startXRef.current));
    dragXRef.current = newX;
    setDragX(newX);
  }, []);

  const finishDrag = useCallback(() => {
    setIsDragging(false);
    activePointerIdRef.current = null;
    const track = trackRef.current;
    if (!track) return;
    const maxX = track.offsetWidth - THUMB_SIZE - PADDING * 2;
    if (dragXRef.current >= maxX * THRESHOLD) {
      setIsSuccess(true);
      onSwipe();
      setTimeout(() => {
        setIsSuccess(false);
        dragXRef.current = 0;
        setDragX(0);
      }, 600);
    } else {
      dragXRef.current = 0;
      setDragX(0);
    }
  }, [onSwipe]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || loading) return;
    e.preventDefault();
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.error('Failed to set pointer capture:', err);
    }
    startXRef.current = e.clientX - dragXRef.current;
    setIsDragging(true);
  }, [disabled, loading]);

  useEffect(() => {
    if (!isDragging || disabled) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return;
      }

      event.preventDefault();
      updateDragPosition(event.clientX);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return;
      }

      finishDrag();
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      updateDragPosition(touch.clientX);
    };

    const handleTouchEnd = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, disabled, finishDrag, updateDragPosition]);

  const fillPercent = trackRef.current
    ? (dragX / (trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2)) * 100
    : 0;

  return (
    <div
      ref={trackRef}
      className="login-swipe-track"
      style={{ height: THUMB_SIZE + PADDING * 2, padding: PADDING }}
    >
      <div
        className="login-swipe-track-fill"
        style={{ width: `${isSuccess ? 100 : Math.max(fillPercent, 0)}%` }}
      />
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '2px',
          paddingLeft: `${THUMB_SIZE + 16}px`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {loading ? 'INGRESANDO...' : 'DESLIZA PARA ENTRAR →'}
      </span>
      <div
        className={`login-swipe-thumb ${isSuccess ? 'login-swipe-thumb-success' : ''} ${loading ? 'login-pulse' : ''}`}
        style={{
          left: PADDING,
          transform: `translateX(${isSuccess ? '' : dragX}px)`,
          top: PADDING,
          ...(isDragging ? {} : { transition: isSuccess ? 'none' : 'transform 0.3s ease-out' }),
        }}
        onPointerDown={handlePointerDown}
      >
        {loading ? (
          <svg style={{ pointerEvents: 'none' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg style={{ pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </div>
    </div>
  );
}
