import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportButton } from "@/components/support-button";
import { 
  FloatingCryptoIcons, 
  PulsingGlow, 
  AnimatedCounter, 
  CryptoTicker, 
  GlowingBorder,
  ParticleBackground 
} from "@/components/crypto-animations";
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Wallet, 
  Users, 
  Clock, 
  CheckCircle,
  Bitcoin,
  Coins,
  Zap,
  Star,
  Globe,
  Lock,
  BarChart3,
  Smartphone,
  CreditCard,
  DollarSign,
  Target,
  Award,
  Sparkles
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <ParticleBackground />
        <FloatingCryptoIcons />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-crypto-pulse"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-20 lg:py-24">
          <div className="text-center space-y-6 sm:space-y-8">
            {/* Logo */}
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <Image 
                  src="/logoC.png" 
                  alt="EarningWe Logo" 
                  width={120} 
                  height={120} 
                  className="relative object-contain sm:w-[150px] sm:h-[150px]"
                  style={{ 
                    filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.3))',
                    background: 'transparent'
                  }}
                />
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 mr-2" />
                #1 Crypto Earning Platform
              </Badge>
            </div>

            {/* Main Heading */}
            <div className="space-y-4 animate-fade-in-up">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight">
                Earn Daily Returns
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-shimmer">
                  With Crypto
                </span>
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                Join <AnimatedCounter value={50000} suffix="+" className="text-blue-400 font-semibold" /> investors earning 
                <span className="text-green-400 font-semibold"> 1-3% daily returns</span> through our 
                AI-powered crypto investment platform. Start with just $50 USDT.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 stagger-fade-in">
              <GlowingBorder>
                <Button 
                  size="lg" 
                  asChild 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-8 py-6 rounded-xl shadow-2xl hover-lift"
                >
                  <Link href="/signup">
                    <Zap className="mr-2 h-5 w-5 animate-bounce-slow" />
                    Start Earning Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </GlowingBorder>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white text-lg px-8 py-6 rounded-xl backdrop-blur-sm hover-scale"
              >
                <Link href="/plans">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  View Plans
                </Link>
              </Button>
              <SupportButton 
                size="lg" 
                variant="ghost" 
                className="text-gray-300 hover:text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl border border-gray-600 hover-glow"
              >
                <Globe className="mr-2 h-5 w-5" />
                Get Help
              </SupportButton>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 pt-8 text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-sm">SSL Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-400" />
                <span className="text-sm">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-400" />
                <span className="text-sm">Licensed Platform</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Crypto Ticker */}
      <CryptoTicker 
        prices={[
          { symbol: "BTC", price: "67,234", change: "+2.4%" },
          { symbol: "ETH", price: "3,456", change: "+1.8%" },
          { symbol: "USDT", price: "1.00", change: "+0.0%" },
          { symbol: "BNB", price: "634", change: "+3.2%" },
          { symbol: "SOL", price: "178", change: "+5.1%" },
          { symbol: "ADA", price: "0.68", change: "-1.2%" },
        ]}
      />

      {/* Live Stats Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-slate-800 to-slate-900 border-y border-slate-700">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-8 sm:mb-12 animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Live Platform Statistics</h2>
            <p className="text-gray-400">Real-time data from our crypto earning ecosystem</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 stagger-fade-in">
            <PulsingGlow>
              <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm hover-lift">
                <CardContent className="p-4 sm:p-6 text-center">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400 mx-auto mb-2 animate-bounce-slow" />
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    <AnimatedCounter value={50000} suffix="+" />
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">Active Investors</div>
                </CardContent>
              </Card>
            </PulsingGlow>
            <PulsingGlow>
              <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm hover-lift">
                <CardContent className="p-4 sm:p-6 text-center">
                  <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-green-400 mx-auto mb-2 animate-bounce-slow" />
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    $<AnimatedCounter value={12.5} />M+
                  </div>
                  <div className="text-xs sm:text-sm text-green-200">Total Invested</div>
                </CardContent>
              </Card>
            </PulsingGlow>
            <PulsingGlow>
              <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50 backdrop-blur-sm hover-lift">
                <CardContent className="p-4 sm:p-6 text-center">
                  <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400 mx-auto mb-2 animate-bounce-slow" />
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    $<AnimatedCounter value={2.8} />M+
                  </div>
                  <div className="text-xs sm:text-sm text-purple-200">Earnings Paid</div>
                </CardContent>
              </Card>
            </PulsingGlow>
            <PulsingGlow>
              <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50 backdrop-blur-sm hover-lift">
                <CardContent className="p-4 sm:p-6 text-center">
                  <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-orange-400 mx-auto mb-2 animate-bounce-slow" />
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    <AnimatedCounter value={99.9} />%
                  </div>
                  <div className="text-xs sm:text-sm text-orange-200">Uptime</div>
                </CardContent>
              </Card>
            </PulsingGlow>
          </div>
        </div>
      </section>

      {/* Crypto Investment Plans Preview */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center space-y-4 sm:space-y-6 mb-12 sm:mb-16">
            <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2">
              <Bitcoin className="h-4 w-4 mr-2" />
              AI-Powered Investment Plans
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Choose Your 
              <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Crypto Journey
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Start with just $50 USDT and watch your investment grow with guaranteed daily returns
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Starter Plan */}
            <Card className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-white">Starter Portfolio</CardTitle>
                <CardDescription className="text-gray-400">Perfect for crypto beginners</CardDescription>
                <div className="space-y-2 pt-4">
                  <div className="text-3xl sm:text-4xl font-bold text-white">$50</div>
                  <div className="text-sm text-gray-400">Minimum Investment</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-400">1.0%</div>
                    <div className="text-xs text-gray-400">Daily ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-400">30 Days</div>
                    <div className="text-xs text-gray-400">Duration</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Daily automated payouts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>24/7 customer support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Basic analytics dashboard</span>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg" asChild>
                  <Link href="/plans">
                    <Coins className="mr-2 h-4 w-4" />
                    Start Investing
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan - Most Popular */}
            <Card className="relative bg-gradient-to-br from-purple-900/80 to-blue-900/80 border-purple-500 backdrop-blur-sm scale-105 hover:scale-110 transition-all duration-300 group">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center pb-4 pt-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-white">Professional Growth</CardTitle>
                <CardDescription className="text-purple-200">Best value for serious investors</CardDescription>
                <div className="space-y-2 pt-4">
                  <div className="text-3xl sm:text-4xl font-bold text-white">$200</div>
                  <div className="text-sm text-purple-200">Minimum Investment</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-900/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-400">1.2%</div>
                    <div className="text-xs text-purple-200">Daily ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-300">45 Days</div>
                    <div className="text-xs text-purple-200">Duration</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Priority customer support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Advanced analytics & insights</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Portfolio risk management</span>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg" asChild>
                  <Link href="/plans">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Earning
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm hover:border-orange-500/50 transition-all duration-300 group sm:col-span-2 lg:col-span-1">
              <CardHeader className="text-center pb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-white">Elite Investment</CardTitle>
                <CardDescription className="text-gray-400">Maximum returns for VIPs</CardDescription>
                <div className="space-y-2 pt-4">
                  <div className="text-3xl sm:text-4xl font-bold text-white">$500</div>
                  <div className="text-sm text-gray-400">Minimum Investment</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-400">1.5%</div>
                    <div className="text-xs text-gray-400">Daily ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-400">60 Days</div>
                    <div className="text-xs text-gray-400">Duration</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>VIP customer support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Personal investment advisor</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Exclusive investment strategies</span>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg" asChild>
                  <Link href="/plans">
                    <Bitcoin className="mr-2 h-4 w-4" />
                    Go Elite
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" asChild className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white rounded-xl">
              <Link href="/plans">
                <BarChart3 className="mr-2 h-5 w-5" />
                View All Investment Plans
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Features */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center space-y-4 sm:space-y-6 mb-12 sm:mb-16">
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Trusted by 50,000+ Investors
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Why Choose 
              <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                EarningWe?
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Built with cutting-edge technology, bank-level security, and your financial success in mind
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Security Feature */}
            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm hover:border-blue-500/70 transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl text-white">Military-Grade Security</CardTitle>
                <CardDescription className="text-blue-200">Your crypto assets are fortress-protected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Cold storage wallets</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Multi-signature protection</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>24/7 security monitoring</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Returns Feature */}
            <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm hover:border-green-500/70 transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl text-white">Guaranteed Daily Returns</CardTitle>
                <CardDescription className="text-green-200">AI-powered crypto trading algorithms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-green-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>1-3% daily ROI guaranteed</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-green-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Automated profit distribution</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-green-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Real-time earnings tracking</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-green-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Transparent profit reports</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Easy Transactions */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50 backdrop-blur-sm hover:border-purple-500/70 transition-all duration-300 group sm:col-span-2 lg:col-span-1">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl text-white">Lightning-Fast Transactions</CardTitle>
                <CardDescription className="text-purple-200">Seamless USDT deposits & withdrawals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Instant USDT TRC20 deposits</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Fast withdrawal processing</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Low transaction fees</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-purple-100">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Mobile-optimized interface</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features Row */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mt-8 sm:mt-12">
            <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/30 border-orange-700/30 backdrop-blur-sm text-center p-6">
              <Smartphone className="h-10 w-10 text-orange-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Mobile First</h3>
              <p className="text-sm text-orange-200">Optimized for all devices</p>
            </Card>
            
            <Card className="bg-gradient-to-br from-pink-900/30 to-pink-800/30 border-pink-700/30 backdrop-blur-sm text-center p-6">
              <Clock className="h-10 w-10 text-pink-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">24/7 Support</h3>
              <p className="text-sm text-pink-200">Round-the-clock assistance</p>
            </Card>
            
            <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/30 border-cyan-700/30 backdrop-blur-sm text-center p-6">
              <BarChart3 className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
              <p className="text-sm text-cyan-200">Detailed performance insights</p>
            </Card>
            
            <Card className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/30 border-indigo-700/30 backdrop-blur-sm text-center p-6">
              <Users className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Community</h3>
              <p className="text-sm text-indigo-200">Join 50K+ investors</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Ready to Start Earning?
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto">
              Join thousands of successful crypto investors who are already earning daily returns with EarningWe
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                asChild 
                className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                <Link href="/signup">
                  <Zap className="mr-2 h-5 w-5" />
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="border-2 border-white text-white hover:bg-white hover:text-purple-600 text-lg px-8 py-6 rounded-xl backdrop-blur-sm"
              >
                <Link href="/plans">
                  <Bitcoin className="mr-2 h-5 w-5" />
                  View Investment Plans
                </Link>
              </Button>
            </div>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center items-center gap-8 pt-8 opacity-80">
              <div className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5" />
                <span className="text-sm">SSL Secured</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Lock className="h-5 w-5" />
                <span className="text-sm">Encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Award className="h-5 w-5" />
                <span className="text-sm">Licensed</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                <span className="text-sm">50K+ Users</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
