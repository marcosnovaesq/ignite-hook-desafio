import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const nextAmount = currentAmount + 1;

      if (nextAmount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productExists) {
        productExists.amount = nextAmount;
      } else {
        const product = await api.get(`/products/${productId}`);
        updatedCart.push({ ...product.data, amount: 1 });
      }
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const cartCopy = [...cart];
      const productInCart = cartCopy.find(
        (product) => product.id === productId
      );
      if (!productInCart) {
        throw Error();
      }
      const filteredCart = cartCopy.filter(
        (product) => product.id !== productId
      );
      setCart(filteredCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(filteredCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const updatedCart = [...cart];
      const { data } = await api.get(`/stock/${productId}`);
      if (data.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      } else {
        const product = updatedCart.find((product) => product.id === productId);
        product!.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
