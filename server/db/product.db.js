const pool = require("../config");

const getAllProductsDb = async ({ limit, offset }) => {
  const { rows } = await pool.query(
    `select products.*, trunc(avg(reviews.rating)) as avg_rating, count(reviews.*) from products
        LEFT JOIN reviews
        ON products.product_id = reviews.product_id
        group by products.product_id limit $1 offset $2 `,
    [limit, offset]
  );
  const products = [...rows].sort(() => Math.random() - 0.5);
  return products;
};

const createProductDb = async ({ name, slug, price, description, image_url, category }) => {
  const { rows: product } = await pool.query(
    "INSERT INTO products(name, slug, price, description, image_url, category) VALUES($1, $2, $3, $4, $5, $6) returning *",
    [name, slug, price, description, image_url, category]
  );
  return product[0];
};

const getProductBySlugDb = async ({ slug }) => {
  const { rows: product } = await pool.query(
    `select products.*, trunc(avg(reviews.rating),1) as avg_rating, count(reviews.*) from products
        LEFT JOIN reviews
        ON products.product_id = reviews.product_id
        where products.slug = $1
        group by products.product_id`,
    [slug]
  );
  return product[0];
};

const getProductByNameDb = async ({ name }) => {
  const { rows: product } = await pool.query(
    `select products.*, trunc(avg(reviews.rating),1) as avg_rating, count(reviews.*) from products
        LEFT JOIN reviews
        ON products.product_id = reviews.product_id
        where products.name = $1
        group by products.product_id`,
    [name]
  );
  return product[0];
};

const updateProductDb = async ({ name, slug, price, description, image_url, category, targetSlug }) => {
  const { rows: product } = await pool.query(
    "UPDATE products set name = $1, slug = $2, price = $3, description = $4, image_url = $5, category = $6 where slug = $7 returning *",
    [name, slug, price, description, image_url, category, targetSlug]
  );
  return product[0];
};

const deleteProductBySlugDb = async ({ slug }) => {
  // First delete from cart_item to avoid any FK issues (though ON DELETE SET NULL is active)
  await pool.query(
    "DELETE FROM cart_item WHERE product_id = (SELECT product_id FROM products WHERE slug = $1)",
    [slug]
  );
  
  const result = await pool.query(
    "DELETE FROM products where slug = $1 returning *",
    [slug]
  );
  return result; // Return full result object for rowCount
};

module.exports = {
  getProductByNameDb,
  createProductDb,
  updateProductDb,
  deleteProductBySlugDb,
  getAllProductsDb,
  getProductBySlugDb,
};
