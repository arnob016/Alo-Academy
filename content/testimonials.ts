import type { Localized, Look } from "./types";

export type Testimonial = {
  id: string;
  /** Cartoon avatar shown next to the quote. */
  look: Look;
  quote: Localized;
  name: Localized;
  role: Localized;
};

export const testimonials: Testimonial[] = [
  {
    id: "salma",
    look: { skin: "tan", hair: "hijab", hijab: "#7a5c99", wear: "kameez", outfit: "#d66a4f" },
    quote: {
      bn: "ছেলের রসায়নে ভয় ছিল। এখানে ছোট ব্যাচে পড়ে SSC-তে GPA 5 পেয়েছে। প্রতি মাসে রিপোর্ট পেতাম, তাই চিন্তা কম ছিল।",
      en: "My son was scared of chemistry. In a small batch here he got GPA 5 in SSC. I got a report every month, so I worried much less.",
    },
    name: { bn: "সালমা বেগম", en: "Salma Begum" },
    role: { bn: "অভিভাবক, SSC ২০২৫", en: "Parent, SSC 2025" },
  },
  {
    id: "arif",
    look: { skin: "deep", hair: "short", wear: "tshirt", outfit: "#3b8fd1" },
    quote: {
      bn: "মডেল টেস্টগুলো আসল পরীক্ষার মতোই ছিল। ঢাকা বিশ্ববিদ্যালয়ে বিজ্ঞান ইউনিটে চান্স পেয়েছি।",
      en: "The model tests felt just like the real exam. I got into the Science unit at Dhaka University.",
    },
    name: { bn: "আরিফ হোসেন", en: "Arif Hossain" },
    role: { bn: "শিক্ষার্থী, বিশ্ববিদ্যালয় ভর্তি ২০২৫", en: "Student, University Admission 2025" },
  },
  {
    id: "nusrat",
    look: { skin: "light", hair: "long", hairColor: "brown", wear: "tshirt", outfit: "#3aa17e" },
    quote: {
      bn: "স্যাররা যেকোনো প্রশ্ন আবার বুঝিয়ে দেন। বিকাশে ভর্তি ফি দিয়ে বাসা থেকেই ভর্তি হয়েছি।",
      en: "Teachers explain again whenever we ask. I paid the admission fee by bKash and enrolled from home.",
    },
    name: { bn: "নুসরাত জাহান", en: "Nusrat Jahan" },
    role: { bn: "শিক্ষার্থী, HSC বিজ্ঞান", en: "Student, HSC Science" },
  },
];
