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
  const thumbRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);

  const THUMB_SIZE = 52;
  const PADDING = 6;
  const THRESHOLD = 0.75;

  const getMaxX = () => {
    if (!trackRef.current) return 200;
    return trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2;
  };

  // All touch/mouse logic wired via native DOM listeners (bypasses React passive listeners on iOS)
  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;

    let dragging = false;

    const updatePos = (clientX: number) => {
      const maxX = getMaxX();
      const newX = Math.max(0, Math.min(maxX, clientX - startXRef.current));
      dragXRef.current = newX;
      setDragX(newX);
    };

    const finish = () => {
      if (!dragging) return;
      dragging = false;
      setIsDragging(false);
      const maxX = getMaxX();
      if (dragXRef.current >= maxX * THRESHOLD) {
        setIsSuccess(true);
        onSwipeRef.current();
        setTimeout(() => {
          setIsSuccess(false);
          dragXRef.current = 0;
          setDragX(0);
        }, 600);
      } else {
        dragXRef.current = 0;
        setDragX(0);
      }
    };

    // ── Touch handlers (non-passive so preventDefault works on iOS) ──
    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current || loadingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      const touch = e.touches[0];
      startXRef.current = touch.clientX - dragXRef.current;
      setIsDragging(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      if (touch) updatePos(touch.clientX);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      finish();
    };

    // ── Mouse handlers (desktop) ──
    const onMouseDown = (e: MouseEvent) => {
      if (disabledRef.current || loadingRef.current) return;
      e.preventDefault();
      dragging = true;
      startXRef.current = e.clientX - dragXRef.current;
      setIsDragging(true);

      const onMouseMove = (ev: MouseEvent) => { if (dragging) updatePos(ev.clientX); };
      const onMouseUp = () => {
        finish();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    // Attach to thumb — non-passive is critical for iOS
    thumb.addEventListener('touchstart', onTouchStart, { passive: false });
    thumb.addEventListener('touchmove', onTouchMove, { passive: false });
    thumb.addEventListener('touchend', onTouchEnd, { passive: false });
    thumb.addEventListener('touchcancel', onTouchEnd, { passive: false });
    thumb.addEventListener('mousedown', onMouseDown);

    return () => {
      thumb.removeEventListener('touchstart', onTouchStart);
      thumb.removeEventListener('touchmove', onTouchMove);
      thumb.removeEventListener('touchend', onTouchEnd);
      thumb.removeEventListener('touchcancel', onTouchEnd);
      thumb.removeEventListener('mousedown', onMouseDown);
    };
  }, []); // empty deps — refs keep values current

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
          left: 0, right: 0, top: '50%',
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
        ref={thumbRef}
        className={`login-swipe-thumb ${isSuccess ? 'login-swipe-thumb-success' : ''} ${loading ? 'login-pulse' : ''}`}
        style={{
          left: PADDING,
          transform: `translateX(${isSuccess ? '' : dragX}px)`,
          top: PADDING,
          ...(isDragging ? {} : { transition: isSuccess ? 'none' : 'transform 0.3s ease-out' }),
        }}
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
