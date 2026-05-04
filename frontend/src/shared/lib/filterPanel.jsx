import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const MOBILE_BREAKPOINT = 850;
const mq = typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`) : null;

function subscribeToMq(cb) {
  if (!mq) return () => {};
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribeToMq,
    () => mq?.matches ?? false,
    () => false,
  );
}

const Ctx = createContext(null);

export function FilterPanelProvider({ children }) {
  const [containerEl, setContainerEl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const containerRefCb = useCallback((el) => setContainerEl(el), []);

  return (
    <Ctx.Provider value={{ containerEl, isOpen, setIsOpen, hasContent, setHasContent, containerRefCb }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFilterPanel() {
  return useContext(Ctx) ?? {};
}

export function FilterSlot({ children }) {
  const ctx = useContext(Ctx);
  const isMobile = useIsMobile();
  const setHasContent = ctx?.setHasContent;

  useEffect(() => {
    if (!setHasContent) return;
    setHasContent(true);
    return () => setHasContent(false);
  }, [setHasContent]);

  // Desktop: renderiza inline directamente en la página
  if (!isMobile) return <>{children}</>;

  // Mobile: porta al drawer
  if (!ctx?.containerEl) return null;
  return createPortal(children, ctx.containerEl);
}
