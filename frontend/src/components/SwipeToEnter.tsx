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

  const THUMB_SIZE = 52;
  const PADDING = 6;
  const THRESHOLD = 0.75;

  const getMaxX = useCallback(() => {
    if (!trackRef.current) return 0;
    return trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2;
  }, []);

  const clampX = useCallback((x: number) => {
    return Math.max(0, Math.min(getMaxX(), x));
  }, [getMaxX]);

  const triggerSuccess = useCallback(() => {
    setIsSuccess(true);
    onSwipe();
    setTimeout(() => {
      setIsSuccess(false);
      dragXRef.current = 0;
      setDragX(0);
    }, 600);
  }, [onSwipe]);

  const finishDrag = useCallback(() => {
    setIsDragging(false);
    if (dragXRef.current >= getMaxX() * THRESHOLD) {
      triggerSuccess();
    } else {
      dragXRef.current = 0;
      setDragX(0);
    }
  }, [getMaxX, triggerSuccess]);

  const updatePosition = useCallback((clientX: number) => {
    const newX = clampX(clientX - startXRef.current);
    dragXRef.current = newX;
    setDragX(newX);
  }, [clampX]);

  // Touch events — attached directly to document while dragging
  useEffect(() => {
    if (!isDragging) return;

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) updatePosition(touch.clientX);
    };

    const onTouchEnd = () => finishDrag();

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updatePosition(e.clientX);
    };

    const onMouseUp = () => finishDrag();

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, updatePosition, finishDrag]);

  const startDrag = useCallback((clientX: number) => {
    if (disabled || loading) return;
    startXRef.current = clientX - dragXRef.current;
    setIsDragging(true);
  }, [disabled, loading]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) startDrag(touch.clientX);
  }, [startDrag]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX);
  }, [startDrag]);

  const fillPercent = trackRef.current
    ? (dragX / getMaxX()) * 100
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
        ref={thumbRef}
        className={`login-swipe-thumb ${isSuccess ? 'login-swipe-thumb-success' : ''} ${loading ? 'login-pulse' : ''}`}
        style={{
          left: PADDING,
          transform: `translateX(${isSuccess ? '' : dragX}px)`,
          top: PADDING,
          ...(isDragging ? {} : { transition: isSuccess ? 'none' : 'transform 0.3s ease-out' }),
        }}
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
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
