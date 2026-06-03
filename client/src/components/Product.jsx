import { Button, CardBody } from "@windmill/react-ui";
import { useCart } from "context/CartContext";
import { useState } from "react";
import { ShoppingCart } from "react-feather";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { formatCurrency } from "../helpers/formatCurrency";

const Product = ({ product }) => {
  const { addItem } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const addToCart = async (e) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      await addItem(product, 1);
      toast.success("Added to cart");
    } catch (error) {
      console.log(error);
      toast.error("Error adding to cart");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-gray-300"
    >
      <CardBody className="!p-0">
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />

          <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
            <Button
              icon={isLoading ? undefined : ShoppingCart}
              disabled={isLoading}
              onClick={(e) => addToCart(e)}
              className="pointer-events-auto w-full rounded-xl bg-neutral-900 text-white shadow-lg hover:bg-neutral-800"
            >
              {isLoading ? (
                <ClipLoader size={16} color="#ffffff" />
              ) : (
                "Add to Cart"
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <h3 className="line-clamp-1 text-sm font-medium tracking-tight text-gray-900">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-gray-900">
              {formatCurrency(product.price)}
            </p>

            <Button
              size="small"
              icon={isLoading ? undefined : ShoppingCart}
              disabled={isLoading}
              onClick={(e) => addToCart(e)}
              className="rounded-full bg-neutral-900 px-3 text-white hover:bg-neutral-800 lg:hidden"
              aria-label="Add to cart"
            >
              {isLoading ? <ClipLoader size={14} color="#ffffff" /> : null}
            </Button>
          </div>
        </div>
      </CardBody>
    </Link>
  );
};

export default Product;