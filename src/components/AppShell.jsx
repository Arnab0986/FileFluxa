import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FileStack, Image, FileText, FileCode, Headphones, Archive,
  Search, Shield, Zap, Menu, X, ChevronRight, Download, RefreshCw, CheckCircle2
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  { name: 'Image Studio', path: '/image-studio', icon: Image, desc: 'Convert, compress & edit images' },
  { name: 'PDF Lab', path: '/pdf-lab', icon: FileText, desc: 'Merge, split & manipulate PDFs' },
  { name: 'Document Converter', path: '/document-converter', icon: FileCode, desc: 'CSV, JSON, Markdown & text' },
  { name: 'Audio Lab', path: '/audio-lab', icon: Headphones, desc: 'Convert, trim & adjust audio' },
  { name: 'Archive Tools', path: '/archive-tools', icon: Archive, desc: 'Create & extract ZIP archives' },
]

export function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()

  const filteredItems = NAVIGATION_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-navy-950 text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-navy-800 bg-navy-900 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <FileStack className="w-5 h-5 text-navy-950" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">FileFluxa</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-navy-800 text-cyan-400 hover:bg-navy-700 transition"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar / Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-72 bg-navy-900 border-r border-navy-800 flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-navy-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <FileStack className="w-6 h-6 text-navy-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">FileFluxa</h1>
            <p className="text-xs text-gray-400">Zero-Cost File Workspace</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-navy-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tools... (Press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy-950 border border-navy-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              location.pathname === '/'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                : 'text-gray-400 hover:bg-navy-800 hover:text-white'
            }`}
          >
            <FileStack className="w-5 h-5" />
            <span>Dashboard Home</span>
          </Link>

          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tool Categories</div>

          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition group ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-gray-300 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-navy-800 text-gray-400 group-hover:text-cyan-400 group-hover:bg-navy-700'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{item.desc}</div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-cyan-400 translate-x-0.5' : 'text-gray-600 group-hover:translate-x-0.5 group-hover:text-gray-400'}`} />
              </Link>
            )
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/40 text-xs text-gray-500 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <Shield className="w-4 h-4" />
            <span>100% Client-Side Privacy</span>
          </div>
          <p>Zero servers. Zero file uploads. Files never leave your browser.</p>
          <div className="pt-2 flex items-center justify-between border-t border-navy-800/60">
            <Link to="/privacy" className="hover:text-cyan-400 transition">Privacy</Link>
            <Link to="/terms" className="hover:text-cyan-400 transition">Terms</Link>
            <Link to="/about" className="hover:text-cyan-400 transition">About</Link>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
        <footer className="py-6 px-10 border-t border-navy-800 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 FileFluxa. All rights reserved. Built with zero recurring infrastructure cost.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Browser Processing Ready
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}
