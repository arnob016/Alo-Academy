import type { Localized, Look } from "./types";

export type Teacher = {
  id: string;
  /** Cartoon portrait, drawn in each theme's style until a real photo is added. */
  look: Look;
  name: Localized;
  /** Optional path under /public/images, e.g. "/images/teachers/rafiqul.jpg". Replaces the cartoon on the Classic site; the demo themes keep their drawn style. */
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
    look: { skin: "tan", hair: "receding", hairColor: "salt", glasses: true, facial: "mustache", wear: "shirt", outfit: "#3b6ea8" },
    name: { bn: "মোঃ রফিকুল ইসলাম", en: "Md. Rafiqul Islam" },
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
    look: { skin: "medium", hair: "long", wear: "kameez", outfit: "#b5476b" },
    name: { bn: "নাসরিন আক্তার", en: "Nasrin Akter" },
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
    look: { skin: "medium", hair: "side", wear: "shirt", outfit: "#2f7d6d" },
    name: { bn: "তানভীর হাসান", en: "Tanvir Hasan" },
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
    look: { skin: "light", hair: "hijab", hijab: "#5a6fb0", wear: "coat", outfit: "#7aa6c2" },
    name: { bn: "ডাঃ ফারহানা রহমান", en: "Dr. Farhana Rahman" },
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
    look: { skin: "tan", hair: "short", glasses: true, facial: "beard", wear: "shirt", outfit: "#4a4e69" },
    name: { bn: "সাব্বির আহমেদ", en: "Sabbir Ahmed" },
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
    look: { skin: "medium", hair: "bun", glasses: true, wear: "kameez", outfit: "#c9822b" },
    name: { bn: "শিরিন সুলতানা", en: "Shirin Sultana" },
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
