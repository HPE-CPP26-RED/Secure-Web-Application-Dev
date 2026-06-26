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
      className="group relative block overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-gray-200/50 dark:ring-neutral-800/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-gray-300 dark:hover:ring-neutral-700"
    >
      <CardBody className="!p-0">
        <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 rounded-xl">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>

        <div className="flex flex-col gap-1.5 p-4">
          <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center justify-between mt-1">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(product.price)}
            </p>

            <button
              disabled={isLoading}
              onClick={(e) => addToCart(e)}
              className="flex items-center justify-center p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-200 active:scale-95 disabled:opacity-50"
              aria-label="Add to cart"
            >
              {isLoading ? (
                <ClipLoader size={16} color="#ffffff" />
              ) : (
                <ShoppingCart size={16} className="stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </CardBody>
    </Link>
  );
};

export default Product;
