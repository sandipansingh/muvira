require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { serviceClient } = require('./helpers/provider-db-fixture.cjs')
const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'a sixth category can remain outside navigation while the five-category limit stays enforced',
  { skip: !url || !key },
  async () => {
    require('./helpers/test-env.cjs').configureTestEnvironment()
    const client = serviceClient(url, key)
    const { createCategory } = require('../server/dist/modules/categories/service.js')
    const created = []
    const input = (navbar) => ({
      name: 'Navigation integration',
      slug: `navigation-${randomUUID()}`,
      is_active: true,
      show_in_navbar: navbar,
      sort_order: 0,
    })
    try {
      const baseline = await client
        .from('categories')
        .select('id', { head: true, count: 'exact' })
        .eq('is_active', true)
        .eq('show_in_navbar', true)
      assert.ifError(baseline.error)
      for (let index = baseline.count ?? 0; index < 4; index++)
        created.push((await createCategory(input(true))).id)
      const race = await Promise.allSettled([
        createCategory(input(true)),
        createCategory(input(true)),
      ])
      for (const result of race) if (result.status === 'fulfilled') created.push(result.value.id)
      assert.equal(
        race.filter((result) => result.status === 'fulfilled').length,
        1,
        'concurrent enables cannot exceed five navigation categories'
      )
      const sixth = await createCategory(input(false))
      created.push(sixth.id)
      assert.equal(sixth.show_in_navbar, false)
      await assert.rejects(
        () => createCategory(input(true)),
        (error) => error.code === 'NAVBAR_LIMIT_REACHED'
      )
    } finally {
      if (created.length)
        assert.ifError((await client.from('categories').delete().in('id', created)).error)
    }
  }
)

test(
  'product image retries serialize and keep one reference with stable metadata',
  { skip: !url || !key },
  async () => {
    const client = serviceClient(url, key)
    const categoryId = randomUUID()
    const productId = randomUUID()
    const imageUrl = `https://example.com/${randomUUID()}.webp`
    try {
      const category = await client.from('categories').insert({
        id: categoryId,
        name: 'Media integration',
        slug: `media-${categoryId}`,
        is_active: true,
        show_in_navbar: false,
      })
      assert.ifError(category.error)
      const product = await client.from('products').insert({
        id: productId,
        name: 'Media test wrap',
        slug: `media-${productId}`,
        category_id: categoryId,
        price_paisa: 15000,
        stock: 3,
      })
      assert.ifError(product.error)
      const args = {
        p_product_id: productId,
        p_url: imageUrl,
        p_alt_text: 'Handwoven cotton wrap',
        p_sort_order: 0,
        p_is_primary: true,
      }
      const results = await Promise.all(
        Array.from({ length: 4 }, () => client.rpc('add_product_image_atomic', args))
      )
      for (const result of results) assert.ifError(result.error)
      assert.equal(new Set(results.map((result) => result.data.id)).size, 1)
      const references = await client.from('product_images').select('*').eq('product_id', productId)
      assert.ifError(references.error)
      assert.equal(references.data.length, 1)
      assert.equal(references.data[0].alt_text, 'Handwoven cotton wrap')
      assert.equal(references.data[0].is_primary, true)
      assert.ok((await client.rpc('add_product_image_atomic', { ...args, p_sort_order: -1 })).error)
      assert.ok(
        (await client.rpc('add_product_image_atomic', { ...args, p_url: 'javascript:invalid' }))
          .error
      )
    } finally {
      await client.from('product_images').delete().eq('product_id', productId)
      await client.from('products').delete().eq('id', productId)
      await client.from('categories').delete().eq('id', categoryId)
    }
  }
)

test(
  'Storage bucket and local global limit accept 8MiB and reject 8MiB plus one byte',
  { skip: !url || !key },
  async () => {
    const client = serviceClient(url, key)
    const bucket = await client.storage.getBucket('images')
    assert.ifError(bucket.error)
    assert.equal(bucket.data.file_size_limit, 8388608)
    const boundary = `products/integration-${randomUUID()}.webp`
    const oversized = `products/integration-${randomUUID()}.webp`
    try {
      const accepted = await client.storage
        .from('images')
        .upload(boundary, Buffer.alloc(8388608), { contentType: 'image/webp', upsert: false })
      assert.ifError(accepted.error)
      const rejected = await client.storage
        .from('images')
        .upload(oversized, Buffer.alloc(8388609), { contentType: 'image/webp', upsert: false })
      assert.ok(rejected.error, 'Storage must reject a file exceeding the bucket/global limit')
    } finally {
      const removed = await client.storage.from('images').remove([boundary, oversized])
      assert.ifError(removed.error)
    }
  }
)
