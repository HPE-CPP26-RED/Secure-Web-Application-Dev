import { useCart } from "context/CartContext";
import { formatCurrency } from "helpers/formatCurrency";

const OrderSummary = () => {
  const { cartData, cartSubtotal } = useCart();
  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Order Summary</h1>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {cartData?.items.map((item, index) => (
          <div
            key={item.product_id}
            className={`flex gap-4 p-4 ${
              index !== cartData.items.length - 1
                ? "border-b border-gray-200 dark:border-gray-700"
                : ""
            }`}
          >
            <img
              className="w-24 h-24 rounded-md object-cover border border-gray-200 dark:border-gray-700"
              loading="lazy"
              decoding="async"
              src={item.image_url}
              alt={item.name}
            />

            <div className="flex flex-1 flex-col justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{item.name}</h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Quantity: {item.quantity}
                </p>
              </div>

              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(item.price)}
              </p>
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center px-4 py-5 border-t border-gray-200 dark:border-gray-700">
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Total</span>

          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(cartSubtotal)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
