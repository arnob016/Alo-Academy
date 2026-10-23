import type { Localized } from "./types";

export type Faq = {
  id: string;
  question: Localized;
  answer: Localized;
};

export const faqs: Faq[] = [
  {
    id: "enroll",
    question: { bn: "কীভাবে ভর্তি হব?", en: "How do I enroll?" },
    answer: {
      bn: "ভর্তি পাতায় কোর্স ও ব্যাচ বেছে নিন, বিকাশে ভর্তি ফি পাঠান, তারপর TrxID দিয়ে ফর্মটি জমা দিন। আমরা যাচাই করে ২৪ ঘণ্টার মধ্যে ফোনে নিশ্চিত করব।",
      en: "Choose a course and batch on the Admission page, send the admission fee by bKash, then submit the form with your TrxID. We verify it and confirm by phone within 24 hours.",
    },
  },
  {
    id: "bkash-safe",
    question: { bn: "বিকাশে পেমেন্ট কি নিরাপদ?", en: "Is paying by bKash safe?" },
    answer: {
      bn: "হ্যাঁ। আপনি সরাসরি আমাদের অফিসিয়াল বিকাশ নম্বরে টাকা পাঠান। প্রতিটি TrxID আমাদের স্টেটমেন্টের সাথে মিলিয়ে দেখা হয়, এবং আপনি একটি রেফারেন্স নম্বর পান।",
      en: "Yes. You send money directly to our official bKash number. Every TrxID is checked against our statement, and you receive a reference number.",
    },
  },
  {
    id: "batch-size",
    question: { bn: "একটি ব্যাচে কতজন শিক্ষার্থী থাকে?", en: "How many students are in a batch?" },
    answer: {
      bn: "SSC ও HSC ব্যাচে সর্বোচ্চ ২৫ জন, ভর্তি প্রস্তুতি ব্যাচে সর্বোচ্চ ৪০ জন।",
      en: "At most 25 in SSC and HSC batches, and at most 40 in admission prep batches.",
    },
  },
  {
    id: "trial",
    question: { bn: "ভর্তির আগে ক্লাস দেখা যাবে?", en: "Can I attend a class before enrolling?" },
    answer: {
      bn: "হ্যাঁ, যেকোনো কোর্সে একটি ফ্রি ট্রায়াল ক্লাস করতে পারবেন। অফিসে ফোন করে সময় ঠিক করে নিন।",
      en: "Yes, you can attend one free trial class in any course. Call the office to book a time.",
    },
  },
  {
    id: "monthly-fee",
    question: { bn: "মাসিক বেতন কীভাবে দেব?", en: "How do I pay the monthly fee?" },
    answer: {
      bn: "প্রতি মাসের ১০ তারিখের মধ্যে বিকাশে অথবা অফিসে নগদ দিতে পারবেন।",
      en: "Pay by the 10th of each month, by bKash or in cash at the office.",
    },
  },
  {
    id: "missed-class",
    question: { bn: "ক্লাস মিস করলে কী হবে?", en: "What if my child misses a class?" },
    answer: {
      bn: "প্রতিটি ক্লাসের নোট দেওয়া হয় এবং সপ্তাহে একদিন ডাউট-ক্লিয়ারিং সেশন থাকে।",
      en: "Notes are shared for every class, and there is a weekly doubt-clearing session.",
    },
  },
];
