import type { Localized } from "./types";

export const noticeTags = ["exam", "batch", "holiday", "result"] as const;
export type NoticeTag = (typeof noticeTags)[number];

export type Notice = {
  id: string;
  /** ISO date, e.g. "2026-11-02". */
  date: string;
  tag: NoticeTag;
  title: Localized;
  body: Localized;
  pinned?: boolean;
};

/**
 * Sample notices, shown in demo mode only. Real notices are posted from the
 * office (/dashboard/notices) and stored in the "Notices" tab of the Sheet.
 */
export const notices: Notice[] = [
  {
    id: "hsc-model-test",
    date: "2026-11-07",
    tag: "exam",
    pinned: true,
    title: { bn: "HSC মডেল টেস্ট — ৭ নভেম্বর থেকে", en: "HSC model tests start 7 November" },
    body: {
      bn: "পদার্থবিজ্ঞান ১ম পত্র দিয়ে শুরু। নিজ ব্যাচের সময়ে উপস্থিত থাকতে হবে; প্রবেশপত্র অফিস থেকে সংগ্রহ করুন।",
      en: "Starting with Physics 1st paper, in each batch's usual time. Collect admit cards from the office.",
    },
  },
  {
    id: "medical-new-batch",
    date: "2026-11-01",
    tag: "batch",
    title: { bn: "মেডিকেল ভর্তি — নতুন সকাল ব্যাচ", en: "Medical admission — new morning batch" },
    body: {
      bn: "আসন সীমিত। অনলাইনে ভর্তি হলে ২৪ ঘণ্টার মধ্যে আসন নিশ্চিত করা হয়।",
      en: "Limited seats. Online admissions are confirmed within 24 hours.",
    },
  },
  {
    id: "ssc-weekly-result",
    date: "2026-10-27",
    tag: "result",
    title: { bn: "SSC সাপ্তাহিক পরীক্ষার ফল প্রকাশিত", en: "SSC weekly test results published" },
    body: {
      bn: "অভিভাবকদের ফোনে SMS-এ ফল পাঠানো হয়েছে। খাতা দেখতে ক্লাস শিক্ষকের সাথে যোগাযোগ করুন।",
      en: "Results were sent to guardians by SMS. Ask the class teacher to see the marked scripts.",
    },
  },
  {
    id: "victory-day",
    date: "2026-12-16",
    tag: "holiday",
    title: { bn: "বিজয় দিবসে কোচিং বন্ধ", en: "Closed for Victory Day" },
    body: {
      bn: "১৬ ডিসেম্বর সব ব্যাচের ক্লাস বন্ধ থাকবে। পরদিন থেকে নিয়মিত ক্লাস চলবে।",
      en: "All batches are off on 16 December. Classes resume the next day.",
    },
  },
];
