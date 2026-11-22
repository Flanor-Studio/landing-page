interface ProjectIdentity {
  id: string;
  name: string;
  english: string;
  stop: string;
  color: string;
  theme: 'puzzle' | 'bag' | 'tile';
}

export type Project = ProjectIdentity & (
  | {
    status: 'released';
    description: string;
    bazaarUrl?: string;
    myketUrl?: string;
    aparatUrl?: string;
  }
  | { status: 'coming-soon' }
);

export const projects = [
  {
    id: 'pazelit',
    name: 'پازلیت',
    english: 'Pazelit',
    stop: 'مغازهٔ پازل',
    color: '#e6b660',
    theme: 'puzzle',
    status: 'released',
    description: 'پازلیت یک بازی معمایی رنگ‌آمیزی است. با کمک سرنخ‌های عددی خانه‌های جدول را رنگ کنید و قطعه‌های تصویر را کنار هم بگذارید.',
    bazaarUrl: 'https://cafebazaar.ir/app/org.pazelit.android',
    myketUrl: 'https://myket.ir/app/org.pazelit.android',
    aparatUrl: 'https://aparat.com/v/naov25z',
  },
  {
    id: 'kif-koochooloo',
    name: 'کیف کوچولو',
    english: 'Kif Koochooloo',
    stop: 'کیف‌فروشی',
    color: '#ee8f87',
    theme: 'bag',
    status: 'released',
    description: 'در کیف کوچولو باید وسایل جورواجور را بچرخانید و طوری در کوله‌پشتی جا بدهید که همه جا شوند. معماها از بهار تا زمستان ادامه دارند.',
    bazaarUrl: 'https://cafebazaar.ir/app/com.kifkoochooloo.game',
    myketUrl: 'https://myket.ir/app/com.kifkoochooloo.game',
    aparatUrl: 'https://aparat.com/v/pxbrcdc',
  },
  {
    id: 'kashi-kari',
    name: 'کاشی‌کاری',
    english: 'Kashi Kari',
    stop: 'کارگاه کاشی',
    color: '#65c8c1',
    theme: 'tile',
    status: 'coming-soon',
  },
] as const satisfies readonly Project[];
