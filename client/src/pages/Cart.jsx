import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import CartItem from "components/CartItem";
import { useCart } from "context/CartContext";
import { useTheme } from "context/ThemeContext";
import { formatCurrency } from "helpers/formatCurrency";
import Layout from "layout/Layout";
import { ShoppingCart } from "react-feather";
import { Link } from "react-router-dom";

const Cart = () => {
  const { cartData, isLoading, cartSubtotal } = useCart();
  const { isDark } = useTheme();

  if (cartData?.items?.length === 0) {
    return (
      <Layout title="Cart" loading={isLoading}>
        <div className="relative min-h-[70vh] flex flex-col justify-center items-center px-4 overflow-hidden w-full">
          {/* Background decorative glow blobs */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 w-72 h-72 bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-3xl animate-pulse pointer-events-none [animation-delay:2s]"></div>

          <div className="relative z-10 flex flex-col items-center max-w-md text-center p-8 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-white/20 dark:border-neutral-800/40 rounded-2xl">
            <div className="p-4 rounded-xl mb-6 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart
                size={64}
                className="stroke-[1.5]"
                stroke={isDark ? "white" : "black"}
              />
            </div>
            <h1 className="text-3xl font-extrabold mb-3 text-neutral-900 dark:text-white bg-clip-text ">
              Your Cart is Empty
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm">
              Looks like you haven't added anything to your cart yet. Explore our premium collection
              and start shopping!
            </p>
            <Button
              tag={Link}
              to="/"
              className="px-8 py-3  bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
            >
              Explore Products
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout loading={isLoading || cartData === undefined}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
              <TableContainer className="shadow-none bg-transparent">
                <Table>
                  <TableHeader className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    <TableRow>
                      <TableCell className="font-semibold text-neutral-700 dark:text-neutral-200">
                        Product
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-700 dark:text-neutral-200">
                        Price
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-700 dark:text-neutral-200 text-center">
                        Quantity
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-700 dark:text-neutral-200">
                        Total
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-700 dark:text-neutral-200 text-center">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {cartData?.items?.map((item) => (
                      <TableRow
                        key={item.product_id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <CartItem item={item} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                Order Summary
              </h2>

              <div className="space-y-5">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Shipping</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-500">Free</span>
                </div>

                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-5 flex justify-between items-center">
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>
              </div>

              <Button
                tag={Link}
                to="/cart/checkout"
                state={{
                  fromCartPage: true,
                }}
                className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-3 transition-colors"
              >
                Proceed to Checkout
              </Button>

              <div className="mt-5 text-center">
                <Link
                  to="/"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
