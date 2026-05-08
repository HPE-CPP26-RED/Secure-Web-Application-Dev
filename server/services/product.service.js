const {
  getAllProductsDb,
  createProductDb,
  updateProductDb,
  deleteProductBySlugDb,
  getProductByNameDb,
  getProductBySlugDb,
} = require("../db/product.db");
const { ErrorHandler } = require("../helpers/error");

class ProductService {
  getAllProducts = async (page) => {
    const limit = 12;
    const offset = (page - 1) * limit;
    try {
      return await getAllProductsDb({ limit, offset });
    } catch (error) {
      throw new ErrorHandler(error.statusCode, error.message);
    }
  };

  addProduct = async (data) => {
    try {
      return await createProductDb(data);
    } catch (error) {
      throw new ErrorHandler(error.statusCode, error.message);
    }
  };

  getProductBySlug = async (slug) => {
    try {
      const product = await getProductBySlugDb({ slug });
      if (!product) {
        throw new ErrorHandler(404, "product not found");
      }
      return product;
    } catch (error) {
      throw new ErrorHandler(error.statusCode, error.message);
    }
  };

  getProductByName = async (name) => {
    try {
      const product = await getProductByNameDb({ name });
      if (!product) {
        throw new ErrorHandler(404, "product not found");
      }
      return product;
    } catch (error) {
      throw new ErrorHandler(error.statusCode, error.message);
    }
  };

  updateProduct = async (data) => {
    try {
      const product = await getProductBySlugDb({ slug: data.targetSlug });
      if (!product) {
        throw new ErrorHandler(404, "product not found");
      }
      return await updateProductDb({ ...product, ...data });
    } catch (error) {
      throw new ErrorHandler(error.statusCode, error.message);
    }
  };

  removeProduct = async (slug) => {
    try {
      const result = await deleteProductBySlugDb({ slug });
      return result;
    } catch (error) {
      throw new ErrorHandler(500, error.message);
    }
  };
}

module.exports = new ProductService();
