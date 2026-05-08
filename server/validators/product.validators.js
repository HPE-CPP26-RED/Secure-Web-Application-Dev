/**
 * product.validators.js
 * Joi schemas for product endpoints.
 */
const Joi = require("joi");

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required().messages({
    "string.min": "Product name must be at least 2 characters",
    "any.required": "Product name is required",
  }),
  price: Joi.number().positive().precision(2).required().messages({
    "number.positive": "Price must be a positive number",
    "any.required": "Price is required",
  }),
  description: Joi.string().min(10).max(5000).required().messages({
    "string.min": "Description must be at least 10 characters",
    "any.required": "Description is required",
  }),
  image_url: Joi.string().uri().required().messages({
    "string.uri": "image_url must be a valid URL",
    "any.required": "image_url is required",
  }),
  category: Joi.string().min(2).max(50).required().messages({
    "string.min": "Category must be at least 2 characters",
    "any.required": "Category is required",
  }),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  price: Joi.number().positive().precision(2),
  description: Joi.string().min(10).max(5000),
  image_url: Joi.string().uri(),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

const createReviewSchema = Joi.object({
  product_id: Joi.number().integer().positive().required().messages({
    "any.required": "product_id is required",
  }),
  content: Joi.string().min(1).max(2000).required().messages({
    "any.required": "Review content is required",
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Rating must be between 1 and 5",
    "number.max": "Rating must be between 1 and 5",
    "any.required": "Rating is required",
  }),
});

const updateReviewSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Review id is required",
  }),
  content: Joi.string().min(1).max(2000).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  createReviewSchema,
  updateReviewSchema,
};
