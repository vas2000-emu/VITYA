'use client'

import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'

export function LandingPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Email sign in:', email)
    setAuthenticated(true)
  }

  const handleGoogleSignIn = () => {
    console.log('Google OAuth initiated')
    setAuthenticated(true)
  }

  const handleGitHubSignIn = () => {
    console.log('GitHub OAuth initiated')
    setAuthenticated(true)
  }

  const handleLearn = () => {
    document.getElementById('learn-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCommunity = () => {
    document.getElementById('community-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded" />
            <span className="font-bold text-lg">MoldLocal</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={handleLearn}
              className="px-3 py-2 text-sm hover:bg-zinc-800 rounded"
            >
              Learn
            </button>
            <button
              onClick={handleCommunity}
              className="px-3 py-2 text-sm hover:bg-zinc-800 rounded"
            >
              Community
            </button>
            <button
              onClick={handleLearn}
              className="px-3 py-2 text-sm hover:bg-zinc-800 rounded"
            >
              Documentation
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => toast('Region selection coming soon', { description: 'Currently serving US suppliers only.' })}
            className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-zinc-800 rounded"
          >
            US
            <ChevronDown className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => setAuthenticated(true)}
            className="px-4 py-2 text-sm hover:bg-zinc-800 rounded"
          >
            Sign In
          </button>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-zinc-800 rounded"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-900 px-4 py-3 flex flex-col gap-1">
            <button onClick={handleLearn} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 rounded">Learn</button>
            <button onClick={handleCommunity} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 rounded">Community</button>
            <button onClick={handleLearn} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 rounded">Documentation</button>
          </div>
        )}
      </nav>

      {/* Hero Section with Sign In */}
      <div className="flex items-center justify-center bg-zinc-950 p-6 min-h-[calc(100vh-57px)]">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Hero Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm text-blue-400">MoldLocal Web</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              AI-Powered Parametric CAD
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                for Injection Molding
              </span>
            </h1>

            <p className="text-lg text-zinc-400 max-w-xl">
              MoldLocal is a next-generation solution that gives you AI-assisted parametric
              modeling, real-time manufacturing analysis, and intelligent design suggestions
              for your everyday engineering needs.
            </p>
          </div>

          {/* Right - Sign In Form */}
          <div className="relative">
            <div className="relative bg-zinc-900 rounded-lg p-8 border border-zinc-800">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Sign in to continue</h3>
                  <p className="text-zinc-400">Access your MoldLocal workspace</p>
                </div>

                <form onSubmit={handleEmailSignIn}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-zinc-400">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!email.trim()) {
                          toast.error('Enter your email first', { description: 'Type your email above then try again.' })
                          return
                        }
                        toast('Password reset link sent', { description: `Check ${email} for instructions.` })
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
                  >
                    Sign In
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-zinc-900 text-zinc-400">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors"
                  >
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={handleGitHubSignIn}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors"
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                </div>

                <div className="text-center text-sm text-zinc-400">
                  {"Don't have an account? "}
                  <button
                    type="button"
                    onClick={() => setAuthenticated(true)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learn Section */}
      <div id="learn-section" className="bg-zinc-900 border-t border-zinc-800 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Learn MoldLocal</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Master parametric CAD design and AI-assisted manufacturing analysis with our
              comprehensive learning resources.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="size-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Getting Started Guide</h3>
              <p className="text-zinc-400 mb-4">
                Learn the basics of parametric CAD modeling, feature trees, and constraints in
                under 30 minutes.
              </p>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="text-blue-400/50 text-sm font-medium cursor-not-allowed"
              >
                Start Tutorial
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="size-6 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Video Tutorials</h3>
              <p className="text-zinc-400 mb-4">
                Watch step-by-step video guides covering everything from basic sketches to
                advanced AI operations.
              </p>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="text-blue-400/50 text-sm font-medium cursor-not-allowed"
              >
                Watch Videos
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="size-6 text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Best Practices</h3>
              <p className="text-zinc-400 mb-4">
                Discover how to leverage AI suggestions for optimal design quality and
                manufacturability.
              </p>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="text-blue-400/50 text-sm font-medium cursor-not-allowed"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Community Section */}
      <div id="community-section" className="bg-zinc-950 border-t border-zinc-800 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Join the Community</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Connect with thousands of engineers, designers, and manufacturers using MoldLocal
              worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="size-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Discussion Forum</h3>
                  <p className="text-zinc-400 mb-4">
                    Ask questions, share your designs, and get help from experienced users and
                    our engineering team.
                  </p>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="px-4 py-2 bg-blue-600/40 rounded text-sm font-medium cursor-not-allowed"
                  >
                    Visit Forum
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="size-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Social Media</h3>
                  <p className="text-zinc-400 mb-4">
                    Follow us for the latest updates, tips, and showcase of amazing designs from
                    the community.
                  </p>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="px-4 py-2 bg-zinc-800/60 rounded text-sm font-medium border border-zinc-700 cursor-not-allowed"
                  >
                    Follow Us
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-semibold mb-3">Share Your Designs</h3>
            <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
              Show off your latest projects, get feedback from peers, and inspire others. The
              best designs are featured in our monthly showcase!
            </p>
            <button
              type="button"
              onClick={() => setAuthenticated(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium"
            >
              Upload Your Design
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-zinc-500 text-sm">
          <p>2026 MoldLocal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
