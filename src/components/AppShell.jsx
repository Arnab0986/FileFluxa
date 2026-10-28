
import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  FileStack,
  Image,
  FileText,
  FileCode,
  Headphones,
  Archive,
  Search,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Command,
  Sparkles,
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  {
    name: 'Image Studio',
    path: '/image-studio',
    icon: Image,
    desc: 'Convert, compress & edit images',
  },
  {
    name: 'PDF Lab',
    path: '/pdf-lab',
    icon: FileText,
    desc: 'Merge, split & manipulate PDFs',
  },
  {
    name: 'Document Converter',
    path: '/document-converter',
    icon: FileCode,
    desc: 'CSV, JSON, Markdown & text',
  },
  {
    name: 'Audio Lab',
    path: '/audio-lab',
    icon: Headphones,
    desc: 'Convert, trim & adjust audio',
  },
  {
    name: 'Archive Tools',
    path: '/archive-tools',
    icon: Archive,
    desc: 'Create & extract ZIP archives',
  },
]

export function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  const filteredItems = NAVIGATION_ITEMS.filter((item) => {
    const query = searchQuery.trim().toLowerCase()

    return (
      item.name.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query)
    )
  })

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        document.getElementById('tool-search')?.focus()
      }

      if (event.key === 'Escape') {
        setSidebarOpen(false)
        document.getElementById('tool-search')?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const closeSidebar = () => setSidebarOpen(false)

  const navLinkClass = (active) =>
    [
      'group flex items-center gap-3 rounded-xl px-3 py-2.5',
      'text-sm font-medium transition-colors duration-200',
      active
        ? 'bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-100'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    ].join(' ')

  const sidebarContent = (
    <>
      <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-200/80 px-5">
        <Link
          to="/"
          onClick={closeSidebar}
          aria-label="FileFluxa home"
          className="flex min-w-0 items-center gap-3"
        >
          <img
            src="/logo-icon.svg"
            alt=""
            width="42"
            height="42"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="block text-lg font-extrabold tracking-tight text-slate-950">
              FileFluxa
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-slate-500">
              YOUR FILE WORKSPACE
            </span>
          </span>
        </Link>
      </div>

      <div className="shrink-0 border-b border-slate-200/80 p-4">
        <label
          htmlFor="tool-search"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Find a tool
        </label>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            id="tool-search"
            type="search"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-600 focus:bg-white focus:ring-4 focus:ring-cyan-600/10"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            /
          </span>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Workspace
        </p>

        <Link
          to="/"
          onClick={closeSidebar}
          aria-current={location.pathname === '/' ? 'page' : undefined}
          className={navLinkClass(location.pathname === '/')}
        >
          <FileStack
            aria-hidden="true"
            className={[
              'h-[18px] w-[18px] shrink-0',
              location.pathname === '/'
                ? 'text-cyan-700'
                : 'text-slate-400 group-hover:text-slate-700',
            ].join(' ')}
          />
          <span className="flex-1">Dashboard Home</span>
          {location.pathname === '/' && (
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
          )}
        </Link>

        <p className="mb-2 mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          File tools
        </p>

        <div className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                aria-current={isActive ? 'page' : undefined}
                className={navLinkClass(isActive)}
              >
                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-800',
                  ].join(' ')}
                >
                  <Icon aria-hidden="true" className="h-[17px] w-[17px]" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {item.name}
                  </span>
                  <span
                    className={[
                      'mt-0.5 block truncate text-[11px] font-normal',
                      isActive ? 'text-cyan-800/75' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {item.desc}
                  </span>
                </span>

                <ChevronRight
                  aria-hidden="true"
                  className={[
                    'h-4 w-4 shrink-0 transition-transform',
                    isActive
                      ? 'translate-x-0.5 text-cyan-700'
                      : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500',
                  ].join(' ')}
                />
              </Link>
            )
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Search className="mx-auto mb-3 h-6 w-6 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              No tools found
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Try another name, or search for image, PDF, audio or document.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-semibold text-cyan-700 hover:text-cyan-900"
            >
              Clear search
            </button>
          </div>
        )}
      </nav>

      <div className="shrink-0 border-t border-slate-200/80 p-4">
        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Privacy first
              </p>
              <p className="text-[10px] font-medium text-cyan-800">
                Designed for local processing
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Files are processed in your browser when the selected tool supports
            client-side processing.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between px-1 text-xs font-medium text-slate-500">
          <Link to="/privacy" onClick={closeSidebar} className="hover:text-cyan-800">
            Privacy
          </Link>
          <Link to="/terms" onClick={closeSidebar} className="hover:text-cyan-800">
            Terms
          </Link>
          <Link to="/about" onClick={closeSidebar} className="hover:text-cyan-800">
            About
          </Link>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
      <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/logo-icon.svg"
            alt=""
            width="36"
            height="36"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-extrabold tracking-tight text-slate-950">
            FileFluxa
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={sidebarOpen}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/15"
        >
          {sidebarOpen ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </header>

      <aside className="hidden w-[286px] shrink-0 border-r border-slate-200 bg-white md:flex md:min-h-screen md:flex-col">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation overlay"
              onClick={closeSidebar}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] md:hidden"
            />

            <motion.aside
              initial={reduceMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'tween', duration: 0.22, ease: 'easeOut' }
              }
              className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mb-6 hidden items-center justify-between md:flex">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-cyan-700">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              <span>Simple tools. Smoother workflows.</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
              <Command aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Press / to search tools</span>
            </div>
          </div>

          {children}
        </div>

        <footer className="border-t border-slate-200 bg-white/80 px-4 py-5 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-xs leading-5 text-slate-500">
              © 2026 FileFluxa. All rights reserved.
              <span className="hidden sm:inline"> Built for simpler file workflows.</span>
            </p>

            <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Browser tools available
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
