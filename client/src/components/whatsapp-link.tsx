import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";

interface WhatsAppLinkProps {
  phone: string | null | undefined;
  className?: string;
  showNumber?: boolean;
}

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

export function WhatsAppLink({ phone, className, showNumber = false }: WhatsAppLinkProps) {
  if (!phone) return null;
  
  const formattedNumber = formatPhoneForWhatsApp(phone);
  const whatsappUrl = `https://wa.me/${formattedNumber}`;
  
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 transition-colors",
        className
      )}
      title={`Abrir WhatsApp: ${phone}`}
      data-testid="link-whatsapp"
    >
      <SiWhatsapp className="h-4 w-4" />
      {showNumber && <span>{phone}</span>}
    </a>
  );
}

export function PhoneWithWhatsApp({ phone, className }: { phone: string | null | undefined; className?: string }) {
  if (!phone) return null;
  
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span>{phone}</span>
      <WhatsAppLink phone={phone} />
    </span>
  );
}
