/**
 * products.controller.js
 * Refactored to handle explicit slug generation and robust deletion.
 */
const productService = require("../services/product.service");
const { getReviewsDb, createReviewDb, updateReviewDb } = require("../db/review.db");
const { ErrorHandler } = require("../helpers/error");
const crypto = require("crypto");

const getAllProducts = async (req, res) => {
  const { page = 1 } = req.query;
  const products = await productService.getAllProducts(page);
  res.json(products);
};

const createProduct = async (req, res) => {
  try {
    const { name, price, description, image_url, category } = req.body;
    
    // Explicit Type Coercion
    const parsedPrice = Number(price);
    
    // Explicit Slug Generation
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

    const newProduct = await productService.addProduct({ 
      name, 
      price: parsedPrice, 
      description, 
      image_url, 
      category,
      slug 
    });
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("CREATE_PRODUCT_ERROR:", error.message);
    res.status(error.statusCode || 500).json({ error: error.message || "Internal Server Error" });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await productService.getProductBySlug(slug);
    res.status(200).json(product);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { slug: targetSlug } = req.params;
    const updatedProduct = await productService.updateProduct({ ...req.body, targetSlug });
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await productService.removeProduct(slug);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.status(200).json({ 
      message: "Product deleted successfully", 
      product: result.rows[0] 
    });
  } catch (error) {
    console.error("DELETE_PRODUCT_ERROR:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ── Reviews ─────────────────────────────────────────────────────────────────

const getProductReviews = async (req, res) => {
  const { product_id, user_id } = req.query;
  const result = await getReviewsDb({ productId: product_id, userId: user_id });
  res.status(200).json(result);
};

const createProductReview = async (req, res) => {
  const { product_id, content, rating } = req.body;
  const user_id = req.user.id;

  const review = await createReviewDb({ productId: product_id, content, rating, userId: user_id });
  res.status(201).json(review);
};

const updateProductReview = async (req, res) => {
  const { content, rating, id } = req.body;
  const review = await updateReviewDb({ content, rating, id });
  res.status(200).json(review);
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductBySlug,
  getProductReviews,
  updateProductReview,
  createProductReview,
};
