import React from "react";
import { Phone, MapPin, Mail, Clock, X, Copy, Check } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName?: string;
  phone?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  targetName = "Nova Lamination (Md. Abdur Rahim)",
  phone = "+880 1711-456789",
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-green-100 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#2e7d46] flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Direct Contact</h3>
              <p className="text-xs text-gray-500">{targetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Direct Phone:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-emerald-900">{phone}</span>
              <button
                onClick={handleCopy}
                className="p-1 text-[#2e7d46] hover:bg-emerald-100 rounded transition-colors"
                title="Copy phone number"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-700">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>Banglabazar Print Market, 38/2 Millat Complex, Dhaka-1100</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Shop Hours: 9:00 AM – 9:00 PM (Sat - Wed)</span>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="flex-1 py-2.5 px-4 bg-[#2e7d46] text-white font-semibold text-xs rounded-xl hover:bg-[#256338] transition-colors flex items-center justify-center gap-2 text-center"
          >
            <Phone className="w-4 h-4" />
            Call Directly
          </a>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
