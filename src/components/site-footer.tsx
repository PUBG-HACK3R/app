"use client";

export function SiteFooter() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      {/* Simple Copyright Footer */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-center">
            <span className="text-sm text-gray-300">© 2024 WeEarn Mining. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
