"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    info: <Info className="h-5 w-5 text-primary" />,
  }

  return (
    <div className={cn(
      "fixed top-4 right-4 z-[100] flex items-center gap-3 rounded-lg border bg-white p-4 shadow-lg animate-in slide-in-from-top-2",
      type === 'error' && "border-destructive/30",
      type === 'success' && "border-success/30",
    )}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Toast context for global usage
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = React.createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([])
  const counterRef = React.useRef(0)

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = React.useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return React.useContext(ToastContext)
}
