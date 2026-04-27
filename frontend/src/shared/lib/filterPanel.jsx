import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  return useContext(Ctx);
}

export function FilterSlot({ children }) {
  const ctx = useContext(Ctx);
  const setHasContent = ctx?.setHasContent;

  useEffect(() => {
    if (!setHasContent) return;
    setHasContent(true);
    return () => setHasContent(false);
  }, [setHasContent]);

  if (!ctx?.containerEl) return null;
  return createPortal(children, ctx.containerEl);
}
