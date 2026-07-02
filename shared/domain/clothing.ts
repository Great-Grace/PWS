import type { ClothingItemId } from './types';

export interface ClothingItemDef {
  id: ClothingItemId;
  label: string;
  clo: number;
}

export const CLOTHING_ITEM_DEFS: ClothingItemDef[] = [
  { id: 'sleeveless', label: '민소매', clo: 0.04 },
  { id: 'tshirt', label: '반팔 티셔츠', clo: 0.09 },
  { id: 'longsleeve', label: '긴팔 티셔츠', clo: 0.12 },
  { id: 'shirt', label: '셔츠/블라우스', clo: 0.15 },
  { id: 'knit_thin', label: '얇은 니트', clo: 0.20 },
  { id: 'sweatshirt', label: '맨투맨', clo: 0.24 },
  { id: 'hoodie', label: '후드티', clo: 0.28 },
  { id: 'hoodie_zip', label: '후드집업', clo: 0.28 },
  { id: 'knit_thick', label: '두꺼운 니트', clo: 0.36 },
  { id: 'fleece', label: '플리스', clo: 0.36 },
  { id: 'light_jacket', label: '바람막이', clo: 0.22 },
  { id: 'cardigan', label: '가디건', clo: 0.25 },
  { id: 'blazer', label: '블레이저/자켓', clo: 0.35 },
  { id: 'light_padding', label: '경량 패딩', clo: 0.55 },
  { id: 'padding', label: '패딩', clo: 0.90 },
  { id: 'heavy_coat', label: '두꺼운 코트', clo: 1.00 },
  { id: 'shorts', label: '반바지', clo: 0.06 },
  { id: 'pants', label: '긴바지', clo: 0.15 },
  { id: 'slacks', label: '슬랙스', clo: 0.16 },
  { id: 'jeans', label: '청바지', clo: 0.20 },
];

export const CLO_THIN_MAX = 0.18;
export const CLO_NORMAL_MAX = 0.40;
