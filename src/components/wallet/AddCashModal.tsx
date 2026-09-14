import React, { useState, useEffect } from 'react';
import type { User, PaymentConfig } from '../../types';
import { tournamentService } from '../../services/tournamentService';
import { socketService } from '../../services/socketService';
import { soundFx } from '../../utils/sound';
import QRCode from 'qrcode';
import {
  X,
  Wallet,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  IndianRupee,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '../common/Button';

interface AddCashModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

export const AddCashModal: React.FC<AddCashModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState<number>(250);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [config, setConfig] = useState<PaymentConfig>({ upi_id: '6303134462@axl', payee_name: 'GearUp Esports' });
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedUtrData, setSubmittedUtrData] = useState<{ amount: number; utr: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUtrHelp, setShowUtrHelp] = useState(false);

  // Fetch payment configuration from server on mount
  useEffect(() => {
    if (isOpen) {
      tournamentService.getPaymentConfig().then(cfg => {
        if (cfg) setConfig(cfg);
      });
    }
  }, [isOpen]);

  // Listen for real-time admin UPI config updates
  useEffect(() => {
    const unsub = socketService.onPaymentConfigUpdated((newCfg) => {
      if (newCfg) setConfig(newCfg);
    });
    return () => unsub();
  }, []);

  // Listen for real-time wallet balance credit updates
  useEffect(() => {
    const unsub = socketService.onWalletUpdated((data) => {
      if (user && data.userId === user.id) {
        onSuccess?.(data.balance);
      }
    });
    return () => {
      unsub();
    };
  }, [user, onSuccess]);

  // Construct NPCI Standard UPI Intent URI
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(config.upi_id)}&pn=${encodeURIComponent(config.payee_name)}&am=${amount}&cu=INR&tn=GearUp%20Wallet%20TopUp`;

  // Generate dynamic QR code whenever amount or UPI ID changes
  useEffect(() => {
    if (isOpen && amount > 0) {
      QRCode.toDataURL(upiIntentUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0B131E',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, amount, upiIntentUrl]);

  if (!isOpen || !user) return null;

  const presets = [50, 100, 250, 500, 1000];

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(config.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleOpenUpiApp = () => {
    window.location.href = upiIntentUrl;
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUtr = utrNumber.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMessage('Please enter a valid 12-digit numeric UPI UTR / Ref Number.');
      return;
    }

    setIsSubmittingUtr(true);
    try {
      const res = await tournamentService.submitUtr({
        userId: user.id,
        amount: Number(amount),
        utr_number: cleanUtr
      });

      if (res.success) {
        soundFx.playSuccess();
        setSubmittedUtrData({ amount: Number(amount), utr: cleanUtr });
        setSubmissionSuccess(true);
        setUtrNumber('');
      } else {
        setErrorMessage(res.error || 'Failed to submit UTR. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error submitting UTR.';
      setErrorMessage(msg);
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handleModalClose = () => {
    setSubmissionSuccess(false);
    setSubmittedUtrData(null);
    setErrorMessage(null);
    setUtrNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#0F1A28] border border-[#1F324B] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5BD19B]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1F324B] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/20 text-[#5BD19B] flex items-center justify-center flex-shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5BD19B] tracking-wider uppercase font-display">
                GearUp Instant Wallet
              </span>
              <h3 className="text-lg font-black font-display uppercase text-white">
                Add Match Entry Cash
              </h3>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {submissionSuccess && submittedUtrData ? (
          /* Submission Success State */
          <div className="py-6 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/40 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h4 className="text-xl font-black font-display uppercase text-white">
                Payment Proof Submitted!
              </h4>
              <p className="text-xs text-zinc-300 mt-1">
                Your top-up request has been queued for admin verification.
              </p>
            </div>

            <div className="bg-[#0B131E] border border-[#1F324B] rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Amount:</span>
                <span className="text-white font-bold font-mono text-sm">₹{submittedUtrData.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">12-Digit UTR:</span>
                <span className="text-[#5BD19B] font-mono font-bold">{submittedUtrData.utr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Verification Status:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Clock size={12} className="animate-spin" /> Pending Approval (1-3 mins)
                </span>
              </div>
            </div>

            <div className="bg-[#152234] p-3 rounded-xl border border-[#1F324B] text-[11px] text-zinc-300 text-left flex items-start gap-2">
              <ShieldCheck size={16} className="text-[#5BD19B] flex-shrink-0 mt-0.5" />
              <span>
                As soon as the admin verifies your transaction, your wallet will be credited automatically in real time without refreshing.
              </span>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={handleModalClose}
              >
                Got It
              </Button>
            </div>
          </div>
        ) : (
          /* Normal Top-Up Flow */
          <div className="space-y-4">
            {/* Current Balance Bar */}
            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Current Balance</span>
              <span className="text-base sm:text-lg font-black font-display text-[#5BD19B]">
                ₹{user.wallet_balance}
              </span>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-3 text-red-300 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Amount Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-300 mb-1.5">
                1. Select Top-Up Amount
              </label>
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setAmount(p);
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-black font-display transition-all ${
                      amount === p
                        ? 'bg-[#5BD19B] text-[#0B131E] shadow-[0_0_12px_rgba(91,209,155,0.4)]'
                        : 'bg-[#152234] text-zinc-300 hover:text-white border border-[#1F324B]'
                    }`}
                  >
                    ₹{p}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="10"
                  max="50000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Math.max(0, Number(e.target.value)));
                    setErrorMessage(null);
                  }}
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl py-2 pl-8 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#5BD19B]"
                  placeholder="Custom Amount"
                />
              </div>
            </div>

            {/* Step 2: Scan QR & Pay */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-zinc-300">
                2. Scan & Pay via any UPI App
              </label>

              <div className="bg-[#0B131E] p-3.5 rounded-2xl border border-[#1F324B] text-center space-y-3">
                {/* Dynamic QR Code */}
                {qrDataUrl ? (
                  <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl shadow-lg flex items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt={`UPI QR Code for ₹${amount}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 mx-auto bg-[#152234] rounded-2xl flex items-center justify-center text-zinc-500">
                    <QrCode size={40} className="animate-pulse" />
                  </div>
                )}

                <div className="text-center">
                  <span className="text-[11px] text-zinc-400">Scan to pay: </span>
                  <span className="text-sm font-black font-display text-white">₹{amount}</span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Accepted: Google Pay • PhonePe • Paytm • BHIM • Cred
                  </span>
                </div>

                {/* UPI ID Copy & Mobile App Launcher */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex-1 bg-[#152234] hover:bg-[#1C2E46] border border-[#1F324B] text-zinc-200 hover:text-white rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedUpi ? <Check size={13} className="text-[#5BD19B]" /> : <Copy size={13} />}
                    <span>{copiedUpi ? 'Copied UPI ID!' : `Copy UPI: ${config.upi_id}`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenUpiApp}
                    className="sm:w-auto bg-[#5BD19B]/15 hover:bg-[#5BD19B]/25 border border-[#5BD19B]/40 text-[#5BD19B] rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    title="Tap to pay directly in your mobile UPI app"
                  >
                    <ExternalLink size={13} />
                    <span>Pay in App</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Enter 12-Digit UTR Form */}
            <form onSubmit={handleSubmitUtr} className="space-y-3 pt-1 border-t border-[#1F324B]">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-zinc-300">
                  3. Enter 12-Digit UPI UTR / Ref Number <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowUtrHelp(!showUtrHelp)}
                  className="text-[11px] text-[#5BD19B] hover:underline flex items-center gap-0.5"
                >
                  <HelpCircle size={12} /> Where to find?
                </button>
              </div>

              {showUtrHelp && (
                <div className="bg-[#152234] border border-[#1F324B] rounded-xl p-2.5 text-[11px] text-zinc-300 space-y-1 animate-fadeIn">
                  <p className="font-bold text-white">How to find your 12-digit UTR:</p>
                  <p>• <strong>Google Pay:</strong> Tap transaction → Look for <strong>"UPI transaction ID"</strong>.</p>
                  <p>• <strong>PhonePe:</strong> Tap transaction → Look for <strong>"UTR"</strong>.</p>
                  <p>• <strong>Paytm:</strong> Tap transaction → Look for <strong>"UPI Ref No"</strong>.</p>
                </div>
              )}

              <div className="relative">
                <input
                  required
                  type="text"
                  maxLength={12}
                  value={utrNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setUtrNumber(clean);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. 425619382012"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-wider text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold ${
                  utrNumber.length === 12 ? 'text-[#5BD19B]' : 'text-zinc-500'
                }`}>
                  {utrNumber.length === 12 ? '✓ 12/12 digits' : `${utrNumber.length}/12`}
                </span>
              </div>

              {/* Submit UTR Button */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={isSubmittingUtr || utrNumber.length !== 12 || amount <= 0}
                className="py-3 font-display uppercase tracking-wider"
              >
                {isSubmittingUtr ? (
                  <span>Submitting UTR Proof...</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <IndianRupee size={16} /> Submit UTR for ₹{amount} Credit
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
