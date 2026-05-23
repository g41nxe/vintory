export interface Wine {
  id: string;
  name: string;
  type: string;
  year: number | null;
  winery: string;
  region: string;
  grape: string;
  price: string;
  quantity: number;
  rating: number;
  image: string;
  isFavorite: boolean;
}
