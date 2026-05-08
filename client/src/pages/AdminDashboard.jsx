import React, { useState, useEffect } from "react";
import { Button, Input, Label, Table, TableHeader, TableCell, TableBody, TableRow, TableContainer } from "@windmill/react-ui";
import API from "api/axios.config";
import { toast } from "react-hot-toast";

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: "", price: "", description: "", image_url: "", category: "" });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products");
      // Handle array or object response
      const data = res.data?.products || res.data || [];
      setProducts(data);
    } catch (err) {
      toast.error("Failed to fetch products");
    }
  };

  const handleDelete = async (slug) => {
    try {
      await API.delete(`/products/${slug}`);
      toast.success("Product deleted!");
      fetchProducts(); // Immediately refetch
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting product");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/products", formData);
      toast.success("Product added!");
      setFormData({ name: "", price: "", description: "", image_url: "", category: "" }); // Reset form
      fetchProducts(); // Immediately refetch
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding product");
    }
  };

  return (
    <div className="flex items-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900 mt-20">
      <div className="flex-1 h-full max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <div className="flex flex-col overflow-y-auto p-6 sm:p-10">
          <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Admin Dashboard</h1>
          
          {/* Add Product Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <Label className="mt-4">
              <span>Name</span>
              <Input className="mt-1" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </Label>
            <Label className="mt-4">
              <span>Price</span>
              <Input type="number" step="0.01" className="mt-1" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
            </Label>
            <Label className="mt-4">
              <span>Category</span>
              <Input className="mt-1" placeholder="e.g. Electronics, Books" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required />
            </Label>
            <Label className="mt-4">
              <span>Description</span>
              <Input className="mt-1" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
            </Label>
            <Label className="mt-4">
              <span>Image URL</span>
              <Input className="mt-1" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} required />
            </Label>
            <Button className="mt-6" block type="submit">Add Product</Button>
          </form>

          {/* Product Inventory Table */}
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? products.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell><span className="text-sm font-semibold">{p.name}</span></TableCell>
                    <TableCell><span className="text-sm">{p.category}</span></TableCell>
                    <TableCell><span className="text-sm">${p.price}</span></TableCell>
                    <TableCell>
                      <Button layout="outline" size="small" onClick={() => handleDelete(p.slug)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-4">No products found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
