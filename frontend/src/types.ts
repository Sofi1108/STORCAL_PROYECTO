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

export interface Order {
id: number;
status: string;
total: string; // calculado por el backend con SUM(order_items)
address: string;
created_at: string;
}