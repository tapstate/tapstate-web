import type { ReactNode } from 'react'

import { AskTapstate } from '@/features/ask-tapstate/ask-tapstate'

import { AppSidebar } from './app-sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-gray-100/80 font-sans text-gray-900 selection:bg-blue-100 max-[760px]:flex-col">
      <AppSidebar />

      <main className="relative z-10 my-2 mr-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-[0.5px] border-[lch(89.84%_0_282_/_1)] bg-white shadow-[0px_3px_6px_-2px_lch(0%_0_0_/_0.02),0px_1px_1px_lch(0%_0_0_/_0.04)]">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>

      <AskTapstate />
    </div>
  )
}
