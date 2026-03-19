"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import {
  WhatsappShareButton, WhatsappIcon,
  FacebookShareButton, FacebookIcon,
  FacebookMessengerShareButton, FacebookMessengerIcon,
  XShareButton, XIcon,
  LinkedinShareButton, LinkedinIcon,
  TelegramShareButton, TelegramIcon,
  RedditShareButton, RedditIcon,
  EmailShareButton, EmailIcon,
} from "react-share";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ICON_SIZE = 48;

// Teams has no react-share support — kept as a custom link
function TeamsShareButton({ url, title, description, author, children }: { url: string; title: string; description?: string; author?: string; children: React.ReactNode }) {
  const lines = [title];
  if (description) lines.push(description);
  if (author) lines.push(`By: ${author}`);
  lines.push(PLATFORM_CONTEXT);
  // Encode each line individually and join with literal %0A so Teams renders actual line breaks
  const msgText = lines.map((l) => encodeURIComponent(l)).join("%0A");
  const href = `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&preview=true&title=${encodeURIComponent(title)}&msgText=${msgText}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function TeamsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 2228.833 2073.333" xmlns="http://www.w3.org/2000/svg">
      <path fill="#5059C9" d="M1554.637,777.5h575.713c54.391,0,98.483,44.092,98.483,98.483v524.398c0,199.901-162.051,361.952-361.952,361.952h-1.711c-199.901,.028-361.975-162-362.004-361.901V828.971c0-28.427,23.044-51.471,51.471-51.471z"/>
      <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25"/>
      <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917"/>
      <path fill="#7B83EB" d="M1667.323,777.5H717.01c-53.743,1.33-96.257,45.931-95.01,99.676v598.105c-7.505,322.519,247.657,590.16,570.167,598.053,322.51-7.893,577.671-275.534,570.167-598.053V877.176c1.246-53.745-41.267-98.346-95.01-99.676z"/>
      <path opacity=".1" d="M1244,777.5v838.145c-.258,38.435-23.549,72.964-59.09,87.598-11.316,4.787-23.478,7.254-35.765,7.257H667.613c-6.738-17.105-12.958-34.21-18.142-51.833-18.144-59.477-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52H1244z"/>
      <path opacity=".2" d="M1192.167,777.5v889.978c-.002,12.287-2.47,24.449-7.257,35.765-14.634,35.541-49.163,58.833-87.598,59.09H691.975c-8.812-17.105-17.105-34.21-24.362-51.833-7.257-17.623-12.958-34.21-18.142-51.833-18.144-59.476-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52h475.313z"/>
      <path opacity=".2" d="M1192.167,777.5v786.312c-.395,52.223-42.632,94.46-94.855,94.855h-447.84c-18.144-59.476-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52h475.313z"/>
      <path opacity=".2" d="M1140.333,777.5v786.312c-.395,52.223-42.632,94.46-94.855,94.855H649.472c-18.144-59.476-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52h423.479z"/>
      <linearGradient id="teamsGrad" gradientUnits="userSpaceOnUse" x1="198.099" y1="1683.073" x2="942.234" y2="394.261" gradientTransform="matrix(1 0 0 -1 0 2075.333)">
        <stop offset="0" stopColor="#5a62c3"/>
        <stop offset=".5" stopColor="#4d55bd"/>
        <stop offset="1" stopColor="#3940ab"/>
      </linearGradient>
      <path fill="url(#teamsGrad)" d="M95.01,466.5h950.312c52.473,0,95.01,42.538,95.01,95.01v950.312c0,52.473-42.538,95.01-95.01,95.01H95.01c-52.473,0-95.01-42.538-95.01-95.01V561.51C0,509.038,42.538,466.5,95.01,466.5z"/>
      <path fill="#FFF" d="M820.211,828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"/>
    </svg>
  );
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  description?: string;
  author?: string;
}

const PLATFORM_CONTEXT = "Generate content with this workflow!";

export function ShareDialog({ open, onOpenChange, url, title, description, author }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  // Full share text used for all platforms that accept a message body
  const shareTitle = [title, description].filter(Boolean).join(" — ");
  const shareLines = [
    title,
    description ?? null,
    author ? `By: ${author}` : null,
    PLATFORM_CONTEXT,
  ].filter(Boolean) as string[];
  const shareText = shareLines.join("\n");
  const emailBody = [...shareLines, url].join("\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const buttonClass = "flex flex-col items-center gap-1.5 shrink-0 cursor-pointer";
  const labelClass = "text-xs text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-start justify-between border-b px-5 py-4 gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Share</h2>
            {title && <p className="mt-0.5 text-sm font-medium text-foreground truncate">{title}</p>}
            {description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>}
            {author && <p className="mt-1 text-xs text-muted-foreground">By {author}</p>}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Social icons */}
        <div className="px-5 py-4 overflow-x-auto">
          <div className="flex gap-4">
            <div className={buttonClass} onClick={() => onOpenChange(false)}>
              <TeamsShareButton url={url} title={title} description={description} author={author}>
                <TeamsIcon size={ICON_SIZE} />
              </TeamsShareButton>
              <span className={labelClass}>Teams</span>
            </div>

            <WhatsappShareButton url={url} title={shareTitle} className={buttonClass} onClick={() => onOpenChange(false)}>
              <WhatsappIcon size={ICON_SIZE} round />
              <span className={labelClass}>WhatsApp</span>
            </WhatsappShareButton>

            <FacebookMessengerShareButton url={url} appId="" className={buttonClass} onClick={() => onOpenChange(false)}>
              <FacebookMessengerIcon size={ICON_SIZE} round />
              <span className={labelClass}>Messenger</span>
            </FacebookMessengerShareButton>

            <FacebookShareButton url={url} quote={shareText} className={buttonClass} onClick={() => onOpenChange(false)}>
              <FacebookIcon size={ICON_SIZE} round />
              <span className={labelClass}>Facebook</span>
            </FacebookShareButton>

            <XShareButton url={url} title={shareText} className={buttonClass} onClick={() => onOpenChange(false)}>
              <XIcon size={ICON_SIZE} round />
              <span className={labelClass}>X</span>
            </XShareButton>

            <LinkedinShareButton url={url} title={title} summary={shareText} className={buttonClass} onClick={() => onOpenChange(false)}>
              <LinkedinIcon size={ICON_SIZE} round />
              <span className={labelClass}>LinkedIn</span>
            </LinkedinShareButton>

            <TelegramShareButton url={url} title={shareText} className={buttonClass} onClick={() => onOpenChange(false)}>
              <TelegramIcon size={ICON_SIZE} round />
              <span className={labelClass}>Telegram</span>
            </TelegramShareButton>

            <RedditShareButton url={url} title={shareText} className={buttonClass} onClick={() => onOpenChange(false)}>
              <RedditIcon size={ICON_SIZE} round />
              <span className={labelClass}>Reddit</span>
            </RedditShareButton>

            <EmailShareButton url={url} subject={title} body={emailBody} className={buttonClass}>
              <EmailIcon size={ICON_SIZE} round />
              <span className={labelClass}>Email</span>
            </EmailShareButton>
          </div>
        </div>

        {/* Copy link */}
        <div className="border-t px-5 py-4">
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              className="text-xs font-mono bg-muted"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button size="sm" onClick={() => void handleCopy()} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
