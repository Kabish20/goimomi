import React from 'react';
import usePageSEO from '../../../hooks/usePageSEO';
import { ShieldCheck } from 'lucide-react';

const ZOHO_SHEET_URL =
  'https://sheet.zohopublic.in/sheet/publishedrange/62d39942bdecb0b2b7038a88612b7c9983f26a8af09ea1a09de8af601afc6b95?type=grid&mode=embed';

/**
 * B2B Umrah Group Tickets Portal
 * 
 * Embeds a real-time Zoho Sheet grid displaying live seat allocations,
 * charter flight departures, and wholesale agency pricing.
 */
const UmrahGroupTicketB2B = () => {
  usePageSEO(
    'B2B Umrah Group Tickets | Goimomi Holidays',
    'Official Goimomi Holidays B2B Umrah Group Tickets with live seat availability, group flight departures, and partner pricing for travel agents.',
    undefined,
    'Umrah group ticket, B2B Umrah tickets, Umrah group flight departures, travel agent Umrah rates, Goimomi Holidays'
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-[1140px] mx-auto space-y-5">
        {/* Header Title (No buttons) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <ShieldCheck size={13} />
                B2B Partner Portal
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Updates
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Umrah Group Tickets
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Real-time group flight departures, seat availability, and partner pricing for travel agents.
            </p>
          </div>
        </div>

        {/* Embedded Zoho Sheet Container */}
        <div className="w-full max-w-[724px] mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="w-full overflow-x-auto bg-slate-100">
              <iframe
                src={ZOHO_SHEET_URL}
                title="Umrah Group Ticket B2B"
                width="722"
                height="661"
                className="block min-w-[722px]"
                style={{ border: '1px solid #ccc' }}
                frameBorder="0"
                scrolling="no"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>

        {/* Partner Support Info (Plain text, no buttons) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-600 text-xs sm:text-sm">
          <span className="font-medium text-slate-700">
            Need bulk seat allocations or customized Umrah group assistance?
          </span>
          <div className="flex items-center gap-3 text-xs font-semibold text-emerald-800">
            <span>Tel: +91 8110082222</span>
            <span className="text-slate-300">•</span>
            <span>Email: hello@goimomi.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UmrahGroupTicketB2B;
