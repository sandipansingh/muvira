import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { CartItemIdParamsSchema, AddToCartSchema, UpdateCartItemSchema } from './schema';
import * as controller from './controller';

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get('/', controller.getCart);
cartRouter.post('/', validate({ body: AddToCartSchema }), controller.addToCart);
cartRouter.patch('/:itemId', validate({ params: CartItemIdParamsSchema, body: UpdateCartItemSchema }), controller.updateCartItem);
cartRouter.delete('/:itemId', validate({ params: CartItemIdParamsSchema }), controller.removeFromCart);
