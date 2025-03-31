import * as React from "react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="mx-auto w-full max-w-md space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
