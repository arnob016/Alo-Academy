import type { Localized } from "./types";

export type Teacher = {
  id: string;
  name: Localized;
  /** Shown in the avatar until a real photo is added. */
  initials: Localized;
  /** Optional path under /public/images, e.g. "/images/teachers/rafiqul.jpg". */
  photo?: string;
  subject: Localized;
  qualification: Localized;
  experienceYears: number;
  bio: Localized;
  featured?: boolean;
};

export const teachers: Teacher[] = [
  {
    id: "rafiqul",
    name: { bn: "মোঃ রফিকুল ইসলাম", en: "Md. Rafiqul Islam" },
    initials: { bn: "র", en: "RI" },
    subject: { bn: "পদার্থবিজ্ঞান", en: "Physics" },
    qualification: {
      bn: "এমএসসি (পদার্থবিজ্ঞান), ঢাকা বিশ্ববিদ্যালয়",
      en: "MSc in Physics, University of Dhaka",
    },
    experienceYears: 14,
    bio: {
      bn: "জটিল বিষয় সহজ উদাহরণে বোঝাতে পারদর্শী।",
      en: "Known for explaining hard concepts with everyday examples.",
    },
    featured: true,
  },
  {
    id: "nasrin",
    name: { bn: "নাসরিন আক্তার", en: "Nasrin Akter" },
    initials: { bn: "না", en: "NA" },
    subject: { bn: "রসায়ন", en: "Chemistry" },
    qualification: {
      bn: "এমএসসি (রসায়ন), জাহাঙ্গীরনগর বিশ্ববিদ্যালয়",
      en: "MSc in Chemistry, Jahangirnagar University",
    },
    experienceYears: 10,
    bio: {
      bn: "প্র্যাকটিক্যাল ও বিক্রিয়ার কৌশল শেখাতে শিক্ষার্থীদের প্রিয়।",
      en: "A student favourite for practicals and reaction mechanisms.",
    },
    featured: true,
  },
  {
    id: "tanvir",
    name: { bn: "তানভীর হাসান", en: "Tanvir Hasan" },
    initials: { bn: "তা", en: "TH" },
    subject: { bn: "গণিত ও উচ্চতর গণিত", en: "Math & Higher Math" },
    qualification: {
      bn: "বিএসসি (অনার্স) গণিত, ঢাকা বিশ্ববিদ্যালয়",
      en: "BSc (Hons) in Mathematics, University of Dhaka",
    },
    experienceYears: 9,
    bio: {
      bn: "ধাপে ধাপে সমাধান ও নিয়মিত অনুশীলনে বিশ্বাসী।",
      en: "Believes in step-by-step solutions and steady practice.",
    },
    featured: true,
  },
  {
    id: "farhana",
    name: { bn: "ডাঃ ফারহানা রহমান", en: "Dr. Farhana Rahman" },
    initials: { bn: "ফা", en: "FR" },
    subject: { bn: "জীববিজ্ঞান", en: "Biology" },
    qualification: {
      bn: "এমবিবিএস, স্যার সলিমুল্লাহ মেডিকেল কলেজ",
      en: "MBBS, Sir Salimullah Medical College",
    },
    experienceYears: 7,
    bio: {
      bn: "মেডিকেল ভর্তি প্রস্তুতির দায়িত্বে আছেন।",
      en: "Leads the medical admission program.",
    },
    featured: true,
  },
  {
    id: "sabbir",
    name: { bn: "সাব্বির আহমেদ", en: "Sabbir Ahmed" },
    initials: { bn: "সা", en: "SA" },
    subject: { bn: "হিসাববিজ্ঞান ও ফিন্যান্স", en: "Accounting & Finance" },
    qualification: {
      bn: "এমবিএ (হিসাববিজ্ঞান), ঢাকা বিশ্ববিদ্যালয়",
      en: "MBA in Accounting, University of Dhaka",
    },
    experienceYears: 11,
    bio: {
      bn: "ব্যবসায় শিক্ষা বিভাগের প্রধান শিক্ষক।",
      en: "Heads the Business Studies department.",
    },
  },
  {
    id: "shirin",
    name: { bn: "শিরিন সুলতানা", en: "Shirin Sultana" },
    initials: { bn: "শি", en: "SS" },
    subject: { bn: "ইংরেজি", en: "English" },
    qualification: {
      bn: "এমএ (ইংরেজি), রাজশাহী বিশ্ববিদ্যালয়",
      en: "MA in English, University of Rajshahi",
    },
    experienceYears: 8,
    bio: {
      bn: "ভর্তি পরীক্ষার ইংরেজি ও গ্রামার অংশ পড়ান।",
      en: "Teaches English and grammar for admission tests.",
    },
  },
];
