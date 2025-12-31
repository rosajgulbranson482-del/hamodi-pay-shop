export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  rating: number;
  reviews: number;
}

export const products: Product[] = [
  {
    id: "1",
    name: "سماعات بلوتوث لاسلكية",
    description: "سماعات عالية الجودة مع خاصية إلغاء الضوضاء وبطارية تدوم 24 ساعة",
    price: 450,
    originalPrice: 600,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
    category: "سماعات",
    inStock: true,
    rating: 4.8,
    reviews: 156
  },
  {
    id: "2",
    name: "ساعة ذكية متعددة الوظائف",
    description: "ساعة ذكية مع متابعة اللياقة البدنية ومقاومة للماء",
    price: 850,
    originalPrice: 1100,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    category: "ساعات",
    inStock: true,
    rating: 4.6,
    reviews: 89
  },
  {
    id: "3",
    name: "شاحن سريع 65 وات",
    description: "شاحن سريع يدعم جميع الأجهزة مع حماية من الحرارة الزائدة",
    price: 280,
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    category: "شواحن",
    inStock: true,
    rating: 4.9,
    reviews: 234
  },
  {
    id: "4",
    name: "باور بانك 20000 مللي أمبير",
    description: "بطارية محمولة عالية السعة مع شحن سريع للهواتف واللابتوب",
    price: 520,
    originalPrice: 680,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400",
    category: "باور بانك",
    inStock: true,
    rating: 4.7,
    reviews: 178
  },
  {
    id: "5",
    name: "كابل USB-C مضفر",
    description: "كابل عالي الجودة مضفر بطول 2 متر يدعم الشحن السريع",
    price: 85,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    category: "كابلات",
    inStock: true,
    rating: 4.5,
    reviews: 312
  },
  {
    id: "6",
    name: "حامل هاتف للسيارة",
    description: "حامل مغناطيسي قوي مع تدوير 360 درجة",
    price: 150,
    originalPrice: 200,
    image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400",
    category: "إكسسوارات",
    inStock: true,
    rating: 4.4,
    reviews: 98
  },
  {
    id: "7",
    name: "سبيكر بلوتوث محمول",
    description: "صوت قوي ونقي مع بطارية تدوم 12 ساعة ومقاومة للماء",
    price: 380,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400",
    category: "سماعات",
    inStock: true,
    rating: 4.7,
    reviews: 145
  },
  {
    id: "8",
    name: "ماوس جيمنج لاسلكي",
    description: "ماوس احترافي للألعاب مع إضاءة RGB وسرعة استجابة عالية",
    price: 320,
    originalPrice: 420,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400",
    category: "جيمنج",
    inStock: false,
    rating: 4.8,
    reviews: 267
  }
];

export const categories = [
  "الكل",
  "سماعات",
  "ساعات",
  "شواحن",
  "باور بانك",
  "كابلات",
  "إكسسوارات",
  "جيمنج"
];
