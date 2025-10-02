import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportButton } from "@/components/support-button";
import { ArrowRight, Shield, TrendingUp, Wallet, Users, Clock, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Image 
                  src="/hero_section_logo.png" 
                  alt="EarningWe Logo" 
                  width={150} 
                  height={150} 
                  className="object-contain"
                  style={{ 
                    filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.1))',
                    background: 'transparent'
                  }}
                />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Smart Investment Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of investors earning consistent daily returns through our secure, automated platform. 
              Deposit USDT and watch your portfolio grow with guaranteed daily ROI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8 py-6">
                <Link href="/signup">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link href="/plans">View Investment Plans</Link>
              </Button>
              <SupportButton 
                size="lg" 
                variant="ghost" 
                className="text-lg px-8 py-6 border border-gray-300 hover:bg-white/10"
              >
                Need Help?
              </SupportButton>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">1000+</div>
              <div className="text-sm text-muted-foreground">Active Investors</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">$2.5M+</div>
              <div className="text-sm text-muted-foreground">Total Invested</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">$450K+</div>
              <div className="text-sm text-muted-foreground">Earnings Paid</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Plans */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold">Choose Your Investment Plan</h2>
            <p className="text-xl text-muted-foreground">Start with as little as $50 and earn daily returns</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>Perfect for beginners</CardDescription>
                <div className="text-4xl font-bold text-blue-600">$50</div>
                <div className="text-sm text-muted-foreground">Minimum Investment</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>1.0% Daily ROI</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>30 Days Duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>30% Total Return</span>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/plans">Choose Plan</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-blue-500">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>Best value for growth</CardDescription>
                <div className="text-4xl font-bold text-blue-600">$200</div>
                <div className="text-sm text-muted-foreground">Minimum Investment</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>1.2% Daily ROI</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>45 Days Duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>54% Total Return</span>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/plans">Choose Plan</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Elite</CardTitle>
                <CardDescription>Maximum returns</CardDescription>
                <div className="text-4xl font-bold text-blue-600">$500</div>
                <div className="text-sm text-muted-foreground">Minimum Investment</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>1.5% Daily ROI</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>60 Days Duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>90% Total Return</span>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/plans">Choose Plan</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold">Why Choose EarningWe?</h2>
            <p className="text-xl text-muted-foreground">Built with security, transparency, and your success in mind</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Bank-Level Security</CardTitle>
                <CardDescription>Your funds are protected with enterprise-grade security</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Advanced encryption, secure authentication, and manual withdrawal approval ensure your investments are safe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Guaranteed Returns</CardTitle>
                <CardDescription>Consistent daily profits with transparent tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Watch your balance grow daily with our automated system. Track every transaction in real-time.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Wallet className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Easy Deposits & Withdrawals</CardTitle>
                <CardDescription>Seamless USDT transactions via TRC20</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Instant deposits through crypto payments. Quick withdrawal processing by our admin team.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold">How It Works</h2>
            <p className="text-xl text-muted-foreground">Start earning in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">1. Create Account</h3>
              <p className="text-muted-foreground">Sign up with your email and verify your account in seconds</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <Wallet className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">2. Make Deposit</h3>
              <p className="text-muted-foreground">Choose a plan and deposit USDT via our secure payment system</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold">3. Earn Daily</h3>
              <p className="text-muted-foreground">Watch your balance grow with guaranteed daily returns</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center space-y-8">
          <h2 className="text-4xl font-bold">Ready to Start Earning?</h2>
          <p className="text-xl opacity-90">
            Join thousands of successful investors and start building your passive income today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-6">
              <Link href="/signup">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/login">Login to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
