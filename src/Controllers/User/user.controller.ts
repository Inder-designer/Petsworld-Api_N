import { NextFunction, Request, Response } from 'express';
import ErrorHandler from "../../Utils/errorhandler";
import ResponseHandler from "../../Utils/resHandler";
import { IUser } from '../../models/User/User';
import Wishlist from '../../models/User/Wishlist';
import Product from '../../models/Product/Product';
import Cart from '../../models/User/Cart';
import Variant, { IVariantSchema } from '../../models/Product/Variant';

export const getProfile = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
        return next(new ErrorHandler("User not authenticated", 401));
    }

    ResponseHandler.send(res, "Profile fetched successfully", user);
    return
};

export const addWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const user = req.user as IUser;

    if (!productId) {
        return next(new ErrorHandler("Product ID is required", 400));
    }
    const existingWishlist = await Wishlist.findOne({ user: user._id, product: productId });
    if (existingWishlist) {
        return next(new ErrorHandler("Product already in wishlist", 400));
    }
    const wishlist = new Wishlist({
        user: user._id,
        product: productId,
    });
    await wishlist.save();

    ResponseHandler.send(res, "Product added to wishlist successfully", null, 201);
}

export const removeWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const user = req.user as IUser;

    if (!productId) {
        return next(new ErrorHandler("Product ID is required", 400));
    }

    const wishlist = await Wishlist.findOneAndDelete({ user: user._id, product: productId });
    if (!wishlist) {
        return next(new ErrorHandler("Product not found in wishlist", 404));
    }

    ResponseHandler.send(res, "Product removed from wishlist successfully", null, 200);
}

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;

    if (!user) {
        return next(new ErrorHandler("User not authenticated", 401));
    }

    const wishlist = await Wishlist.find({ user: user._id }).populate('product');
    ResponseHandler.send(res, "Wishlist fetched successfully", wishlist);
}

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    const { productId, variantId, quantity } = req.body;

    if (!productId || !quantity) {
        return next(new ErrorHandler("Product ID and quantity are required", 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    let price = product.price;
    let orderLimit = product.orderLimit;
    console.log(orderLimit);


    if (variantId) {
        const variant = await Variant.findById(variantId);
        if (!variant) {
            return next(new ErrorHandler("Variant not found", 404));
        }
        price = variant.price;
        orderLimit = variant.orderLimit;
    }

    let cart = await Cart.findOne({ user: user._id });

    if (!cart) {
        cart = new Cart({ user: user._id, items: [] });
    }

    const existingItem = cart.items.find(
        (item) =>
            item.product.toString() === productId &&
            (!variantId || item.variant?.toString() === variantId)
    );
    console.log(existingItem);


    if (existingItem) {
        const totalQuantity = existingItem.quantity + quantity;
        if (totalQuantity > orderLimit) {
            return next(new ErrorHandler(`We're sorry! Only ${orderLimit} unit(s) allowed in each order`, 400));
        }
        existingItem.quantity = totalQuantity;
    } else {
        if (quantity > orderLimit) {
            return next(new ErrorHandler(`We're sorry! Only ${orderLimit} unit(s) allowed in each order`, 400));
        }

        cart.items.push({
            product: productId,
            variant: variantId,
            quantity,
            price,
        });
    }

    await cart.save();

    ResponseHandler.send(res, "Product added to cart", cart, 200);
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    const { productId, variantId } = req.body;

    const cart = await Cart.findOne({ user: user._id });
    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    const itemIndex = cart.items.findIndex(
        (item) =>
            item.product.toString() === productId &&
            (!variantId || item.variant?.toString() === variantId)
    );

    if (itemIndex === -1) {
        return next(new ErrorHandler("Item not found in cart", 404));
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    ResponseHandler.send(res, "Item removed from cart", cart, 200);
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    const { productId, variantId, quantity } = req.body;

    if (!productId || !quantity) {
        return next(new ErrorHandler("Product ID and quantity are required", 400));
    }

    const cart = await Cart.findOne({ user: user._id });
    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    const item = cart.items.find(
        (item) =>
            item.product.toString() === productId &&
            (!variantId || item.variant?.toString() === variantId)
    );

    if (!item) {
        return next(new ErrorHandler("Item not found in cart", 404));
    }

    item.quantity = quantity;
    await cart.save();

    ResponseHandler.send(res, "Cart item updated successfully", cart, 200);
}

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;

    if (!user) {
        return next(new ErrorHandler("User not authenticated", 401));
    }

    const cart = await Cart.findOne({ user: user._id })
        .populate({ path: "items.product", select: 'name description images price orderLimit discount' })
        .populate({ path: "items.variant", select: 'images price orderLimit discount' })
        .lean();
    const cartItems = cart?.items.length
    if (!cart) {
        return next(new ErrorHandler("Cart not found", 404));
    }

    ResponseHandler.send(res, "Cart fetched successfully", { ...cart, cartItems });
}