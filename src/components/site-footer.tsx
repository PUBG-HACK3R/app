"use client";

import Link from "next/link";
import Image from "next/image";
import { openTawkToChat } from "@/components/tawk-to-chat";
import { 
  Bitcoin, 
  Coins, 
  TrendingUp, 
  Shield, 
  Users, 
  Mail, 
  Phone, 
  MapPin,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Github,
  MessageCircle
} from "lucide-react";

export function SiteFooter() {
  const cryptoData = [
    { name: "Bitcoin", symbol: "BTC", price: "$43,250", change: "+2.4%" },
    { name: "Ethereum", symbol: "ETH", price: "$2,580", change: "+1.8%" },
    { name: "USDT", symbol: "USDT", price: "$1.00", change: "0.0%" },
    { name: "BNB", symbol: "BNB", price: "$315", change: "+3.2%" },
  ];

  const quickLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Investment Plans", href: "/plans" },
    { name: "Wallet", href: "/wallet" },
    { name: "Referral Program", href: "/referrals" },
    { name: "Transaction History", href: "/wallet/history" },
  ];

  const supportLinks: Array<{name: string, href: string, onClick?: () => void}> = [
    { name: "Help Center", href: "/support" },
    { name: "Live Chat Support", href: "#", onClick: () => openTawkToChat() },
    { name: "Contact Us", href: "/contact" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      {/* Crypto Ticker */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Live Crypto Prices</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cryptoData.map((crypto) => (
              <div key={crypto.symbol} className="flex items-center justify-between p-3 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <Coins className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{crypto.symbol}</div>
                    <div className="text-xs text-gray-300">{crypto.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{crypto.price}</div>
                  <div className={`text-xs ${crypto.change.startsWith('+') ? 'text-green-400' : crypto.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'}`}>
                    {crypto.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="WeEarn Logo" 
                width={40} 
                height={40} 
                className="rounded-lg shadow-sm"
              />
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                WeEarn
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your trusted partner in cryptocurrency investment. Join thousands of investors earning consistent daily returns through our secure, automated platform.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">50K+ Users</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">Secure</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-white">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-blue-400 rounded-full group-hover:bg-white transition-colors"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-white">Support</h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  {link.onClick ? (
                    <button
                      onClick={link.onClick}
                      className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2 group w-full text-left"
                    >
                      <MessageCircle className="w-3 h-3 text-purple-400 group-hover:text-white transition-colors" />
                      {link.name}
                    </button>
                  ) : (
                    <Link 
                      href={link.href} 
                      className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-purple-400 rounded-full group-hover:bg-white transition-colors"></span>
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-white">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span className="text-gray-300">support@weearn.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-gray-300">San Francisco, CA</span>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="pt-4">
              <h4 className="font-medium text-white mb-3">Follow Us</h4>
              <div className="flex items-center gap-3">
                <Link href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors group">
                  <Twitter className="h-4 w-4 text-gray-300 group-hover:text-white" />
                </Link>
                <Link href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors group">
                  <Facebook className="h-4 w-4 text-gray-300 group-hover:text-white" />
                </Link>
                <Link href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors group">
                  <Instagram className="h-4 w-4 text-gray-300 group-hover:text-white" />
                </Link>
                <Link href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors group">
                  <Linkedin className="h-4 w-4 text-gray-300 group-hover:text-white" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <span>© 2024 WeEarn. All rights reserved.</span>
              <div className="flex items-center gap-2">
                <Bitcoin className="h-4 w-4 text-orange-400" />
                <span>Powered by Blockchain Technology</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>System Status: Online</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>SSL Secured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
