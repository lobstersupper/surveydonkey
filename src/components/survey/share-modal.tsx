'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, X, QrCode, Code, Download } from 'lucide-react';

interface ShareModalProps {
  surveyId: string;
  surveyTitle: string;
  surveyType?: 'poll' | 'personality';
  outcomeTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  surveyId,
  surveyTitle,
  surveyType = 'poll',
  outcomeTitle,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'embed'>('link');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://surveydonkey.com';
  const shareUrl = `${origin}/surveys/${surveyId}`;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="650" frameborder="0" style="border-radius: 12px; overflow: hidden;"></iframe>`;

  const defaultShareText = outcomeTitle
    ? `I took the "${surveyTitle}" test and got "${outcomeTitle}"! Discover your archetype on Survey Donkey:`
    : `Participate in "${surveyTitle}" on Survey Donkey:`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      defaultShareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${defaultShareText} ${shareUrl}`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `survey-${surveyId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Share {surveyType === 'personality' ? 'Test' : 'Survey'}
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{surveyTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Direct Link
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'qr'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <QrCode size={13} />
            QR Code
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'embed'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Code size={13} />
            Embed
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {activeTab === 'link' && (
            <>
              {outcomeTitle && (
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold">Your Result: </span>
                  {outcomeTitle}
                </div>
              )}

              {/* Copy URL Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Survey Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Share To Community
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={shareToTwitter}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    X (Twitter)
                  </button>
                  <button
                    onClick={shareToWhatsApp}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={shareToLinkedIn}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    LinkedIn
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    shareUrl
                  )}`}
                  alt="QR Code"
                  className="w-40 h-40"
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Scan with any phone camera to take this {surveyType === 'personality' ? 'test' : 'survey'}.
              </p>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
              >
                <Download size={13} />
                Download High-Res QR (.png)
              </button>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Embed this {surveyType === 'personality' ? 'personality test' : 'poll'} directly onto your website or blog.
              </p>
              <textarea
                readOnly
                rows={3}
                value={embedCode}
                className="w-full text-[11px] font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 resize-none focus:outline-none"
              />
              <button
                onClick={handleCopyEmbed}
                className="btn-primary text-xs py-2 px-4 w-full flex items-center justify-center gap-2"
              >
                {embedCopied ? <Check size={14} /> : <Copy size={14} />}
                {embedCopied ? 'Embed Code Copied' : 'Copy Embed Code'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
