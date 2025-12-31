export interface Governorate {
  id: string;
  name: string;
  deliveryFee: number;
  deliveryDays: string;
}

export const governorates: Governorate[] = [
  { id: "cairo", name: "القاهرة", deliveryFee: 40, deliveryDays: "1-2 يوم" },
  { id: "giza", name: "الجيزة", deliveryFee: 40, deliveryDays: "1-2 يوم" },
  { id: "alexandria", name: "الإسكندرية", deliveryFee: 50, deliveryDays: "2-3 أيام" },
  { id: "qalyubia", name: "القليوبية", deliveryFee: 45, deliveryDays: "2-3 أيام" },
  { id: "sharqia", name: "الشرقية", deliveryFee: 50, deliveryDays: "2-3 أيام" },
  { id: "dakahlia", name: "الدقهلية", deliveryFee: 50, deliveryDays: "2-3 أيام" },
  { id: "beheira", name: "البحيرة", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "gharbia", name: "الغربية", deliveryFee: 50, deliveryDays: "2-3 أيام" },
  { id: "monufia", name: "المنوفية", deliveryFee: 50, deliveryDays: "2-3 أيام" },
  { id: "kafr-el-sheikh", name: "كفر الشيخ", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "damietta", name: "دمياط", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "port-said", name: "بورسعيد", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "ismailia", name: "الإسماعيلية", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "suez", name: "السويس", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "fayoum", name: "الفيوم", deliveryFee: 55, deliveryDays: "3-4 أيام" },
  { id: "beni-suef", name: "بني سويف", deliveryFee: 60, deliveryDays: "3-4 أيام" },
  { id: "minya", name: "المنيا", deliveryFee: 65, deliveryDays: "4-5 أيام" },
  { id: "asyut", name: "أسيوط", deliveryFee: 70, deliveryDays: "4-5 أيام" },
  { id: "sohag", name: "سوهاج", deliveryFee: 70, deliveryDays: "4-5 أيام" },
  { id: "qena", name: "قنا", deliveryFee: 75, deliveryDays: "5-6 أيام" },
  { id: "luxor", name: "الأقصر", deliveryFee: 75, deliveryDays: "5-6 أيام" },
  { id: "aswan", name: "أسوان", deliveryFee: 80, deliveryDays: "5-7 أيام" },
  { id: "red-sea", name: "البحر الأحمر", deliveryFee: 85, deliveryDays: "5-7 أيام" },
  { id: "north-sinai", name: "شمال سيناء", deliveryFee: 90, deliveryDays: "6-8 أيام" },
  { id: "south-sinai", name: "جنوب سيناء", deliveryFee: 90, deliveryDays: "6-8 أيام" },
  { id: "matrouh", name: "مطروح", deliveryFee: 85, deliveryDays: "5-7 أيام" },
  { id: "new-valley", name: "الوادي الجديد", deliveryFee: 100, deliveryDays: "7-10 أيام" }
];
