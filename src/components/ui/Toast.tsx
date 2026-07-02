import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastKind = 'info' | 'success' | 'error'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, kind, message }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto min-w-[240px] rounded-md border px-4 py-3 text-body shadow-lg',
              'bg-card/95 backdrop-blur',
              t.kind === 'success'
                ? 'border-approve/50 text-ink'
                : t.kind === 'error'
                  ? 'border-reject/50 text-ink'
                  : 'border-border text-ink',
            ].join(' ')}
            role="status"
          >
            <span
              className={[
                'mr-2 inline-block h-2 w-2 rounded-pill align-middle',
                t.kind === 'success'
                  ? 'bg-approve'
                  : t.kind === 'error'
                    ? 'bg-reject'
                    : 'bg-accent',
              ].join(' ')}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
