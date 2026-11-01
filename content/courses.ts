import type { Locale } from "@/i18n/routing";
import type { Localized } from "./types";

export const levels = ["ssc", "hsc", "admission"] as const;
export type Level = (typeof levels)[number];

export const weekdays = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
export type Weekday = (typeof weekdays)[number];

export type Batch = {
  id: string;
  label: Localized;
  schedule: Localized;
  /** Machine-readable `schedule` (Dhaka time, 24h) for the class routine and calendar export. */
  slot: { days: Weekday[]; start: string; end: string };
};

/** Subject illustration for a course; each theme draws it in its own style. */
export type CourseArt = "flask" | "ledger" | "microscope" | "growth" | "graduation" | "medical";

export type Course = {
  id: string;
  level: Level;
  art: CourseArt;
  name: Localized;
  description: Localized;
  subjects: Localized<string[]>;
  duration: Localized;
  /** Same as `duration`, as a number, for the fee calculator. */
  durationMonths: number;
  /** Fees in BDT. */
  monthlyFee: number;
  admissionFee: number;
  seatsTotal: number;
  seatsLeft: number;
  batches: Batch[];
  featured?: boolean;
};

export const courses: Course[] = [
  {
    id: "ssc-science",
    level: "ssc",
    art: "flask",
    name: { bn: "SSC বিজ্ঞান (৯ম–১০ম শ্রেণি)", en: "SSC Science (Class 9–10)" },
    description: {
      bn: "বোর্ড সিলেবাস অনুযায়ী অধ্যায়ভিত্তিক ক্লাস, সাপ্তাহিক পরীক্ষা ও মাসিক অভিভাবক রিপোর্ট।",
      en: "Chapter-by-chapter classes following the board syllabus, weekly tests and a monthly progress report for parents.",
    },
    subjects: {
      bn: ["পদার্থবিজ্ঞান", "রসায়ন", "উচ্চতর গণিত", "জীববিজ্ঞান", "সাধারণ গণিত"],
      en: ["Physics", "Chemistry", "Higher Math", "Biology", "General Math"],
    },
    duration: { bn: "১২ মাস", en: "12 months" },
    durationMonths: 12,
    monthlyFee: 2500,
    admissionFee: 1000,
    seatsTotal: 25,
    seatsLeft: 7,
    batches: [
      {
        id: "morning",
        label: { bn: "সকাল ব্যাচ", en: "Morning batch" },
        schedule: { bn: "শনি, সোম, বুধ · সকাল ৮টা–১০টা", en: "Sat, Mon, Wed · 8–10 AM" },

        slot: { days: ["sat", "mon", "wed"], start: "08:00", end: "10:00" },
      },
      {
        id: "evening",
        label: { bn: "বিকাল ব্যাচ", en: "Afternoon batch" },
        schedule: { bn: "রবি, মঙ্গল, বৃহস্পতি · বিকাল ৪টা–৬টা", en: "Sun, Tue, Thu · 4–6 PM" },

        slot: { days: ["sun", "tue", "thu"], start: "16:00", end: "18:00" },
      },
    ],
    featured: true,
  },
  {
    id: "ssc-business",
    level: "ssc",
    art: "ledger",
    name: { bn: "SSC ব্যবসায় শিক্ষা", en: "SSC Business Studies" },
    description: {
      bn: "হিসাববিজ্ঞানের ভিত্তি মজবুত করতে হাতে-কলমে অনুশীলন, সাথে নিয়মিত মডেল টেস্ট।",
      en: "Hands-on practice to build a strong accounting foundation, with regular model tests.",
    },
    subjects: {
      bn: ["হিসাববিজ্ঞান", "ফিন্যান্স ও ব্যাংকিং", "ব্যবসায় উদ্যোগ", "সাধারণ গণিত"],
      en: ["Accounting", "Finance & Banking", "Business Entrepreneurship", "General Math"],
    },
    duration: { bn: "১২ মাস", en: "12 months" },
    durationMonths: 12,
    monthlyFee: 2000,
    admissionFee: 1000,
    seatsTotal: 25,
    seatsLeft: 11,
    batches: [
      {
        id: "evening",
        label: { bn: "বিকাল ব্যাচ", en: "Afternoon batch" },
        schedule: { bn: "শনি, সোম, বুধ · বিকাল ৪টা–৬টা", en: "Sat, Mon, Wed · 4–6 PM" },

        slot: { days: ["sat", "mon", "wed"], start: "16:00", end: "18:00" },
      },
    ],
  },
  {
    id: "hsc-science",
    level: "hsc",
    art: "microscope",
    name: { bn: "HSC বিজ্ঞান (একাদশ–দ্বাদশ)", en: "HSC Science (Class 11–12)" },
    description: {
      bn: "দুই বছরের পূর্ণ সিলেবাস, অধ্যায়শেষে পরীক্ষা এবং টেস্ট পরীক্ষার আগে বিশেষ রিভিশন।",
      en: "The full two-year syllabus, end-of-chapter tests and a dedicated revision block before the test exam.",
    },
    subjects: {
      bn: ["পদার্থবিজ্ঞান", "রসায়ন", "উচ্চতর গণিত", "জীববিজ্ঞান", "আইসিটি"],
      en: ["Physics", "Chemistry", "Higher Math", "Biology", "ICT"],
    },
    duration: { bn: "২৪ মাস", en: "24 months" },
    durationMonths: 24,
    monthlyFee: 3500,
    admissionFee: 1500,
    seatsTotal: 25,
    seatsLeft: 4,
    batches: [
      {
        id: "morning",
        label: { bn: "সকাল ব্যাচ", en: "Morning batch" },
        schedule: { bn: "শনি, সোম, বুধ · সকাল ৭টা–৯টা", en: "Sat, Mon, Wed · 7–9 AM" },

        slot: { days: ["sat", "mon", "wed"], start: "07:00", end: "09:00" },
      },
      {
        id: "evening",
        label: { bn: "সন্ধ্যা ব্যাচ", en: "Evening batch" },
        schedule: { bn: "রবি, মঙ্গল, বৃহস্পতি · সন্ধ্যা ৬টা–৮টা", en: "Sun, Tue, Thu · 6–8 PM" },

        slot: { days: ["sun", "tue", "thu"], start: "18:00", end: "20:00" },
      },
    ],
    featured: true,
  },
  {
    id: "hsc-business",
    level: "hsc",
    art: "growth",
    name: { bn: "HSC ব্যবসায় শিক্ষা", en: "HSC Business Studies" },
    description: {
      bn: "প্রথম ও দ্বিতীয় পত্রের পূর্ণ প্রস্তুতি, সৃজনশীল প্রশ্নের উত্তর লেখার কৌশলসহ।",
      en: "Complete preparation for both papers, including how to write strong answers to creative questions.",
    },
    subjects: {
      bn: ["হিসাববিজ্ঞান", "ফিন্যান্স", "ব্যবস্থাপনা", "আইসিটি"],
      en: ["Accounting", "Finance", "Management", "ICT"],
    },
    duration: { bn: "২৪ মাস", en: "24 months" },
    durationMonths: 24,
    monthlyFee: 3000,
    admissionFee: 1500,
    seatsTotal: 25,
    seatsLeft: 13,
    batches: [
      {
        id: "evening",
        label: { bn: "বিকাল ব্যাচ", en: "Afternoon batch" },
        schedule: { bn: "রবি, মঙ্গল, বৃহস্পতি · বিকাল ৪টা–৬টা", en: "Sun, Tue, Thu · 4–6 PM" },

        slot: { days: ["sun", "tue", "thu"], start: "16:00", end: "18:00" },
      },
    ],
  },
  {
    id: "varsity-science",
    level: "admission",
    art: "graduation",
    name: { bn: "বিশ্ববিদ্যালয় ভর্তি (বিজ্ঞান)", en: "University Admission (Science)" },
    description: {
      bn: "ঢাকা বিশ্ববিদ্যালয়, জাহাঙ্গীরনগরসহ শীর্ষ বিশ্ববিদ্যালয়ের প্রশ্নধারা অনুযায়ী প্রস্তুতি ও সাপ্তাহিক মডেল টেস্ট।",
      en: "Preparation based on past question patterns of Dhaka University, Jahangirnagar and other top universities, with weekly model tests.",
    },
    subjects: {
      bn: ["পদার্থবিজ্ঞান", "রসায়ন", "গণিত", "জীববিজ্ঞান", "ইংরেজি", "সাধারণ জ্ঞান"],
      en: ["Physics", "Chemistry", "Math", "Biology", "English", "General Knowledge"],
    },
    duration: { bn: "৬ মাস", en: "6 months" },
    durationMonths: 6,
    monthlyFee: 4500,
    admissionFee: 2000,
    seatsTotal: 40,
    seatsLeft: 9,
    batches: [
      {
        id: "morning",
        label: { bn: "সকাল ব্যাচ", en: "Morning batch" },
        schedule: { bn: "শনি–বৃহস্পতি · সকাল ৯টা–১২টা", en: "Sat–Thu · 9 AM–12 PM" },

        slot: { days: ["sat", "sun", "mon", "tue", "wed", "thu"], start: "09:00", end: "12:00" },
      },
      {
        id: "afternoon",
        label: { bn: "দুপুর ব্যাচ", en: "Afternoon batch" },
        schedule: { bn: "শনি–বৃহস্পতি · দুপুর ২টা–৫টা", en: "Sat–Thu · 2–5 PM" },

        slot: { days: ["sat", "sun", "mon", "tue", "wed", "thu"], start: "14:00", end: "17:00" },
      },
    ],
    featured: true,
  },
  {
    id: "medical",
    level: "admission",
    art: "medical",
    name: { bn: "মেডিকেল ভর্তি প্রস্তুতি", en: "Medical Admission Prep" },
    description: {
      bn: "MBBS ও BDS ভর্তি পরীক্ষার জন্য নিবিড় প্রস্তুতি, প্রতিদিন MCQ অনুশীলন ও নেগেটিভ মার্কিং কৌশল।",
      en: "Intensive MBBS and BDS admission test preparation with daily MCQ practice and negative-marking strategy.",
    },
    subjects: {
      bn: ["জীববিজ্ঞান", "রসায়ন", "পদার্থবিজ্ঞান", "ইংরেজি", "সাধারণ জ্ঞান"],
      en: ["Biology", "Chemistry", "Physics", "English", "General Knowledge"],
    },
    duration: { bn: "৪ মাস", en: "4 months" },
    durationMonths: 4,
    monthlyFee: 5000,
    admissionFee: 2000,
    seatsTotal: 40,
    seatsLeft: 3,
    batches: [
      {
        id: "morning",
        label: { bn: "সকাল ব্যাচ", en: "Morning batch" },
        schedule: { bn: "শনি–বৃহস্পতি · সকাল ৯টা–১২টা", en: "Sat–Thu · 9 AM–12 PM" },

        slot: { days: ["sat", "sun", "mon", "tue", "wed", "thu"], start: "09:00", end: "12:00" },
      },
    ],
  },
];

