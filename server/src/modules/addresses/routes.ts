import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { AddressIdParamsSchema, CreateAddressSchema, UpdateAddressSchema } from './schema';
import * as controller from './controller';

export const addressesRouter = Router();

addressesRouter.use(requireAuth);

addressesRouter.get('/', controller.listAddresses);
addressesRouter.post('/', validate({ body: CreateAddressSchema }), controller.createAddress);
addressesRouter.patch('/:id', validate({ params: AddressIdParamsSchema, body: UpdateAddressSchema }), controller.updateAddress);
addressesRouter.delete('/:id', validate({ params: AddressIdParamsSchema }), controller.deleteAddress);
addressesRouter.post('/:id/default', validate({ params: AddressIdParamsSchema }), controller.setDefaultAddress);
