import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../../context/SiteSettingsContext";

export const WhatsAppButton: React.FC = () => {
  const { settings, loading } = useSiteSettings();
  const { pathname } = useLocation();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Show the chat prompt with a subtle delay to draw the user's attention
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Hide on login, signup, and forgot-password pages
  const isAuthPage = ["/login", "/signup", "/forgot-password"].includes(
    pathname,
  );
  if (loading || isAuthPage || !settings?.contactInfo?.phone) {
    return null;
  }

  // Format phone number by keeping only numeric digits
  const cleanPhone = settings.contactInfo.phone.replace(/[^0-9]/g, "");

  // Custom message for the chat redirect
  const defaultMessage = encodeURIComponent(
    "Hello! I am visiting the Muvira store and need assistance.",
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${defaultMessage}`;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3 font-instrument">
      {/* 1. Expandable Prompt Box */}
      {showPrompt && (
        <div
          className="relative bg-white border border-secondary200 rounded-xl px-4 py-3 shadow-xl max-w-[240px] text-left animate-fade-in flex flex-col gap-1 transition-all duration-300"
          style={{
            animation:
              "promptSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowPrompt(false)}
            className="absolute top-2 right-2 text-secondary400 hover:text-darkColor transition-colors p-0.5 rounded focus:outline-none"
            aria-label="Dismiss prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-secondary500 font-bold uppercase tracking-widest leading-none">
              Support Online
            </span>
          </div>

          <p className="text-xs font-bold text-darkColor pr-3 mt-1 leading-snug">
            Need styling or order help? Chat with us now!
          </p>
        </div>
      )}

      {/* 2. Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:shadow-2xl hover:scale-105 hover:bg-[#20ba5a] active:scale-95 transition-all duration-300 focus:outline-none"
        title="Chat on WhatsApp"
        aria-label="Chat with customer support on WhatsApp"
      >
        {/* Glow backdrop ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 group-hover:animate-ping -z-10" />

        {/* WhatsApp Logo SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="drop-shadow-xs"
        >
          <path d="M12 .003c-6.627 0-12 5.373-12 12 0 2.159.57 4.186 1.564 5.945L.03 23.822l5.984-1.57A11.961 11.961 0 0 0 12 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zm0 21.84c-1.846 0-3.655-.49-5.247-1.42l-.376-.223-3.557.933.95-3.468-.244-.388A9.82 9.82 0 0 1 2.16 12c0-5.424 4.417-9.84 9.84-9.84 5.424 0 9.84 4.416 9.84 9.84S17.424 21.84 12 21.84zm5.402-7.382c-.296-.148-1.75-.863-2.022-.962-.27-.1-.47-.148-.667.148-.198.297-.766.963-.94 1.162-.172.198-.345.223-.64.075-.297-.148-1.252-.462-2.385-1.472-.882-.787-1.478-1.76-1.65-2.057-.174-.297-.018-.458.13-.605.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.1-.198.05-.371-.025-.52-.075-.149-.667-1.61-.913-2.203-.24-.577-.48-.5-.667-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.79.371-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.04 2.875 1.185 3.073.149.198 2.043 3.12 4.95 4.378.69.299 1.23.478 1.65.613.694.22 1.326.19 1.826.115.556-.083 1.75-.715 2.00-1.405.247-.69.247-1.28.173-1.405-.075-.124-.27-.198-.567-.347z" />
        </svg>
      </a>

      {/* Slide-in styles */}
      <style>{`
        @keyframes promptSlideIn {
          from {
            transform: translateY(12px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default WhatsAppButton;
