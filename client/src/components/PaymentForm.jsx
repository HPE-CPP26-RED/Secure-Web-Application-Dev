import { Button, HelperText } from "@windmill/react-ui";
import API from "api/axios.config";
import { useCart } from "context/CartContext";
import { useUser } from "context/UserContext";
import { formatCurrency } from "helpers/formatCurrency";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PulseLoader from "react-spinners/PulseLoader";
import OrderService from "services/order.service";
import OrderSummary from "./OrderSummary";

const PaymentForm = ({ previousStep, addressData, nextStep }) => {
  const { cartSubtotal, cartTotal, cartData, setCartData } = useCart();
  const { userData } = useUser();
  const [error, setError] = useState();
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    setError();
    setIsProcessing(true);

    try {
      // Step 1: Create Razorpay order on the backend
      const { data: order } = await API.post("/payment/order", {
        amount: (cartSubtotal * 100).toFixed(),
        currency: "INR",
      });

      // Step 2: Configure Razorpay Checkout options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Vantage",
        description: "Order Payment",
        order_id: order.id,
        prefill: {
          name: addressData?.fullname || "",
          email: addressData?.email || userData?.email || "",
        },
        handler: async (response) => {
          try {
            // Step 3: Verify payment signature on the backend
            await API.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Step 4: Create order record after successful verification
            await OrderService.createOrder(
              cartSubtotal,
              cartTotal,
              response.razorpay_payment_id,
              "RAZORPAY"
            );

            setCartData({ ...cartData, items: [] });
            setIsProcessing(false);
            navigate("/cart/success", {
              state: { fromPaymentPage: true },
            });
          } catch (verifyError) {
            setIsProcessing(false);
            setError({ message: "Payment verification failed. Please contact support." });
          }
        },
        modal: {
          ondismiss: () => {
            toast.error("Payment cancelled");
            setIsProcessing(false);
          },
        },
        theme: {
          color: "#01A982",
        },
      };

      // Step 2b: Open Razorpay checkout modal
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setError({ message: response.error.description || "Payment failed" });
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err) {
      setIsProcessing(false);
      setError({ message: "Unable to initiate payment. Please try again." });
    }
  };

  return (
    <div className="w-full md:w-1/2">
      <h1 className="text-3xl font-semibold text-center mb-2">Checkout</h1>
      <OrderSummary />
      <h1 className="font-medium text-2xl">Pay with Razorpay</h1>
      {error && <HelperText valid={false}>{error.message}</HelperText>}
      <div className="flex justify-between py-4">
        <Button onClick={previousStep} layout="outline" size="small">
          Back
        </Button>
        <Button
          disabled={isProcessing}
          onClick={handlePayment}
          size="small"
        >
          {isProcessing ? (
            <PulseLoader size={10} color={"#01A982"} />
          ) : (
            `Pay ${formatCurrency(cartSubtotal)}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentForm;
