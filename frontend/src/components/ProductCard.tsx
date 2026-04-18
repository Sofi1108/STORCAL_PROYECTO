import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  onSelect?: (id: number) => void;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <div
      className="products-card"
      onClick={() => onSelect && onSelect(product.id)}
    >
      <img src={product.image_url} alt={product.name} />
      <div className="Textos">
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">{Number(product.price).toFixed(2)}€</p>
      <p>{product.category}</p>
      <p className={`stock ${product.stock > 0 ? "in-stock" : "out-of-stock"}`}>
        {product.stock > 0
          ? `En stock - ${product.stock} unidades`
          : "Sin stock - 0 unidades"}
      </p>
      </div>
    </div>
  );
}

export default ProductCard;