export function getCourse(id: string) {
  return courses.find((course) => course.id === id);
}

/** Course and batch from Sheet cells, which hold the English names (ids are accepted too). */
export function courseFromSheet(courseCell: string, batchCell: string) {
  const course = courses.find((c) => c.name.en === courseCell || c.id === courseCell);
  const batch = course?.batches.find((b) => b.label.en === batchCell || b.id === batchCell);
  return { course, batch };
}

/** Course and batch names by id in one language, for client components (the Sheet stores English). */
export type CourseNames = Record<string, { name: string; batches: Record<string, string> }>;

export function courseNames(locale: Locale): CourseNames {
  return Object.fromEntries(
    courses.map((course) => [
      course.id,
      { name: course.name[locale], batches: Object.fromEntries(course.batches.map((b) => [b.id, b.label[locale]])) },
    ]),
  );
}

/** What the office pages need to know about each course, in one language. */
export type OfficeCourse = {
  id: string;
  name: string;
  monthlyFee: number;
  durationMonths: number;
  seatsTotal: number;
  batches: { id: string; name: string; slot: Batch["slot"] }[];
};

export function officeCourses(locale: Locale): OfficeCourse[] {
  return courses.map((course) => ({
    id: course.id,
    name: course.name[locale],
    monthlyFee: course.monthlyFee,
    durationMonths: course.durationMonths,
    seatsTotal: course.seatsTotal,
    batches: course.batches.map((b) => ({ id: b.id, name: b.label[locale], slot: b.slot })),
  }));
}
