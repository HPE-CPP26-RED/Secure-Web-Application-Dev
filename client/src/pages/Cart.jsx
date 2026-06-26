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
import { formatCurrency } from "helpers/formatCurrency";
import Layout from "layout/Layout";
import { ShoppingCart } from "react-feather";
import { Link } from "react-router-dom";

const Cart = () => {
  const { cartData, isLoading, cartSubtotal } = useCart();

  if (cartData?.items?.length === 0) {
    return (
      <Layout title="Cart" loading={isLoading}>
        <div className="relative min-h-[70vh] flex flex-col justify-center items-center px-4 overflow-hidden w-full">
          {/* Background decorative glow blobs */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 w-72 h-72 bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-3xl animate-pulse pointer-events-none [animation-delay:2s]"></div>

          <div className="relative z-10 flex flex-col items-center max-w-md text-center p-8 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-white/20 dark:border-neutral-800/40 rounded-2xl">
            <div className="p-4 bg-white dark:white rounded-xl mb-6 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart size={64} className="stroke-[1.5]" stroke="dark:white black" />
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
      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/5 dark:bg-emerald-500/2 rounded-full blur-3xl pointer-events-none"></div>

        <h1 className="text-3xl font-extrabold mb-8 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Table Container */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md border border-white/30 dark:border-neutral-800/40 rounded-2xl shadow-xl overflow-hidden">
              <TableContainer className="shadow-none bg-transparent">
                <Table>
                  <TableHeader className="bg-neutral-50/50 dark:bg-neutral-800/30 border-b border-white/30 dark:border-neutral-800/40">
                    <TableRow>
                      <TableCell className="font-semibold text-neutral-600 dark:text-neutral-300">
                        Product
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-600 dark:text-neutral-300">
                        Price
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-600 dark:text-neutral-300 text-center">
                        Quantity
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-600 dark:text-neutral-300">
                        Total
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-600 dark:text-neutral-300 text-center">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {cartData?.items?.map((item) => {
                      return (
                        <TableRow
                          key={item.product_id}
                          className="hover:bg-white/40 dark:hover:bg-neutral-800/20 transition-colors duration-150"
                        >
                          <CartItem item={item} />
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>

          {/* Cart Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md border border-white/30 dark:border-neutral-800/40 rounded-2xl shadow-xl p-6 relative overflow-hidden">
              <h2 className="text-xl font-bold mb-6 text-neutral-800 dark:text-neutral-100 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                Order Summary
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Shipping</span>
                  <span className="text-emerald-500 font-medium">Free</span>
                </div>
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  <span>Total</span>
                  <span className="text-xl text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>
              </div>

              <Button
                tag={Link}
                to={"/cart/checkout"}
                state={{
                  fromCartPage: true,
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
              >
                Proceed to Checkout
              </Button>

              <div className="mt-4 text-center">
                <Link
                  to="/"
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
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
