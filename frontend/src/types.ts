export interface Product {
  id: number;
  name: string;
  description: string;
  price: number; // precio en euros
  category: string;
  stock: number; //cuantos quedan
  image_url: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
