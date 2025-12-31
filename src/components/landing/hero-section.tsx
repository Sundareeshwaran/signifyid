"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  BookOpen,
  Menu,
  X,
  Key,
  Users,
  Lock,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useHeroAnimation } from "@/hooks/use-gsap";

export function HeroSection() {
  const heroRef = useHeroAnimation<HTMLDivElement>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              loading="lazy"
              src="/logo.svg"
              alt="Signify iD"
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <span className="font-bold text-lg sm:text-xl tracking-tight">
              Signify iD
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90 font-medium shadow-lg shadow-primary/20">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-48 border-t" : "max-h-0"
          }`}
        >
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-center font-medium"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full justify-center bg-primary hover:bg-primary/90 font-medium">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          {/* Mesh gradient background */}
          <div className="absolute inset-0 mesh-gradient opacity-80" />

          {/* Animated grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_20%,#000_60%,transparent_100%)] opacity-30 animate-grid" />

          {/* Central glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-gradient-to-b from-primary/25 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        </div>

        {/* Floating Abstract Elements - Left Side */}
        <div className="absolute left-[5%] top-[20%] hidden lg:block animate-float">
          <div className="glass-card p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Sessions</p>
                <p className="font-semibold text-lg">24,856</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-[8%] bottom-[25%] hidden lg:block animate-float-delayed">
          <div className="glass-card p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Security Score</p>
                <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                  98.7%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Abstract Elements - Right Side */}
        <div className="absolute right-[5%] top-[25%] hidden lg:block animate-float-delayed">
          <div className="glass-card p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organizations</p>
                <p className="font-semibold text-lg">1,250+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-[8%] bottom-[30%] hidden lg:block animate-float">
          <div className="glass-card p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MFA Enabled</p>
                <p className="font-semibold text-lg">100%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-24 lg:py-32">
          <div
            ref={heroRef}
            className="max-w-5xl mx-auto text-center space-y-10"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-5 py-2.5 rounded-full text-sm font-medium backdrop-blur-sm shadow-sm">
              <Shield className="h-4 w-4" />
              Enterprise Identity Management
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
              Secure Identity for the{" "}
              <span className="text-shimmer">Modern Enterprise</span>
            </h1>

            {/* Value Proposition */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Multi-tenant Identity Provider with OAuth2/OIDC single sign-on,
              powerful role-based access control, and enterprise-grade security.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/register">
                <Button
                  size="lg"
                  className="text-lg px-10 h-16 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 font-semibold"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs" target="_blank">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 h-16 border-2 hover:bg-accent/50 transition-all duration-300 hover:-translate-y-1 font-semibold"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  View Docs
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="pt-8 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Trusted by security-conscious teams worldwide
              </p>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-background flex items-center justify-center"
                    >
                      <span className="text-xs font-medium text-primary">
                        {String.fromCharCode(64 + i)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">10,000+</p>
                  <p className="text-xs text-muted-foreground">
                    Active developers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
