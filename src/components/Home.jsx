
import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Zap,
  Clock3,
  LockKeyhole,
  Layers3,
  Image as ImageIcon,
  FileText,
} from 'lucide-react'
import { NAVIGATION_ITEMS } from './AppShell'

const highlights = [
  'Free to use',
  'No account required',
  'Privacy-conscious tools',
]

const featuredTools = [
  {
    path: '/image-studio',
    title: 'Image Studio',
    description: 'Compress, resize and convert your images.',
    icon: ImageIcon,
    iconStyle: 'bg-violet-100 text-violet-700',
    tag: 'IMAGE TOOLS',
  },
  {
    path: '/pdf-lab',
    title: 'PDF Lab',
    description: 'Merge, extract and rotate PDF pages.',
    icon: FileText,
    iconStyle: 'bg-sky-100 text-sky-700',
    tag: 'PDF TOOLS',
  },
]

export function Home() {
  const reduceMotion = useReducedMotion()

  const entrance = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: 'easeOut' },
      }

  const cardEntrance = index =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.35,
            delay: Math.min(index * 0.055, 0.25),
            ease: 'easeOut',
          },
        }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-10 pb-8 sm:space-y-14">
      {/* Hero */}
      <motion.section
        {...entrance}
        aria-labelledby="home-heading"
        className="relative isolate overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50 px-5 py-8 shadow-[0_12px_50px_rgba(15,23,42,0.045)] sm:px-8 sm:py-10 lg:px-12 lg:py-14"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 right-1/4 -z-10 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl"
        />

        <div className="relative grid items-center gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 shadow-sm sm:text-xs">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Your all-in-one file workspace
            </div>

            <h1
              id="home-heading"
              className="mt-6 text-4xl font-black leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl"
            >
              Every file.
              <br />
              Every format.
              <br />
              <span className="bg-gradient-to-r from-indigo-700 via-violet-600 to-sky-600 bg-clip-text text-transparent">
                One powerful workspace.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              Convert, compress, resize, merge and organize files with
              practical tools designed to make everyday file workflows
              simpler.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/image-studio"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25"
              >
                Start processing
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/pdf-lab"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15"
              >
                <FileCheck2
                  aria-hidden="true"
                  className="h-4 w-4 text-indigo-600"
                />
                Explore PDF Lab
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-slate-200/80 pt-5">
              {highlights.map(highlight => (
                <div
                  key={highlight}
                  className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-emerald-600"
                  />
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          {/* Decorative workspace illustration */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="relative mx-auto hidden w-full max-w-[300px] xl:block"
          >
            <div className="absolute -inset-5 rounded-[32px] bg-gradient-to-br from-indigo-200/40 to-sky-200/40 blur-2xl" />

            <div className="relative rounded-3xl border border-white bg-white/90 p-5 shadow-[0_24px_70px_rgba(30,41,59,0.12)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    FileFluxa
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your creative workspace
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Layers3 className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {featuredTools.map(tool => {
                  const Icon = tool.icon

                  return (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.iconStyle}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-800">
                          {tool.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {tool.description}
                        </span>
                      </span>

                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                    </Link>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-xs font-semibold text-emerald-800">
                  Your workflow, made simpler
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Workspace overview */}
      <motion.section
        {...cardEntrance(0)}
        aria-label="Workspace overview"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {[
          {
            icon: Layers3,
            title: `${NAVIGATION_ITEMS.length} tool categories`,
            subtitle: 'Explore your available workspaces',
            style: 'bg-indigo-50 text-indigo-700',
          },
          {
            icon: LockKeyhole,
            title: 'Privacy-conscious',
            subtitle: 'Client-side tools where supported',
            style: 'bg-emerald-50 text-emerald-700',
          },
          {
            icon: Clock3,
            title: 'Simple workflow',
            subtitle: 'Open a tool and get started',
            style: 'bg-sky-50 text-sky-700',
          },
        ].map(item => {
          const Icon = item.icon

          return (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.style}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.subtitle}
                </p>
              </div>
            </div>
          )
        })}
      </motion.section>

      {/* Tool categories */}
      <section aria-labelledby="tools-heading" className="space-y-6">
        <motion.div
          {...cardEntrance(1)}
          className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Explore the workspace
            </div>

            <h2
              id="tools-heading"
              className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"
            >
              Your tools, all in one place
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              Choose a workspace to get started with your files.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {NAVIGATION_ITEMS.length} workspaces
          </span>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {NAVIGATION_ITEMS.map((item, index) => {
            const Icon = item.icon

            return (
              <motion.div
                key={item.path}
                {...cardEntrance(index + 2)}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className="h-full"
              >
                <Link
                  to={item.path}
                  className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.025)] transition duration-200 hover:border-indigo-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.075)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 sm:p-6"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition duration-200 group-hover:border-indigo-200 group-hover:bg-indigo-100">
                        <Icon
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      </span>

                      <span className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                        <ArrowRight
                          aria-hidden="true"
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-700 sm:text-lg">
                      {item.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.desc}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-600 transition-colors group-hover:text-indigo-700">
                      Open workspace
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      Explore tool
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Privacy note */}
      <motion.section
        {...cardEntrance(4)}
        className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-5 sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Your files deserve thoughtful handling
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Some tools process files directly in your browser. Processing
                behavior depends on the selected tool, so check its details
                when working with sensitive files.
              </p>
            </div>
          </div>

          <Link
            to="/privacy"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-indigo-700 transition hover:text-indigo-900"
          >
            Privacy details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.section>
    </div>
  )
}

export default Home
