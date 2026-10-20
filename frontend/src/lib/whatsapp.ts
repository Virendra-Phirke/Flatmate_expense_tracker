import { formatPaise } from './utils';

export interface WhatsAppReminderOptions {
  debtorName: string;
  amountPaise: number;
  myUpiId?: string;
  myFullName?: string;
  householdName?: string;
  customNote?: string;
}

/**
 * Builds a polite, crystal-clear WhatsApp reminder message with optional UPI payment deep link
 */
export function buildWhatsAppReminderMessage({
  debtorName,
  amountPaise,
  myUpiId,
  myFullName,
  householdName,
  customNote,
}: WhatsAppReminderOptions): string {
  const firstName = debtorName.split(' ')[0] || debtorName;
  const formattedAmount = formatPaise(amountPaise);
  const amountRupees = (amountPaise / 100).toFixed(2);
  const fromName = myFullName?.split(' ')[0] || 'your flatmate';
  const hh = householdName ? ` (${householdName})` : '';

  let message = `Hey ${firstName}! 👋 Quick reminder from our Flat Ledger${hh}:\nYou have an outstanding balance of ${formattedAmount} with me.`;

  if (customNote) {
    message += `\nNote: ${customNote}`;
  }

  if (myUpiId && myUpiId.includes('@')) {
    const encodedName = encodeURIComponent(myFullName || 'Flatmate');
    const encodedNote = encodeURIComponent(`Flatmate Settlement - ${firstName}`);
    const upiLink = `upi://pay?pa=${myUpiId}&pn=${encodedName}&am=${amountRupees}&cu=INR&tn=${encodedNote}`;
    message += `\n\nPay directly via UPI (tap to open GPay/PhonePe/Paytm):\n${upiLink}`;
  }

  message += `\n\nThanks! 🙏\n— ${fromName}`;
  return message;
}

/**
 * Launches WhatsApp with pre-filled debt and payment reminder
 */
export function openWhatsAppReminder(options: WhatsAppReminderOptions): void {
  const message = buildWhatsAppReminderMessage(options);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
