import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrentPlansDisplay } from "@/components/current-plans-display";
import { WhatsAppGroupPopup } from "@/components/whatsapp-group-popup";
import { ReferralLevelsShowcase } from "@/components/referral-levels-showcase";
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Zap, 
  Bitcoin, 
  Cpu, 
  Activity
} from "lucide-react";

export default function MiningLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Image src="/logoC.png" alt="WeEarn Mining" width={32} height={32} />
              <span className="text-xl font-bold text-white">WeEarn Mining</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                  Start Mining
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 mb-4">
              🚀 New Bitcoin Mining Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Start Your <span className="bg-clip-text text-transparent text-orange-400">Bitcoin Mining</span> Journey Today!
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join thousands of miners earning daily returns through our professional Bitcoin mining operations. 
              No hardware, no maintenance, just pure mining profits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg">
                  <Bitcoin className="w-5 h-5 mr-2" />
                  Start Mining Now
                </Button>
              </Link>
              <Link href="/plans">
                <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-4 text-lg">
                  View Mining Plans
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">500+</div>
              <div className="text-gray-400">Active Miners</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">15 PH/s</div>
              <div className="text-gray-400">Total Hash Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">$2.5M+</div>
              <div className="text-gray-400">Paid Out</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">99.9%</div>
              <div className="text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose WeEarn Mining?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Professional Bitcoin mining with enterprise-grade equipment and renewable energy sources.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6 text-orange-400" />
                </div>
                <CardTitle className="text-white">Latest ASIC Miners</CardTitle>
                <CardDescription className="text-gray-400">
                  State-of-the-art ASIC S19 Pro miners with maximum efficiency and hash rate.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-white">Renewable Energy</CardTitle>
                <CardDescription className="text-gray-400">
                  100% renewable energy sources for sustainable and profitable mining operations.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Secure & Insured</CardTitle>
                <CardDescription className="text-gray-400">
                  Bank-grade security with full insurance coverage for all mining equipment.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Current Investment Plans */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Current Investment Plans</h2>
            <p className="text-gray-400">Choose the perfect plan for your investment goals</p>
          </div>
          <CurrentPlansDisplay />
        </div>
      </section>

      {/* Referral Levels System */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <ReferralLevelsShowcase className="text-white" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-3xl p-8 border border-orange-700/50">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Mining Bitcoin?</h2>
            <p className="text-gray-300 mb-6">
              Join our mining community and start earning daily returns from professional Bitcoin mining operations.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg">
                <Bitcoin className="w-5 h-5 mr-2" />
                Start Mining Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-400 text-sm">
            © 2024 WeEarn Mining. All rights reserved.
          </div>
        </div>
      </footer>

      {/* WhatsApp Group Popup */}
      <WhatsAppGroupPopup />
    </div>
  );
}
