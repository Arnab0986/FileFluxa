import React from 'react'
import { Link } from 'react-router-dom'
import { Image, FileText, FileCode, Headphones, Archive, Shield, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import { NAVIGATION_ITEMS } from '../components/AppShell'

const CATEGORY_ICONS = {
  'Image Studio': Image,
  'PDF Lab': FileText,
  'Document Converter': FileCode,
  'Audio Lab': Headphones,
  'Archive Tools': Archive,
}

export function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 border border-navy-800 p-8 md:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Zero-Cost Browser-First File Workspace</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Every file. Every format. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">One powerful workspace.</span>
          </h1>

          <p className="text-gray-300 text-base md:text-lg">
            Convert, compress, edit, merge, and organize your files instantly inside your browser. No mandatory login, no file uploads to servers, and absolute privacy guaranteed.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/image-studio"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pdf-lab"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-medium border border-navy-700 transition"
            >
              <span>Explore PDF Lab</span>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Free & Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No Account Required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Client-Side Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Powerful Tool Categories</h2>
          <p className="text-sm text-gray-400">Select a workspace below to start processing files instantly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className="group p-6 rounded-2xl bg-navy-900 border border-navy-800 hover:border-cyan-500/50 transition duration-300 flex flex-col justify-between shadow-lg hover:shadow-cyan-500/5"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold group-hover:text-cyan-400 transition">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-navy-800/80 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-cyan-400">
                  <span>Open workspace</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
