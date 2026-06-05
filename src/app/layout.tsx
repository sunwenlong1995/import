import type { Metadata } from "next"
import "./globals.css"
import { MainLayout } from "@/components/layout/main-layout"

export const metadata: Metadata = {
  title: "UniversalImport - 智能批量导入系统",
  description: "物流/快递行业智能批量下单系统，通过大模型实现任意格式文件的智能解析与导入",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  )
}
