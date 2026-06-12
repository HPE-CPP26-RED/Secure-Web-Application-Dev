import { Button, TableCell } from "@windmill/react-ui";
import { useCart } from "context/CartContext";
import { formatCurrency } from "helpers/formatCurrency";
import { Trash2, Minus, Plus } from "react-feather";

const CartItem = ({ item }) => {
  const { decrement, increment, deleteItem } = useCart();

  const increase = () => {
    increment(item.product_id);
  };
  const decrease = () => {
    decrement(item.product_id);
  };
  return (
    <>
      <TableCell className="py-4">
        <div className="font-semibold text-neutral-800 dark:text-neutral-200">{item.name}</div>
      </TableCell>
      <TableCell className="py-4 text-neutral-600 dark:text-neutral-400 font-medium">
        {formatCurrency(item.price)}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={item.quantity === 1}
            onClick={() => decrease()}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center font-bold text-neutral-800 dark:text-neutral-200">{item.quantity}</span>
          <button
            onClick={() => increase()}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </TableCell>
      <TableCell className="py-4 font-bold text-neutral-800 dark:text-neutral-200">
        {formatCurrency(item.subtotal)}
      </TableCell>
      <TableCell className="py-4 text-center">
        <button
          onClick={() => deleteItem(item.product_id)}
          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-colors"
          title="Remove item"
        >
          <Trash2 size={18} />
        </button>
      </TableCell>
    </>
  );
};

export default CartItem;

