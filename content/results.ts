import type { Localized } from "./types";

export type Exam = {
  id: string;
  courseId: string;
  title: Localized;
  /** ISO date, e.g. "2026-10-24". */
  date: string;
  fullMarks: number;
  passMarks: number;
  /** [roll, name, marks] */
  scores: [string, string, number][];
};

/**
 * Sample results, shown in demo mode only. Real results are entered from the
 * office (/dashboard/results) and stored in the "Results" tab of the Sheet.
 */
export const exams: Exam[] = [
  {
    id: "ssc-weekly-12",
    courseId: "ssc-science",
    title: { bn: "SSC বিজ্ঞান — সাপ্তাহিক পরীক্ষা ১২ (পদার্থবিজ্ঞান)", en: "SSC Science — Weekly Test 12 (Physics)" },
    date: "2026-10-24",
    fullMarks: 50,
    passMarks: 17,
    scores: [
      ["1201", "Rahat Karim", 47],
      ["1202", "Nusrat Jahan", 44],
      ["1203", "তানভীর আহমেদ", 44],
      ["1204", "Sumaiya Islam", 41],
      ["1205", "Arif Hossain", 39],
      ["1206", "Mim Akter", 38],
      ["1207", "সাকিব হাসান", 36],
      ["1208", "Jannatul Ferdous", 35],
      ["1209", "Tahmid Rahman", 33],
      ["1210", "Riya Das", 32],
      ["1211", "Fahim Chowdhury", 30],
      ["1212", "নাফিসা তাবাসসুম", 29],
      ["1213", "Imran Kabir", 27],
      ["1214", "Lamia Sultana", 26],
      ["1215", "Shuvo Saha", 24],
      ["1216", "Tania Begum", 22],
      ["1217", "রাকিব উদ্দিন", 19],
      ["1218", "Sadia Noor", 15],
    ],
  },
  {
    id: "hsc-model-1",
    courseId: "hsc-science",
    title: { bn: "HSC বিজ্ঞান — মডেল টেস্ট ১", en: "HSC Science — Model Test 1" },
    date: "2026-10-18",
    fullMarks: 100,
    passMarks: 33,
    scores: [
      ["2101", "Ayesha Siddiqua", 91],
      ["2102", "Mehedi Hasan", 86],
      ["2103", "ফারহানা আক্তার", 84],
      ["2104", "Zubair Alam", 79],
      ["2105", "Nabila Rahman", 77],
      ["2106", "Shafin Ahmed", 74],
      ["2107", "আরিফ হোসেন", 71],
      ["2108", "Tasnim Haque", 68],
      ["2109", "Rafsan Jani", 66],
      ["2110", "Priya Roy", 63],
      ["2111", "Mahin Sarker", 58],
      ["2112", "সামিয়া ইসলাম", 55],
      ["2113", "Asif Iqbal", 52],
      ["2114", "Ishrat Jahan", 47],
      ["2115", "Tanvir Hasan", 41],
      ["2116", "Rumana Akter", 36],
      ["2117", "Nayeem Islam", 29],
    ],
  },
  {
    id: "varsity-model-4",
    courseId: "varsity-science",
    title: { bn: "বিশ্ববিদ্যালয় ভর্তি — মডেল টেস্ট ৪", en: "University Admission — Model Test 4" },
    date: "2026-10-26",
    fullMarks: 120,
    passMarks: 48,
    scores: [
      ["3101", "Rafiul Islam", 108],
      ["3102", "Farhana Akter", 103],
      ["3103", "সাদিয়া আফরিন", 99],
      ["3104", "Ehsan Kabir", 96],
      ["3105", "Mashrafi Rahman", 92],
      ["3106", "Anika Tabassum", 90],
      ["3107", "Ridwan Hossain", 87],
      ["3108", "মাহমুদা খাতুন", 83],
      ["3109", "Sabbir Ahmed", 80],
      ["3110", "Tanjila Rahman", 78],
      ["3111", "Hasibul Islam", 74],
      ["3112", "Nowshin Nahar", 70],
      ["3113", "Fardin Chowdhury", 66],
      ["3114", "রাফি আহমেদ", 61],
      ["3115", "Sharmin Akter", 57],
      ["3116", "Ashik Mahmud", 52],
      ["3117", "Lubna Yasmin", 49],
      ["3118", "Tamim Hasan", 44],
      ["3119", "Moumita Paul", 38],
    ],
  },
];

/** Bangladesh board grade for a percentage. */
export function grade(percent: number) {
  if (percent >= 80) return "A+";
  if (percent >= 70) return "A";
  if (percent >= 60) return "A-";
  if (percent >= 50) return "B";
  if (percent >= 40) return "C";
  if (percent >= 33) return "D";
  return "F";
}
